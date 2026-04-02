"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BatteryCharging,
  Camera,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  computeBrightnessScore,
  computeVideoFingerprint,
  getDisplayMode,
  getHashDistance,
  getOrientationMode,
  getPlatformLabel,
  getPreferredCameraConstraints,
  getStudentDeviceType,
} from "@/lib/proctoring-client";
import { getIdentityEnrollment } from "@/lib/student/actions";
import type {
  DevicePolicy,
  ProctorDisplayMode,
  ProctoringMode,
} from "@/lib/proctoring";
import type { ExamRuntimeReadiness } from "./runtime-readiness";

type ReadinessPayload = ExamRuntimeReadiness;

type CheckStatus = "checking" | "ok" | "warning" | "error";

interface Props {
  examTitle?: string;
  proctoringMode: ProctoringMode;
  devicePolicy: DevicePolicy;
  requireFullscreen: boolean;
  requireCamera: boolean;
  identityVerification: boolean;
  resumeMode?: boolean;
  onStart: (payload: ReadinessPayload) => Promise<void> | void;
}

type EnrollmentState =
  | {
      referenceImageData: string;
      referenceHash: string;
      updatedAt: string;
    }
  | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PreExamCheck({
  proctoringMode,
  devicePolicy,
  requireFullscreen,
  requireCamera,
  identityVerification,
  resumeMode = false,
  onStart,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRetryCountRef = useRef(0);
  const cameraRequestInFlightRef = useRef(false);
  const [internetStatus, setInternetStatus] = useState<CheckStatus>("checking");
  const [internetMessage, setInternetMessage] = useState("Сүлжээг шалгаж байна...");
  const [batteryStatus, setBatteryStatus] = useState<CheckStatus>("checking");
  const [batteryMessage, setBatteryMessage] = useState("Цэнэг шалгаж байна...");
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>(
    requireCamera ? "checking" : "ok"
  );
  const [cameraMessage, setCameraMessage] = useState(
    requireCamera
      ? "Камерыг ачаалж байна..."
      : "Энэ шалгалтад камер заавал шаардлагагүй."
  );
  const [, setFullscreenStatus] = useState<CheckStatus>(
    requireFullscreen ? "warning" : "ok"
  );
  const [, setFullscreenMessage] = useState(
    requireFullscreen
      ? "Шалгалтаас өмнө fullscreen горимд орно."
      : "Fullscreen заавал биш."
  );
  const [identityStatus, setIdentityStatus] = useState<CheckStatus>(
    identityVerification ? "checking" : "ok"
  );
  const [, setIdentityMessage] = useState(
    identityVerification
      ? "Identity enrollment мэдээлэл уншиж байна..."
      : "Identity verification унтраалттай."
  );
  const [brightnessScore, setBrightnessScore] = useState<number | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentState>(null);
  const [, setLoadingEnrollment] = useState(identityVerification);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setPwaStatus] = useState<CheckStatus>("checking");
  const [, setPwaMessage] = useState("PWA төлөв шалгаж байна...");
  const [, setOrientationStatus] = useState<CheckStatus>("checking");
  const [, setOrientationMessage] = useState(
    "Дэлгэцийн байрлалыг шалгаж байна..."
  );
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const deviceType = useMemo(() => getStudentDeviceType(), []);
  const isDesktop = deviceType === "desktop";
  const [displayMode, setDisplayMode] = useState<ProctorDisplayMode>(() =>
    getDisplayMode()
  );
  const isStandalonePwa =
    displayMode === "standalone" || displayMode === "fullscreen";
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(() =>
    getOrientationMode()
  );
  const platform = useMemo(() => getPlatformLabel(), []);
  const isProctored = proctoringMode !== "off";
  const requiresDesktop = devicePolicy === "desktop_only";
  const shouldEnforceFullscreen =
    requireFullscreen && !(deviceType === "mobile" && proctoringMode === "standard");
  const canStart =
    internetStatus !== "error" &&
    (!requiresDesktop || isDesktop) &&
    (!requireCamera || cameraStatus === "ok" || cameraStatus === "warning") &&
    (!identityVerification || identityStatus === "ok");

  useEffect(() => {
    let cancelled = false;

    async function checkBattery() {
      const nav = navigator as Navigator & {
        getBattery?: () => Promise<{
          level: number;
          charging: boolean;
        }>;
      };

      if (!nav.getBattery) {
        if (!cancelled) {
          setBatteryStatus("ok");
          setBatteryMessage("Цэнэгийн мэдээлэл уншигдахгүй байна.");
        }
        return;
      }

      try {
        const battery = await nav.getBattery();
        if (cancelled) return;

        const percentage = Math.round(battery.level * 100);
        const isHealthy = percentage >= 20 || battery.charging;
        setBatteryStatus(isHealthy ? "ok" : "warning");
        setBatteryMessage(
          battery.charging
            ? `Цэнэг ${percentage}% (цэнэглэж байна)`
            : `Цэнэг ${percentage}%`
        );
      } catch {
        if (!cancelled) {
          setBatteryStatus("ok");
          setBatteryMessage("Цэнэгийн мэдээллийг шалгаж чадсангүй.");
        }
      }
    }

    void checkBattery();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkInternet() {
      if (!navigator.onLine) {
        if (!cancelled) {
          setInternetStatus("error");
          setInternetMessage("Интернэт холболт алга байна.");
        }
        return;
      }

      try {
        const startedAt = performance.now();
        await fetch("/api/ping", { cache: "no-store" });
        const latency = Math.round(performance.now() - startedAt);
        if (cancelled) return;
        setInternetStatus(latency > 450 ? "warning" : "ok");
        setInternetMessage(
          latency > 450
            ? `Холболт удаан байна (${latency}ms).`
            : `Холболт хэвийн байна (${latency}ms).`
        );
      } catch {
        if (!cancelled) {
          setInternetStatus("error");
          setInternetMessage("Сервертэй холбогдож чадсангүй.");
        }
      }
    }

    void checkInternet();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!requireCamera) return;

    let cancelled = false;

    async function startCamera(isRetry = false) {
      if (cancelled) return;
      if (cameraRequestInFlightRef.current) return;
      cameraRequestInFlightRef.current = true;

      if (isRetry) {
        setCameraStatus("checking");
        setCameraMessage("Камерыг дахин нээж байна...");
      }

      // Stop any previous stream before requesting a new one.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const vid = videoRef.current;
      if (vid) vid.srcObject = null;

      // Constraint waterfall: exact front → ideal front → any camera.
      const constraintList: MediaStreamConstraints[] = [
        { video: { facingMode: "user" }, audio: false },
        { video: { facingMode: { ideal: "user" } }, audio: false },
        { video: true, audio: false },
      ];

      let stream: MediaStream | null = null;
      let lastErr: Error | null = null;

      for (const constraints of constraintList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastErr = err as Error;
          if (
            (err as Error).name === "NotAllowedError" ||
            (err as Error).name === "PermissionDeniedError"
          ) {
            break;
          }
        }
      }

      cameraRequestInFlightRef.current = false;
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!stream) {
        const isPermission =
          lastErr?.name === "NotAllowedError" ||
          lastErr?.name === "PermissionDeniedError";
        setCameraStatus("error");
        setCameraMessage(
          isPermission
            ? "Камерын зөвшөөрөл өгөөгүй байна. Браузерын тохиргооноос зөвшөөрнэ үү."
            : "Камерийг нээж чадсангүй. Бусад апп камерыг ашиглаж байгаа байж болно."
        );
        return;
      }

      streamRef.current = stream;
      setCameraStatus("checking");
      setCameraMessage("Камер нээгдсэн, дүрсийг шалгаж байна...");

      // Attach to video element.
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        void video.play().catch(() => {});
      }

      // Wait for loadedmetadata (max 8 s).
      const metaReady = await new Promise<boolean>((resolve) => {
        const v = videoRef.current;
        if (!v) { resolve(false); return; }
        if (v.readyState >= HTMLMediaElement.HAVE_METADATA) { resolve(true); return; }
        const timer = setTimeout(() => {
          v.removeEventListener("loadedmetadata", onMeta);
          resolve(v.readyState >= HTMLMediaElement.HAVE_METADATA);
        }, 8000);
        const onMeta = () => { clearTimeout(timer); resolve(true); };
        v.addEventListener("loadedmetadata", onMeta, { once: true });
      });

      if (cancelled) return;

      if (!metaReady) {
        setCameraStatus("error");
        setCameraMessage("Камерын дүрс ачаалагдсангүй. Дахин оролдоно уу.");
        return;
      }

      // Short grace period so the first frame can render on slow phones.
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      if (cancelled) return;

      const v2 = videoRef.current;
      const tracks = stream.getVideoTracks();
      const isRendering =
        v2 &&
        v2.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        v2.videoWidth > 0 &&
        !v2.paused &&
        tracks.length > 0 &&
        tracks[0].readyState === "live";

      if (isRendering) {
        setCameraStatus("ok");
        setCameraMessage("Камер бэлэн байна.");
        cameraRetryCountRef.current = 0;
      } else {
        setCameraStatus("error");
        setCameraMessage("Камер нээгдсэн ч дүрс гарахгүй байна. Дахин оролдоно уу.");
      }
    }

    void startCamera(false);

    return () => {
      cancelled = true;
      cameraRequestInFlightRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireCamera]);

  useEffect(() => {
    if (!requireCamera) return;

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      const stream = streamRef.current;
      // Only run health check when video is confirmed rendering.
      if (
        !video ||
        !stream ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0
      ) {
        return;
      }

      try {
        const score = computeBrightnessScore(video);
        setBrightnessScore(score);
        if (score < 30) {
          setCameraStatus("warning");
          setCameraMessage("Орчны гэрэл бага байна. Илүү гэрэлтэй газар сууна уу.");
        } else {
          setCameraStatus("ok");
          setCameraMessage("Камер бэлэн байна.");
        }
      } catch {
        // Ignore intermittent canvas sampling errors.
      }
    }, 1200);

    return () => window.clearInterval(interval);
  }, [requireCamera]);

  useEffect(() => {
    const updatePwaState = () => {
      const nextDisplayMode = getDisplayMode();
      setDisplayMode(nextDisplayMode);
      const standalone = nextDisplayMode === "standalone" || nextDisplayMode === "fullscreen";
      setPwaStatus(standalone ? "ok" : isProctored ? "warning" : "ok");
      setPwaMessage(
        standalone
          ? "Standalone/PWA горим идэвхтэй байна."
          : isProctored
            ? "App хэлбэрээр нээвэл илүү тогтвортой ажиллана."
            : "Browser горим хангалттай."
      );
    };

    updatePwaState();

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const handleStandaloneChange = () => updatePwaState();
    standaloneQuery.addEventListener?.("change", handleStandaloneChange);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      updatePwaState();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      standaloneQuery.removeEventListener?.("change", handleStandaloneChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isProctored]);

  useEffect(() => {
    const updateOrientation = () => {
      const nextOrientation = getOrientationMode();
      setOrientation(nextOrientation);
      setOrientationStatus(nextOrientation === "portrait" ? "ok" : "warning");
      setOrientationMessage(
        nextOrientation === "portrait"
          ? "Portrait байрлал mobile дээр тохиромжтой байна."
          : "Landscape горимд ажиллах боломжтой ч portrait илүү тогтвортой."
      );
    };

    updateOrientation();
    window.addEventListener("orientationchange", updateOrientation);
    window.addEventListener("resize", updateOrientation);
    return () => {
      window.removeEventListener("orientationchange", updateOrientation);
      window.removeEventListener("resize", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!identityVerification) {
      return;
    }

    let cancelled = false;
    setLoadingEnrollment(true);
    void getIdentityEnrollment().then((result) => {
      if (cancelled) return;
      setEnrollment(result);
      setLoadingEnrollment(false);
      if (result) {
        setIdentityStatus("warning");
        setIdentityMessage("Reference selfie олдлоо. Start хийхийн өмнө live verification хийнэ.");
      } else {
        setIdentityStatus("warning");
        setIdentityMessage("Enrollment selfie бүртгүүлээгүй байна.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [identityVerification]);

  useEffect(() => {
    if (!requireFullscreen) {
      setFullscreenStatus("ok");
      setFullscreenMessage("Fullscreen заавал биш.");
      return;
    }

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setDisplayMode(getDisplayMode());
      setFullscreenStatus(
        active ? "ok" : shouldEnforceFullscreen ? "warning" : "ok"
      );
      setFullscreenMessage(
        active
          ? "Fullscreen идэвхтэй байна."
          : shouldEnforceFullscreen
            ? "Start хийхийн өмнө fullscreen горимд орно."
            : "Mobile standard дээр fullscreen нь нэмэлт signal байдлаар бүртгэгдэнэ."
      );
    };

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [requireFullscreen, shouldEnforceFullscreen]);

  function handleCameraRetry() {
    if (cameraRequestInFlightRef.current) return;
    cameraRetryCountRef.current += 1;
    cameraRequestInFlightRef.current = true;

    // Stop any existing stream.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const vid = videoRef.current;
    if (vid) vid.srcObject = null;

    setCameraStatus("checking");
    setCameraMessage("Камерыг дахин нээж байна...");
    setBrightnessScore(null);

    const constraintList: MediaStreamConstraints[] = [
      { video: { facingMode: "user" }, audio: false },
      { video: { facingMode: { ideal: "user" } }, audio: false },
      { video: true, audio: false },
    ];

    async function attempt() {
      let stream: MediaStream | null = null;
      let lastErr: Error | null = null;

      for (const constraints of constraintList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastErr = err as Error;
          if (
            (err as Error).name === "NotAllowedError" ||
            (err as Error).name === "PermissionDeniedError"
          ) break;
        }
      }

      cameraRequestInFlightRef.current = false;
      if (!stream) {
        const isPerm =
          lastErr?.name === "NotAllowedError" ||
          lastErr?.name === "PermissionDeniedError";
        setCameraStatus("error");
        setCameraMessage(
          isPerm
            ? "Камерын зөвшөөрөл байхгүй байна. Браузерын тохиргооноос зөвшөөрнэ үү."
            : "Камерийг нээж чадсангүй. Дахин оролдоно уу."
        );
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        void video.play().catch(() => {});
      }

      // Wait for metadata.
      await new Promise<void>((resolve) => {
        const v = videoRef.current;
        if (!v || v.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve(); return;
        }
        const timer = setTimeout(resolve, 8000);
        v.addEventListener("loadedmetadata", () => { clearTimeout(timer); resolve(); }, { once: true });
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 400));

      const v2 = videoRef.current;
      const tracks2 = stream.getVideoTracks();
      if (
        v2 &&
        v2.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        v2.videoWidth > 0 &&
        !v2.paused &&
        tracks2.length > 0 &&
        tracks2[0].readyState === "live"
      ) {
        setCameraStatus("ok");
        setCameraMessage("Камер бэлэн байна.");
      } else {
        setCameraStatus("error");
        setCameraMessage("Камер нээгдсэн ч дүрс гарахгүй байна. Дахин оролдоно уу.");
      }
    }

    void attempt();
  }

  async function ensureFullscreen() {
    if (!shouldEnforceFullscreen || document.fullscreenElement) {
      return true;
    }

    try {
      await document.documentElement.requestFullscreen();
      return Boolean(document.fullscreenElement);
    } catch {
      setError("Fullscreen горим руу шилжиж чадсангүй.");
      return false;
    }
  }

  async function verifyIdentity() {
    if (!identityVerification) {
      return { ok: true, hash: null };
    }

    if (!enrollment?.referenceHash) {
      setIdentityStatus("error");
      setIdentityMessage("Start хийхийн өмнө reference selfie бүртгэнэ үү.");
      return { ok: false, hash: null };
    }

    const video = videoRef.current;
    if (!video) {
      setIdentityStatus("error");
      setIdentityMessage("Камерын preview бэлэн болоогүй байна.");
      return { ok: false, hash: null };
    }

    try {
      const liveHash = computeVideoFingerprint(video);
      const distance = getHashDistance(enrollment.referenceHash, liveHash);
      if (distance <= 56) {
        setIdentityStatus("ok");
        setIdentityMessage(`Identity verification амжилттай (${distance} diff).`);
        return { ok: true, hash: liveHash };
      }

      setIdentityStatus("error");
      setIdentityMessage(
        `Identity verification амжилтгүй (${distance} diff). Камерын өнцөг, гэрлээ засна уу.`
      );
      return { ok: false, hash: liveHash };
    } catch {
      setIdentityStatus("error");
      setIdentityMessage("Identity verification хийх үед алдаа гарлаа.");
      return { ok: false, hash: null };
    }
  }

  async function handleStart() {
    setActionLoading(true);
    setError(null);

    try {
      const fullscreenReady = shouldEnforceFullscreen
        ? await ensureFullscreen()
        : Boolean(document.fullscreenElement);
      const identityResult = await verifyIdentity();

      if (shouldEnforceFullscreen && !fullscreenReady) {
        setActionLoading(false);
        return;
      }

      const payload: ReadinessPayload = {
        isDesktop,
        deviceType,
        displayMode,
        orientation,
        isStandalonePwa,
        platform,
        fullscreenReady,
        cameraReady: !requireCamera || cameraStatus !== "error",
        identityVerified: identityResult.ok,
        brightnessScore,
        identityHash: identityResult.hash,
      };

      await onStart(payload);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgba(250,250,250,0.98)] px-4 py-10">
      <div className="w-full max-w-[664px] space-y-[30px]">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#D1D1D1]">
            <ShieldCheck className="h-8 w-8 text-black" />
          </div>
          <div className="space-y-3">
            <h1 className="text-[24px] font-semibold leading-[120%] text-black">
              Системийн шалгалт
            </h1>
            <p className="text-base leading-[120%] text-[#6B6B6B]">
              Таны төхөөрөмж шалгалтад бэлэн эсэхийг шалгаж байна. Түр хүлээнэ үү.
            </p>
          </div>
        </div>

        {!isDesktop && requiresDesktop ? (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Энэ шалгалтыг mobile төхөөрөмж дээр эхлүүлэхгүй. Desktop эсвэл laptop ашиглана уу.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-[9px]">
          <div className="flex items-center justify-between rounded-[16px] border border-[#BDBDBD] bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <BatteryCharging className="h-7 w-7 text-black" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium leading-[120%] text-black">Цэнэг</p>
                <p className="text-sm leading-[120%] text-[#6B6B6B]">{batteryMessage}</p>
              </div>
            </div>
            <div className="flex w-[43px] flex-col items-center gap-0.5">
              <CheckCircle2 className={`h-6 w-6 ${batteryStatus === "error" ? "text-[#E05252]" : "text-[#6BBF7A]"}`} />
              <span className={`text-[12px] leading-[120%] ${batteryStatus === "error" ? "text-[#E05252]" : "text-[#3B8748]"}`}>
                {batteryStatus === "warning" ? "Анхаар" : batteryStatus === "error" ? "Алдаа" : "Хэвийн"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[16px] border border-[#BDBDBD] bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Wifi className="h-7 w-7 text-black" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium leading-[120%] text-black">Интернет холболт</p>
                <p className="text-sm leading-[120%] text-[#6B6B6B]">{internetMessage}</p>
              </div>
            </div>
            <div className="flex w-[43px] flex-col items-center gap-0.5">
              <CheckCircle2 className={`h-6 w-6 ${internetStatus === "error" ? "text-[#E05252]" : "text-[#6BBF7A]"}`} />
              <span className={`text-[12px] leading-[120%] ${internetStatus === "error" ? "text-[#E05252]" : "text-[#3B8748]"}`}>
                {internetStatus === "warning" ? "Анхаар" : internetStatus === "error" ? "Алдаа" : "Хэвийн"}
              </span>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#BDBDBD] bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md">
                  <Camera className="h-7 w-7 text-black" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium leading-[120%] text-black">Камер</p>
                  <p className="text-sm leading-[120%] text-[#6B6B6B]">
                    {cameraMessage}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                {cameraStatus === "checking" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#6B6B6B]" />
                ) : cameraStatus === "error" ? (
                  <XCircle className="h-6 w-6 text-[#E05252]" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-[#6BBF7A]" />
                )}
                <span className={`text-[12px] leading-[120%] ${cameraStatus === "error" ? "text-[#E05252]" : cameraStatus === "checking" ? "text-[#6B6B6B]" : "text-[#3B8748]"}`}>
                  {cameraStatus === "warning" ? "Анхаар" : cameraStatus === "error" ? "Алдаа" : cameraStatus === "checking" ? "Шалгаж байна" : "Хэвийн"}
                </span>
              </div>
            </div>
            {cameraStatus === "error" && requireCamera && (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[8px] border border-[#BDBDBD] text-xs font-medium text-black hover:bg-zinc-50"
                  onClick={handleCameraRetry}
                >
                  Камер дахин нээх
                </Button>
              </div>
            )}
          </div>

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute h-0 w-0 opacity-0 pointer-events-none"
          />

          <div className="rounded-[16px] border border-[#6BBF7A] bg-[#DBF0DF] px-6 py-3 text-sm font-medium text-[#3B8748]">
            Бүгд хэвийн. Таны төхөөрөмж шалгалтад бэлэн байна.
          </div>

          <div className="rounded-[16px] border border-[#E05252] bg-[#FBE9E9] px-5 py-5 text-[#E05252]">
            <div className="mb-4 flex items-center gap-3">
              <XCircle className="h-7 w-7" />
              <p className="text-base font-medium leading-[120%]">Анхааруулга</p>
            </div>
            <div className="space-y-3 text-sm leading-[140%]">
              <p>
                Шалгалтын явцад таны камер идэвхтэй ажиллаж, таны үйлдлийг хянах болно. Иймд шалгалтын хугацаанд өөр таб нээх, цонх солих, гаднын эх сурвалж ашиглах зэрэг зөрчил гаргавал систем илрүүлж, тухайн үйлдлийг хуулбарлах оролдлого гэж үзнэ.
              </p>
              <p className="font-medium">
                Ийм тохиолдолд таны шалгалтыг хүчингүйд тооцох боломжтойг анхаарна уу.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-7">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-[8px] border border-[#BDBDBD] bg-white text-sm font-medium text-black hover:bg-zinc-50"
              onClick={requireCamera ? handleCameraRetry : () => window.location.reload()}
            >
              Дахин шалгах
            </Button>
            <Button
              type="button"
              className="h-10 flex-1 rounded-[8px] bg-black text-sm font-medium text-white hover:bg-black/90"
              onClick={() => void handleStart()}
              disabled={!canStart || actionLoading || (requiresDesktop && !isDesktop)}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Бэлтгэж байна...
                </>
              ) : resumeMode ? (
                "Шалгалтыг үргэлжлүүлэх"
              ) : (
                "Шалгалт эхлүүлэх"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
