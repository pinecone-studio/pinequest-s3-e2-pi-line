"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { logProctorEvent } from "@/lib/student/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Camera lifecycle states — ordered roughly by progression.
 *
 * idle         — camera disabled (enabled=false)
 * requesting   — getUserMedia() is in flight, waiting for permission dialog
 * starting     — stream obtained, attaching to video element, waiting for metadata
 * active       — verified: video element has real dimensions and is playing frames
 * denied       — user denied camera permission
 * failed       — non-permission error OR video never rendered frames after attach
 * disconnected — stream was active but track ended or health check detected freeze
 * retrying     — retry getUserMedia in progress
 * unavailable  — MediaDevices API not present in this browser
 */
export type CameraStatus =
  | "idle"
  | "requesting"
  | "starting"
  | "active"
  | "denied"
  | "failed"
  | "disconnected"
  | "retrying"
  | "unavailable";

export interface UseCameraMonitorResult {
  cameraStatus: CameraStatus;
  /** Attach to the <video> element that should display the feed. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Manually trigger a full camera restart. Safe to call when status is failed/disconnected. */
  retryCamera: () => void;
}

interface UseCameraMonitorOptions {
  sessionId: string;
  /** Set to false to disable camera entirely. */
  enabled?: boolean;
  preferFrontCamera?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max automatic retries (track-ended / visibility-restore).
 *  Manual retries via retryCamera() always reset this counter. */
const MAX_AUTO_RETRIES = 2;

/** How many ms to wait for loadedmetadata before giving up. */
const METADATA_TIMEOUT_MS = 8000;

/** Grace period after metadata fires before doing the final videoWidth check. */
const RENDER_GRACE_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clog(msg: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.log(`[CameraMonitor] ${msg}`, extra !== undefined ? extra : "");
}

/** True only when the video element is provably displaying live frames. */
function verifyVideoRendering(
  video: HTMLVideoElement | null,
  stream: MediaStream | null
): boolean {
  if (!video || !stream) return false;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
  if (video.videoWidth === 0 || video.videoHeight === 0) return false;
  if (video.paused) return false;
  const tracks = stream.getVideoTracks();
  return tracks.length > 0 && tracks[0].readyState === "live";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCameraMonitor({
  sessionId,
  enabled = true,
  preferFrontCamera = true,
}: UseCameraMonitorOptions): UseCameraMonitorResult {
  const cameraApiAvailable =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>(() => {
    if (!enabled) return "idle";
    if (!cameraApiAvailable) return "unavailable";
    return "requesting";
  });

  // Ref mirrors state so closures inside setTimeout / event handlers always
  // read the current value without needing to be in a dependency array.
  const cameraStatusRef = useRef<CameraStatus>(cameraStatus);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const requestInFlightRef = useRef(false);
  const autoRetryCountRef = useRef(0);
  const everActiveRef = useRef(false);
  const deniedLoggedRef = useRef(false);

  // startCameraRef holds the latest version of startCamera so callbacks inside
  // setTimeout and event listeners never close over a stale function.
  const startCameraRef = useRef<(isRetry?: boolean) => void>(() => {});

  // Keep status ref in sync with state.
  const updateStatus = useCallback((next: CameraStatus) => {
    cameraStatusRef.current = next;
    setCameraStatus(next);
  }, []);

  // -------------------------------------------------------------------------
  // Stop all tracks and clear srcObject.
  // -------------------------------------------------------------------------
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      try { video.srcObject = null; } catch { /* ignore */ }
    }
  }, []);

  // -------------------------------------------------------------------------
  // Core camera start — called on mount and on every retry.
  // -------------------------------------------------------------------------
  const startCamera = useCallback(
    async (isRetry = false) => {
      if (!mountedRef.current) return;
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;

      clog(isRetry ? "retry started" : "requesting camera");
      updateStatus(isRetry ? "retrying" : "requesting");

      // Stop any existing stream before opening a new one.
      stopCurrentStream();

      // Constraint waterfall:
      //   1. Exact front camera (may fail on some Android devices)
      //   2. Ideal front camera (softer constraint, broader compat)
      //   3. Bare minimum (any camera — last resort)
      const constraintList: MediaStreamConstraints[] = preferFrontCamera
        ? [
            { video: { facingMode: "user" }, audio: false },
            { video: { facingMode: { ideal: "user" } }, audio: false },
            { video: true, audio: false },
          ]
        : [{ video: true, audio: false }];

      let stream: MediaStream | null = null;
      let lastErr: Error | null = null;

      for (const constraints of constraintList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          clog("getUserMedia succeeded", { constraints });
          break;
        } catch (err) {
          lastErr = err as Error;
          clog("getUserMedia attempt failed", {
            name: (err as Error).name,
            msg: (err as Error).message,
            constraints,
          });
          // Permission denied — no point trying other constraints.
          if (
            (err as Error).name === "NotAllowedError" ||
            (err as Error).name === "PermissionDeniedError"
          ) {
            break;
          }
        }
      }

      requestInFlightRef.current = false;

      if (!mountedRef.current) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!stream) {
        const isPermission =
          lastErr?.name === "NotAllowedError" ||
          lastErr?.name === "PermissionDeniedError";

        clog(isPermission ? "camera permission denied" : "camera failed", {
          error: lastErr?.name,
        });
        updateStatus(isPermission ? "denied" : "failed");

        if (!deniedLoggedRef.current) {
          deniedLoggedRef.current = true;
          void logProctorEvent(sessionId, "camera_denied", {
            reason: isPermission ? "permission_denied" : "getUserMedia_failed",
            error_name: lastErr?.name ?? "unknown",
          });
        }
        return;
      }

      streamRef.current = stream;
      updateStatus("starting");
      clog("stream obtained — attaching to video element");

      // Register track-ended listener for automatic recovery.
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (!mountedRef.current) return;
          // Guard: ignore ended events from tracks we stopped ourselves during retry.
          if (requestInFlightRef.current) return;

          clog("video track ended externally");
          void logProctorEvent(sessionId, "camera_disconnected", {
            reason: "track_ended",
          });
          updateStatus("disconnected");

          if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
            autoRetryCountRef.current += 1;
            clog("auto-retry after track ended", {
              attempt: autoRetryCountRef.current,
            });
            // Short delay — let the OS release the hardware before re-opening.
            setTimeout(() => {
              if (mountedRef.current) startCameraRef.current(true);
            }, 1200);
          }
        });
      });

      // Attach to video element.
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // Explicit play() — on some mobile browsers setting srcObject alone
        // is not sufficient to begin rendering; play() is required.
        void video.play().catch((e: Error) => {
          clog("video.play() rejected", { name: e.name });
          // Autoplay is extremely unlikely to be blocked for muted camera streams,
          // but handle gracefully — frames may still render via autoPlay attribute.
        });
      }
      // If videoRef.current was null (race between render and effect),
      // the secondary-attach effect below will handle it.

      // ------------------------------------------------------------------
      // Wait for loadedmetadata — proves the browser decoded the stream header.
      // ------------------------------------------------------------------
      const metaReady = await new Promise<boolean>((resolve) => {
        const vid = videoRef.current;
        if (!vid) {
          resolve(false);
          return;
        }

        if (vid.readyState >= HTMLMediaElement.HAVE_METADATA) {
          clog("loadedmetadata already ready");
          resolve(true);
          return;
        }

        const timer = setTimeout(() => {
          vid.removeEventListener("loadedmetadata", onMeta);
          clog("loadedmetadata timeout", {
            readyState: vid.readyState,
          });
          // Accept partial readiness rather than failing immediately.
          resolve(vid.readyState >= HTMLMediaElement.HAVE_METADATA);
        }, METADATA_TIMEOUT_MS);

        const onMeta = () => {
          clearTimeout(timer);
          clog("loadedmetadata fired");
          resolve(true);
        };

        vid.addEventListener("loadedmetadata", onMeta, { once: true });
      });

      if (!mountedRef.current) {
        stopCurrentStream();
        return;
      }

      if (!metaReady) {
        clog("metadata never loaded — marking failed");
        updateStatus("failed");
        void logProctorEvent(sessionId, "camera_denied", {
          reason: "metadata_timeout",
        });
        return;
      }

      // ------------------------------------------------------------------
      // Grace period: give a slow phone time to push the first frame through.
      // ------------------------------------------------------------------
      await new Promise<void>((resolve) => setTimeout(resolve, RENDER_GRACE_MS));

      if (!mountedRef.current) {
        stopCurrentStream();
        return;
      }

      // ------------------------------------------------------------------
      // Final validation — confirm frames are actually rendering.
      // ------------------------------------------------------------------
      const video2 = videoRef.current;
      if (verifyVideoRendering(video2, streamRef.current)) {
        everActiveRef.current = true;
        autoRetryCountRef.current = 0;
        updateStatus("active");
        clog("camera active — verified rendering", {
          videoWidth: video2?.videoWidth,
          videoHeight: video2?.videoHeight,
        });
      } else {
        // Stream attached and metadata loaded, but no frames visible.
        // Common on some Android devices where camera hardware is momentarily busy.
        clog("video not rendering after grace period — marking failed", {
          readyState: video2?.readyState,
          videoWidth: video2?.videoWidth,
          videoHeight: video2?.videoHeight,
          paused: video2?.paused,
          trackState: streamRef.current?.getVideoTracks()[0]?.readyState,
        });
        updateStatus("failed");
        void logProctorEvent(sessionId, "camera_denied", {
          reason: "video_not_rendering",
          ready_state: video2?.readyState ?? -1,
          video_width: video2?.videoWidth ?? 0,
          video_height: video2?.videoHeight ?? 0,
        });
      }
    },
    [preferFrontCamera, sessionId, stopCurrentStream, updateStatus]
  );

  // Keep startCameraRef pointing at the latest startCamera.
  useEffect(() => {
    startCameraRef.current = startCamera;
  }, [startCamera]);

  // -------------------------------------------------------------------------
  // Main lifecycle effect.
  // -------------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      updateStatus("idle");
      return;
    }
    if (!cameraApiAvailable) {
      updateStatus("unavailable");
      return;
    }

    void startCamera(false);

    return () => {
      mountedRef.current = false;
      requestInFlightRef.current = false;
      stopCurrentStream();
    };
    // Re-run only when the fundamental options change, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, preferFrontCamera, cameraApiAvailable]);

  // -------------------------------------------------------------------------
  // Secondary attach — race condition guard.
  // If videoRef wasn't mounted yet when startCamera ran, attach here.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (cameraStatus !== "starting" && cameraStatus !== "active") return;
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    if (video.srcObject !== streamRef.current) {
      clog("secondary attach — videoRef was not ready during startCamera");
      video.srcObject = streamRef.current;
      void video.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus]);

  // -------------------------------------------------------------------------
  // Visibility recovery — mobile OS may pause/kill the stream while backgrounded.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!enabled || !cameraApiAvailable) return;

    const handleVisibility = () => {
      if (document.hidden) {
        clog("page hidden — camera stream may be suspended");
        return;
      }
      clog("page visible — checking camera health");

      // Re-attach srcObject if the browser cleared it while the page was hidden.
      const video = videoRef.current;
      if (streamRef.current && video && video.srcObject !== streamRef.current) {
        clog("re-attaching stream after visibility restore");
        video.srcObject = streamRef.current;
        void video.play().catch(() => {});
      }

      const status = cameraStatusRef.current;
      if (
        status === "active" ||
        status === "disconnected" ||
        status === "starting"
      ) {
        const tracks = streamRef.current?.getVideoTracks() ?? [];
        const trackLive =
          tracks.length > 0 && tracks[0].readyState === "live";

        if (!trackLive) {
          if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
            autoRetryCountRef.current += 1;
            clog("auto-retry after visibility restore", {
              attempt: autoRetryCountRef.current,
            });
            startCameraRef.current(true);
          } else {
            updateStatus("disconnected");
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled, cameraApiAvailable, updateStatus]);

  // -------------------------------------------------------------------------
  // Manual retry — resets auto-retry counter so student always gets fresh attempts.
  // -------------------------------------------------------------------------
  const retryCamera = useCallback(() => {
    if (!enabled || !cameraApiAvailable) return;
    if (requestInFlightRef.current) return;
    clog("manual retry triggered");
    autoRetryCountRef.current = 0;
    startCameraRef.current(true);
  }, [enabled, cameraApiAvailable]);

  return { cameraStatus, videoRef, retryCamera };
}
