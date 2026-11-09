import React, { useState } from "react";
import { Download, X, FileSpreadsheet, FileCode, AlertCircle } from "lucide-react";
import { api } from "../api";
import { Button } from "./ui";
import { cn } from "../utils";

interface ExportAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportAuditModal({ isOpen, onClose }: ExportAuditModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [agentId, setAgentId] = useState("");
  const [failureType, setFailureType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.downloadAuditExport({
        format,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        agentId: agentId.trim() || undefined,
        failureType: failureType || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to download compliance export");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-[12px] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-raised border border-border-default rounded-2xl w-full max-w-lg shadow-2xl shadow-black/60 p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/[0.08] border border-accent/15 rounded-xl">
            <Download className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Export Compliance Log</h2>
            <p className="text-[11px] text-text-muted">
              Download safety telemetry and incident verification history.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/8 border border-red-500/15 rounded-xl text-red-400 text-[12px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleExport} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "csv" as const, label: "CSV Spreadsheet", Icon: FileSpreadsheet },
                { value: "json" as const, label: "Raw JSON", Icon: FileCode },
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormat(value)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-xl border text-[13px] font-medium transition-all",
                    format === value
                      ? "border-accent bg-accent/[0.06] text-accent shadow-sm shadow-accent/10"
                      : "border-border-subtle bg-bg-base text-text-tertiary hover:text-text-secondary hover:border-border-default"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                From Date
              </label>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                To Date
              </label>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                Failure Type
              </label>
              <select
                value={failureType}
                onChange={(e) => setFailureType(e.target.value)}
                className={inputClass}
              >
                <option value="">All Types</option>
                <option value="STUCK_LOOP">STUCK_LOOP</option>
                <option value="BUDGET_EXCEEDED">BUDGET_EXCEEDED</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1.5">
                Agent ID
              </label>
              <input
                type="text"
                placeholder="e.g. support_agent_1"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-subtle">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isLoading} loading={isLoading}>
              <Download className="w-3 h-3" />
              Download {format.toUpperCase()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
