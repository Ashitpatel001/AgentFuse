import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "../../utils";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ code, language, filename, className, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden font-mono text-[12px] leading-relaxed",
        className
      )}
      {...props}
    >
      {(filename || language) && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-1)] text-[11px] text-[var(--muted)]">
          <span>{filename || language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-[var(--ok)]" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}
      {!filename && !language && (
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 p-1.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-[var(--ok)]" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
        </button>
      )}
      <pre className="p-3.5 overflow-x-auto text-[var(--text)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
