import React from "react";
import { cn } from "../../utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center font-mono text-[11px] font-medium text-[var(--muted)] bg-[var(--surface-2)] border border-[var(--border-strong)] rounded-[var(--radius-sm)] px-1.5 py-0.5 select-none leading-none",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
