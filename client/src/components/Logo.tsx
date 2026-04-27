import { useId } from "react";
import { cn } from "@/lib/utils";

/*
  Logo mark: double-chevron ">>" inside rounded square with purple→pink gradient.
  Each chevron is a ">" shape — the front one bright white, the rear one at 45%
  opacity to create depth. Together they read as speed, forward motion, "Express".

  Mark geometry (40×40 viewBox):
    Front chevron:  M9 11.5 → peak (22, 20) → M9 28.5
    Rear  chevron:  M18 11.5 → peak (31, 20) → M18 28.5
  Both use round linecap/join, 4.5px stroke.
*/

const GRADIENT_TEXT_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #7C3AED, #EC4899)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

/* ── Isolated mark ─────────────────────────────────────────── */

export function LogoMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={id}
          x1="0" y1="0" x2="40" y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
        {/* Subtle inner shadow */}
        <filter id={`${id}-sh`}>
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="40" height="40" rx="10" fill={`url(#${id})`} />

      {/* Front chevron — full white */}
      <path
        d="M9 11.5 L22 20 L9 28.5"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Rear chevron — ghost */}
      <path
        d="M18 11.5 L31 20 L18 28.5"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.42"
      />
    </svg>
  );
}

/* ── Full wordmark ──────────────────────────────────────────── */

type LogoSize = "xs" | "sm" | "md" | "lg";
type LogoLayout = "inline" | "stacked";

const ICON_SIZES: Record<LogoSize, number> = { xs: 22, sm: 26, md: 34, lg: 52 };

export function Logo({
  size = "md",
  layout = "inline",
  className,
}: {
  size?: LogoSize;
  layout?: LogoLayout;
  className?: string;
}) {
  const iconPx = ICON_SIZES[size];

  /* ── Stacked (login / hero) ── */
  if (layout === "stacked") {
    const titleCls =
      size === "lg" ? "text-3xl" :
      size === "md" ? "text-xl"  :
      size === "sm" ? "text-lg"  : "text-base";
    const subCls =
      size === "lg" ? "text-base" :
      size === "sm" ? "text-xs"   : "text-sm";

    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <LogoMark size={iconPx} />
        <div className="text-center select-none">
          <p className={cn("font-black text-white tracking-tight leading-none", titleCls)}>
            TR FARIAS
          </p>
          <p
            className={cn("font-bold tracking-[0.22em] uppercase mt-1.5", subCls)}
            style={GRADIENT_TEXT_STYLE}
          >
            EXPRESS
          </p>
        </div>
      </div>
    );
  }

  /* ── Inline (navbar / sidebar) ── */
  const textCls =
    size === "lg" ? "text-xl" :
    size === "sm" ? "text-sm" :
    size === "xs" ? "text-xs" : "text-base";

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <LogoMark size={iconPx} />
      <span className={cn("font-bold text-white tracking-tight leading-none", textCls)}>
        TR Farias{" "}
        <span style={GRADIENT_TEXT_STYLE}>Express</span>
      </span>
    </div>
  );
}

export default Logo;
