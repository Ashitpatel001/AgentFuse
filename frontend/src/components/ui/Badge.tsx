import React from "react";
import { cn } from "../../utils";

export type SemanticStatus =
  | "critical"
  | "warning"
  | "ok"
  | "info"
  | "neutral"
  | "red"
  | "amber"
  | "green"
  | "accent";

export interface StatusDotProps {
  status?: SemanticStatus;
  className?: string;
  pulse?: boolean;
}

export function StatusDot({ status = "neutral", className, pulse = false }: StatusDotProps) {
  // Normalize color names to semantic tokens
  const normalized =
    status === "red"
      ? "critical"
      : status === "amber"
      ? "warning"
      : status === "green"
      ? "ok"
      : status === "accent"
      ? "info"
      : status;

  const dotColor = {
    critical: "bg-[var(--critical)]",
    warning: "bg-[var(--warning)]",
    ok: "bg-[var(--ok)]",
    info: "bg-[var(--info)]",
    neutral: "bg-[var(--faint)]",
  };

  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full shrink-0",
        dotColor[normalized],
        pulse && normalized === "ok" && "animate-pulse",
        className
      )}
      aria-hidden="true"
    />
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: SemanticStatus;
  dot?: boolean;
}

export function Badge({ children, variant = "neutral", dot = false, className, ...props }: BadgeProps) {
  const normalized =
    variant === "red"
      ? "critical"
      : variant === "amber"
      ? "warning"
      : variant === "green"
      ? "ok"
      : variant === "accent"
      ? "info"
      : variant;

  const badgeStyles = {
    critical: "bg-[var(--critical-surface)] text-[var(--critical)] border-[var(--critical-border)]",
    warning: "bg-[var(--warning-surface)] text-[var(--warning)] border-[var(--warning-border)]",
    ok: "bg-[var(--ok-surface)] text-[var(--ok)] border-[var(--ok-border)]",
    info: "bg-[var(--info-surface)] text-[var(--info)] border-[var(--info-border)]",
    neutral: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider tabular-nums font-medium rounded-[var(--radius-sm)] border",
        badgeStyles[normalized],
        className
      )}
      {...props}
    >
      {dot && <StatusDot status={normalized} />}
      {children}
    </span>
  );
}
