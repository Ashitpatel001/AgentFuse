import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] disabled:opacity-45 disabled:pointer-events-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] border border-transparent shadow-xs",
      secondary:
        "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--border-strong)]",
      ghost:
        "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] border border-transparent",
      danger:
        "bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] border border-[var(--btn-danger-border)] hover:bg-[var(--btn-danger-hover)]",
    };

    const sizeStyles = {
      sm: "h-[28px] px-2.5 text-[12px] rounded-[var(--radius-control)] gap-1.5",
      md: "h-[32px] px-3.5 text-[13px] rounded-[var(--radius-control)] gap-2",
      lg: "h-[36px] px-4 text-[14px] rounded-[var(--radius-control)] gap-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin text-current" strokeWidth={1.5} />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
