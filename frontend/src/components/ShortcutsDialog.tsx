import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Kbd,
} from "./ui";

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  const shortcuts = [
    { key: "j", desc: "Select next incident in queue" },
    { key: "k", desc: "Select previous incident in queue" },
    { key: "a", desc: "Approve recovery plan (opens confirmation dialog)" },
    { key: "x", desc: "Reject recovery plan (opens confirmation dialog)" },
    { key: "c", desc: "Copy incident as AI context to clipboard" },
    { key: "?", desc: "Show keyboard shortcuts" },
    { key: "Esc", desc: "Close open dialog or dismiss overlay" },
    { key: "Enter", desc: "Confirm action in approval / rejection dialog" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--text)]">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[var(--muted)]">
            Incident queue master-detail navigation and triage controls.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[var(--radius-control)] bg-[var(--surface-2)] overflow-hidden">
          {shortcuts.map(({ key, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 text-[12px]"
            >
              <span className="text-[var(--text)]">{desc}</span>
              <Kbd>{key}</Kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
