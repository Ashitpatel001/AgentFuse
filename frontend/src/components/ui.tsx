import type { ReactNode } from "react";
import { cn } from "../utils";
import { AlertCircle, Loader2, InboxIcon } from "lucide-react";

const badgeVariants = {
  neutral: "bg-bg-overlay text-text-secondary border border-border-default",
  red: "bg-red-500/10 text-red-400 border border-red-500/20",
  amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  accent: "bg-accent-subtle text-accent border border-accent/20",
};

export function Badge({
  children,
  variant = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  variant?: keyof typeof badgeVariants;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider leading-none rounded",
        badgeVariants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "red" && "bg-red-400",
            variant === "amber" && "bg-amber-400",
            variant === "green" && "bg-emerald-400 animate-pulse",
            variant === "accent" && "bg-accent",
            variant === "neutral" && "bg-text-muted"
          )}
        />
      )}
      {children}
    </span>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="relative">
        <div className="w-8 h-8 rounded-full border-2 border-border-default" />
        <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      </div>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border-subtle">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-4 w-48 flex-1" />
      <div className="skeleton h-5 w-16 rounded" />
      <div className="skeleton h-4 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-bg-raised border border-border-subtle rounded-xl overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function ErrorState({ title, error }: { title: string; error?: unknown }) {
  return (
    <div className="m-6 p-5 bg-red-500/5 border border-red-500/15 rounded-xl animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 bg-red-500/10 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400" />
        </div>
        <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
      </div>
      {Boolean(error) && (
        <p className="text-xs font-mono text-red-400/70 ml-10">
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border-subtle flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-text-tertiary max-w-sm leading-relaxed">{description}</p>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-hover active:bg-blue-700 shadow-sm shadow-accent/20 disabled:bg-accent/30 disabled:text-white/50 disabled:shadow-none",
    secondary:
      "bg-bg-elevated text-text-secondary border border-border-default hover:bg-bg-overlay hover:text-text-primary hover:border-border-strong active:bg-border-default disabled:opacity-30",
    ghost:
      "text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated active:bg-bg-overlay disabled:opacity-30",
    danger:
      "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15 active:bg-red-500/20 disabled:opacity-30",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
    md: "px-4 py-2 text-sm gap-2 rounded-lg",
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        variants[variant],
        sizes[size],
        (disabled || loading) && "cursor-not-allowed",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}
