import React from "react";
import { cn } from "../../utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-2)]", className)}
      {...props}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-3 h-[var(--row-height)] border-b border-[var(--border)]">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3.5 w-44 flex-1" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-3.5 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
