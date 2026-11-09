import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Users, UserPlus, CheckCircle2, Copy } from "lucide-react";
import { Badge, Button, LoadingState, ErrorState, EmptyState } from "../components/ui";

export function TeamView() {
  const queryClient = useQueryClient();
  const role = sessionStorage.getItem("cortexheal_role") as string | null;
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("OPERATOR");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.getUsers(),
    enabled: role === "ADMIN",
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => api.invite(data.email, data.role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setInviteToken(data.invite_token);
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("OPERATOR");
    },
  });

  if (role !== "ADMIN") {
    return (
      <EmptyState
        title="Access Denied"
        description="Only ADMIN users can manage team members."
        icon={Users}
      />
    );
  }

  if (isLoading) return <LoadingState message="Loading team..." />;
  if (error) return <ErrorState title="Failed to load team" error={error} />;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Team</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Manage organization members and roles</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="w-3.5 h-3.5" />
          Invite Member
        </Button>
      </div>

      {inviteToken && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-emerald-400 text-[14px]">Invitation Created</h3>
              <p className="text-[12px] text-text-secondary">
                Share this single-use invite link with your teammate. It expires in 72 hours.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <code className="flex-1 bg-bg-base border border-emerald-500/15 rounded-xl p-3 font-mono text-[11px] text-text-primary break-all">
                  {`${window.location.origin}/accept-invite?token=${inviteToken}`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/accept-invite?token=${inviteToken}`
                    );
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="p-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-tertiary hover:text-text-secondary transition-colors"
                  title="Copy invite link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setInviteToken(null)}
                className="text-[12px] text-text-muted hover:text-text-secondary mt-1 transition-colors"
              >
                {copiedLink ? "Copied!" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvite && !inviteToken && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inviteEmail.trim()) inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
          }}
          className="bg-bg-raised border border-border-subtle rounded-xl p-5 animate-fade-in"
        >
          <h2 className="text-[15px] font-semibold text-text-primary mb-4">Invite a Teammate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary mb-1.5">Email</label>
              <input
                type="email"
                required
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary mb-1.5">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-bg-base border border-border-default rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              >
                <option value="VIEWER">VIEWER — Read-only</option>
                <option value="OPERATOR">OPERATOR — Can approve/reject plans</option>
                <option value="ADMIN">ADMIN — Full access</option>
              </select>
            </div>
          </div>
          {inviteMutation.isError && (
            <p className="text-red-400 text-[12px] font-mono mb-3">
              {(inviteMutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
              loading={inviteMutation.isPending}
            >
              Send Invite
            </Button>
          </div>
        </form>
      )}

      <div className="bg-bg-raised border border-border-subtle rounded-xl overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Email</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Role</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Status</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Joined</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {users?.map((u) => (
              <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-bg-overlay flex items-center justify-center text-[11px] font-semibold text-text-tertiary uppercase flex-shrink-0">
                      {u.email[0]}
                    </div>
                    <span className="font-medium text-text-secondary">{u.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "ADMIN" ? "red" : u.role === "OPERATOR" ? "amber" : "neutral"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.status === "ACTIVE" ? "green" : "neutral"} dot>{u.status}</Badge>
                </td>
                <td className="px-4 py-3 text-text-tertiary text-[12px]">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted text-[13px]">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
