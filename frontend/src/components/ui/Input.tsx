import React, { forwardRef } from "react";
import { cn } from "../../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-[var(--control-height)] w-full rounded-[var(--radius-control)] border bg-[var(--surface-1)] px-3 py-1 text-[13px] text-[var(--text)] placeholder:text-[var(--faint)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-[var(--critical)] focus-visible:ring-[var(--critical)]"
            : "border-[var(--border)] focus-visible:border-[var(--brand)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
