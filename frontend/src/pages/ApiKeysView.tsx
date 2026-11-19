import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Key, Plus, Trash2, CheckCircle2, Copy } from "lucide-react";
import { Badge, Button, LoadingState, ErrorState, EmptyState } from "../components/ui";

export function ApiKeysView() {
  const queryClient = useQueryClient();
  const role = sessionStorage.getItem("agentfuse_role") as any;
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("VIEWER");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: keys, isLoading, error } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => api.getKeys(),
    enabled: role === "ADMIN",
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; role: string }) => api.createKey(data.name, data.role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setNewlyCreatedKey(data.raw_key);
      setShowCreate(false);
      setNewName("");
      setNewRole("VIEWER");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => api.revokeKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const handleCopy = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (role !== "ADMIN") {
    return (
      <EmptyState
        title="Access Denied"
        description="Only ADMIN users can manage API keys."
        icon={Key}
      />
    );
  }

  if (isLoading) return <LoadingState message="Loading API keys..." />;
  if (error) return <ErrorState title="Failed to load API keys" error={error} />;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">API Keys</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Manage machine-to-machine authentication</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3.5 h-3.5" />
          Create Key
        </Button>
      </div>

      {newlyCreatedKey && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-emerald-400 text-[14px]">Key Created</h3>
              <p className="text-[12px] text-text-secondary">
                Copy this key now. You will not be able to see it again.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <code className="flex-1 bg-bg-base border border-emerald-500/15 rounded-xl p-3 font-mono text-[12px] text-text-primary break-all">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-tertiary hover:text-text-secondary transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="text-[12px] text-text-muted hover:text-text-secondary mt-1 transition-colors"
              >
                {copiedKey ? "Copied!" : "I have copied this key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && !newlyCreatedKey && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) createMutation.mutate({ name: newName.trim(), role: newRole });
          }}
          className="bg-bg-raised border border-border-subtle rounded-xl p-5 animate-fade-in"
        >
          <h2 className="text-[15px] font-semibold text-text-primary mb-4">Create New API Key</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary mb-1.5">Key Name</label>
              <input
                type="text"
                required
                placeholder="e.g., ci-runner, developer-macbook"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary mb-1.5">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              >
                <option value="VIEWER">VIEWER — Read-only</option>
                <option value="OPERATOR">OPERATOR — Can approve/reject plans</option>
                <option value="ADMIN">ADMIN — Full access</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={createMutation.isPending || !newName.trim()}
              loading={createMutation.isPending}
            >
              Generate Key
            </Button>
          </div>
        </form>
      )}

      <div className="bg-bg-raised border border-border-subtle rounded-xl overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Name</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Prefix</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Role</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Created</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Status</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {keys?.map((k) => (
              <tr key={k.key_id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-text-secondary">{k.name}</div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">{k.key_id.split("-")[0]}</div>
                </td>
                <td className="px-4 py-3 font-mono text-text-tertiary text-[12px]">{k.key_prefix}</td>
                <td className="px-4 py-3">
                  <Badge variant={k.role === "ADMIN" ? "red" : k.role === "OPERATOR" ? "amber" : "neutral"}>
                    {k.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-tertiary text-[12px]">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {k.revoked_at ? <Badge variant="red">REVOKED</Badge> : <Badge variant="green" dot>ACTIVE</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  {!k.revoked_at && (
                    <button
                      onClick={() => {
                        if (confirm(`Revoke key "${k.name}"? This cannot be undone.`))
                          revokeMutation.mutate(k.key_id);
                      }}
                      disabled={revokeMutation.isPending}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {(!keys || keys.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-muted text-[13px]">
                  No API keys created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
