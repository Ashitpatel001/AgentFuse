import React, { forwardRef } from "react";
import { cn } from "../../utils";

export const Table = forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)]">
      <table ref={ref} className={cn("w-full text-left text-[13px] border-collapse", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn("bg-[var(--surface-2)] text-[12px] font-mono text-[var(--muted)] uppercase border-b border-[var(--border)] select-none", className)}
      {...props}
    />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("divide-y divide-[var(--border)]", className)} {...props} />
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "h-[var(--row-height)] transition-colors hover:bg-[var(--surface-2)] data-[state=selected]:bg-[var(--surface-2)]",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("h-[var(--row-height)] px-3 text-left font-medium text-[var(--muted)] tracking-wider", className)}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("h-[var(--row-height)] px-3 py-1.5 text-[var(--text)] tabular-nums align-middle", className)}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";
