import { AlertCircle, Loader2 } from "lucide-react";

export * from "./ui/index";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3 text-center">
      <Loader2 className="w-5 h-5 text-[var(--muted)] animate-spin" strokeWidth={1.5} />
      <p className="text-[13px] text-[var(--muted)] font-mono">{message}</p>
    </div>
  );
}

export function ErrorState({ title, error }: { title: string; error?: unknown }) {
  return (
    <div className="m-4 p-4 bg-[var(--critical-surface)] border border-[var(--critical-border)] rounded-[var(--radius-panel)]">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertCircle className="w-4 h-4 text-[var(--critical)] shrink-0" strokeWidth={1.5} />
        <h3 className="font-semibold text-[var(--text)] text-[13px]">{title}</h3>
      </div>
      {Boolean(error) && (
        <p className="text-[12px] font-mono text-[var(--critical)] ml-6 opacity-90">
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}
    </div>
  );
}
