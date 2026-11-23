import React from "react";
import { cn } from "../../utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-4 h-4" />;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)]",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] mb-3">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-[14px] font-semibold text-[var(--text)]">{title}</h3>
      {description && <p className="text-[13px] text-[var(--muted)] mt-1 max-w-sm leading-normal">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
