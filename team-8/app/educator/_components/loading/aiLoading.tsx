type AiLoadingProps = {
  size?: number;
  label?: string;
  className?: string;
};

export default function AiLoading({
  size = 236,
  label = "Уншиж байна...",
  className = "",
}: AiLoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 236 236"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <style>{`
          @keyframes aiSpinCW {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes aiSpinCCW {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes aiPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.82); opacity: 0.55; }
          }
          @keyframes aiBreathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(0.93); }
          }

          .ai-wrap {
            transform-origin: 118px 118px;
            animation: aiBreathe 3s ease-in-out infinite;
          }
          .ai-ring-outer {
            transform-origin: 117.629px 117.629px;
            animation: aiSpinCW 8s linear infinite;
          }
          .ai-ring-mid {
            transform-origin: 117.301px 117.958px;
            animation: aiSpinCCW 5s linear infinite;
          }
          .ai-ring-inner {
            transform-origin: 117.298px 117.958px;
            animation: aiPulse 2.4s ease-in-out infinite;
          }
        `}</style>

        <g className="ai-wrap">
          <g className="ai-ring-outer" filter="url(#filter0_f_ai_loading)">
            <g clipPath="url(#clip0_ai_loading)">
              <circle
                cx="117.629"
                cy="117.629"
                r="113.357"
                stroke="#3B296D"
                strokeWidth="3.28571"
                strokeDasharray="3.29 3.29"
              />
            </g>
          </g>

          <g className="ai-ring-mid" filter="url(#filter1_f_ai_loading)">
            <g clipPath="url(#clip1_ai_loading)">
              <circle
                cx="117.301"
                cy="117.958"
                r="82.1429"
                stroke="#4B558F"
                strokeWidth="3.28571"
                strokeDasharray="3.29 3.29"
              />
            </g>
          </g>

          <g className="ai-ring-inner" filter="url(#filter2_f_ai_loading)">
            <g clipPath="url(#clip2_ai_loading)">
              <circle
                cx="117.298"
                cy="117.958"
                r="49.2857"
                transform="rotate(-180 117.298 117.958)"
                stroke="#82A4E6"
                strokeWidth="3.28571"
                strokeDasharray="3.29 3.29"
              />
            </g>
          </g>
        </g>

        <defs>
          <filter
            id="filter0_f_ai_loading"
            x="0.00033474"
            y="0.00033474"
            width="235.257"
            height="235.257"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="1.31429"
              result="effect1_foregroundBlur_ai_loading"
            />
          </filter>
          <filter
            id="filter1_f_ai_loading"
            x="32.2013"
            y="32.8576"
            width="170.199"
            height="170.201"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="0.657143"
              result="effect1_foregroundBlur_ai_loading"
            />
          </filter>
          <filter
            id="filter2_f_ai_loading"
            x="65.0568"
            y="65.715"
            width="104.484"
            height="104.486"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="0.657143"
              result="effect1_foregroundBlur_ai_loading"
            />
          </filter>
          <clipPath id="clip0_ai_loading">
            <rect
              width="230"
              height="230"
              fill="white"
              transform="translate(2.62891 2.62891)"
            />
          </clipPath>
          <clipPath id="clip1_ai_loading">
            <rect
              width="167.571"
              height="167.571"
              fill="white"
              transform="translate(33.5156 34.1719)"
            />
          </clipPath>
          <clipPath id="clip2_ai_loading">
            <rect
              width="101.857"
              height="101.857"
              fill="white"
              transform="translate(66.3711 67.0293)"
            />
          </clipPath>
        </defs>
      </svg>

      <p className="text-sm font-medium text-[#6676A6]">{label}</p>
    </div>
  );
}
