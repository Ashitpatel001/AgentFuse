import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Kbd,
} from "./ui";
import {
  Search,
  ShieldAlert,
  Server,
  Activity,
  Key,
  Users,
  Bell,
  Download,
  ArrowRight,
} from "lucide-react";
import { cn } from "../utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch recent incidents and runs for search
  const { data: incidentsData } = useQuery({
    queryKey: ["palette_incidents"],
    queryFn: () => api.getIncidents(0, 30),
    enabled: isOpen,
  });

  const { data: runsData } = useQuery({
    queryKey: ["palette_runs"],
    queryFn: () => api.getRuns(0, 30),
    enabled: isOpen,
  });

  const staticCommands = [
    { id: "page_incidents", group: "Pages", title: "Incident Queue", icon: ShieldAlert, path: "/" },
    { id: "page_fleet", group: "Pages", title: "Fleet Status", icon: Server, path: "/fleet" },
    { id: "page_runs", group: "Pages", title: "Agent Executions", icon: Activity, path: "/runs" },
    { id: "page_settings_keys", group: "Settings", title: "API Keys", icon: Key, path: "/settings?tab=keys" },
    { id: "page_settings_team", group: "Settings", title: "Team Members", icon: Users, path: "/settings?tab=team" },
    { id: "page_settings_webhooks", group: "Settings", title: "Webhooks", icon: Bell, path: "/settings?tab=webhooks" },
    { id: "page_settings_export", group: "Settings", title: "Audit Export", icon: Download, path: "/settings?tab=export" },
  ];

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{ id: string; group: string; title: string; subtitle?: string; icon: any; action: () => void }> = [];

    // Filter static commands
    for (const cmd of staticCommands) {
      if (!q || cmd.title.toLowerCase().includes(q) || cmd.group.toLowerCase().includes(q)) {
        items.push({
          id: cmd.id,
          group: cmd.group,
          title: cmd.title,
          icon: cmd.icon,
          action: () => {
            navigate(cmd.path);
            onClose();
          },
        });
      }
    }

    // Incidents
    if (incidentsData?.data) {
      for (const inc of incidentsData.data) {
        const matches =
          !q ||
          inc.agent_id.toLowerCase().includes(q) ||
          inc.incident_id.toLowerCase().includes(q) ||
          inc.failure_type.toLowerCase().includes(q);

        if (matches) {
          items.push({
            id: `inc_${inc.incident_id}`,
            group: "Incidents",
            title: `${inc.failure_type} — ${inc.agent_id}`,
            subtitle: `ID: ${inc.incident_id.slice(0, 8)} • ${inc.severity}`,
            icon: ShieldAlert,
            action: () => {
              navigate(`/?id=${inc.incident_id}`);
              onClose();
            },
          });
        }
      }
    }

    // Runs
    if (runsData?.data) {
      for (const r of runsData.data) {
        const matches =
          !q ||
          r.agent_id.toLowerCase().includes(q) ||
          r.run_id.toLowerCase().includes(q) ||
          (r.framework && r.framework.toLowerCase().includes(q));

        if (matches) {
          items.push({
            id: `run_${r.run_id}`,
            group: "Runs",
            title: `Run: ${r.run_id.slice(0, 8)}... (${r.agent_id})`,
            subtitle: `Status: ${r.status} • ${r.framework || "LangGraph"}`,
            icon: Activity,
            action: () => {
              navigate(`/runs/${r.run_id}`);
              onClose();
            },
          });
        }
      }
    }

    return items.slice(0, 15);
  }, [query, incidentsData, runsData, navigate, onClose]);

  // Reset index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-[var(--surface-1)] border-[var(--border)] gap-0">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search input header */}
        <div className="flex items-center px-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <Search className="w-4 h-4 text-[var(--muted)] mr-3 shrink-0" strokeWidth={1.5} />
          <input
            autoFocus
            type="text"
            placeholder="Search runs, incidents, or jump to page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent py-3.5 text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)] p-1.5">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-[12px] font-mono text-[var(--muted)]">
              No matching commands or entities found.
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] cursor-pointer text-[12px] transition-colors",
                    isSelected
                      ? "bg-[var(--surface-3)] text-[var(--text)]"
                      : "text-[var(--text)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.5} />
                    <div className="truncate">
                      <div className="font-medium truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] font-mono text-[var(--muted)] truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted)] shrink-0">
                    <span>{item.group}</span>
                    <ArrowRight className="w-3 h-3 text-[var(--muted)]" strokeWidth={1.5} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
