import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useRole } from "../hooks/useRole";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  EmptyState,
  LoadingState,
  ErrorState,
} from "../components/ui";
import {
  Key,
  Users,
  Bell,
  Download,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";
import { relativeTime } from "../utils";

export function SettingsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "keys";
  const { isAdmin } = useRole();

  // Tab change handler
  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">Settings</h1>
        <p className="text-[12px] text-[var(--muted)] font-mono">
          Organization credentials, access controls, alerting webhooks, and audit compliance
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-[var(--surface-2)] p-1 border border-[var(--border)]">
          <TabsTrigger value="keys" className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Team</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Audit Export</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. API Keys Tab */}
        <TabsContent value="keys">
          <ApiKeysTab isAdmin={isAdmin} />
        </TabsContent>

        {/* 2. Team Tab */}
        <TabsContent value="team">
          <TeamTab isAdmin={isAdmin} />
        </TabsContent>

        {/* 3. Webhooks Tab */}
        <TabsContent value="webhooks">
          <WebhooksTab isAdmin={isAdmin} />
        </TabsContent>

        {/* 4. Audit Export Tab */}
        <TabsContent value="export">
          <AuditExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// 1. API Keys Tab Component
// ==========================================
function ApiKeysTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyRole, setKeyRole] = useState("OPERATOR");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: keys = [], isLoading, error } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => api.getKeys(),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createKey(keyName, keyRole),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setCreatedRawKey(data.raw_key);
      setShowCreate(false);
      setKeyName("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const handleCopy = () => {
    if (createdRawKey) {
      navigator.clipboard.writeText(createdRawKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only ADMIN users can view and manage organization API keys."
        icon={Key}
      />
    );
  }

  if (isLoading) return <LoadingState message="Loading API keys..." />;
  if (error) return <ErrorState title="Failed to load keys" error={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[var(--muted)] font-mono">
          Machine keys used by agent SDKs and CLI tools (prefixed with af_live_)
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
          Create API Key
        </Button>
      </div>

      {createdRawKey && (
        <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--ok-border)] bg-[var(--ok-surface)] space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" strokeWidth={1.5} />
            <span className="font-semibold text-[13px] text-[var(--ok)]">API Key Created</span>
          </div>
          <p className="text-[12px] text-[var(--text)]">
            Copy this key now. It will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-[var(--surface-1)] border border-[var(--border)] font-mono text-[12px] text-[var(--text)] break-all">
              {createdRawKey}
            </code>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copiedKey ? <Check className="w-3.5 h-3.5 text-[var(--ok)]" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCreatedRawKey(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <TableHead>Name</TableHead>
              <TableHead>Key Prefix</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[12px] text-[var(--muted)] font-mono">
                  No active API keys found.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.key_id}>
                  <TableCell className="font-medium text-[var(--text)]">{k.name || "Default Key"}</TableCell>
                  <TableCell className="font-mono text-[12px] text-[var(--muted)]">{k.key_prefix}...</TableCell>
                  <TableCell>
                    <Badge variant={k.role === "ADMIN" ? "critical" : "neutral"}>{k.role}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-[var(--muted)]">
                    {relativeTime(k.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeMutation.mutate(k.key_id)}
                      disabled={revokeMutation.isPending}
                      aria-label={`Revoke key ${k.name || k.key_id}`}
                      className="text-[var(--critical)] hover:bg-[var(--critical-surface)]"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Key Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Machine API Key</DialogTitle>
            <DialogDescription>
              Generate a secret key for autonomous agent frameworks and SDK integrations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Key Name</label>
              <Input
                placeholder="e.g. production-langgraph-worker"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Role Permission</label>
              <select
                value={keyRole}
                onChange={(e) => setKeyRole(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              >
                <option value="VIEWER">VIEWER (Read-only)</option>
                <option value="OPERATOR">OPERATOR (Ingest events & execute plans)</option>
                <option value="ADMIN">ADMIN (Full administrative access)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!keyName.trim() || createMutation.isPending}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// 2. Team Tab Component
// ==========================================
function TeamTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("OPERATOR");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.getUsers(),
    enabled: isAdmin,
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.invite(inviteEmail, inviteRole),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setInviteToken(data.invite_token);
      setShowInvite(false);
      setInviteEmail("");
    },
  });

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only ADMIN users can view team members and manage organization access."
        icon={Users}
      />
    );
  }

  if (isLoading) return <LoadingState message="Loading team members..." />;
  if (error) return <ErrorState title="Failed to load team" error={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[var(--muted)] font-mono">
          Organization human operators with session login credentials
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
          Invite Teammate
        </Button>
      </div>

      {inviteToken && (
        <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--ok-border)] bg-[var(--ok-surface)] space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" strokeWidth={1.5} />
            <span className="font-semibold text-[13px] text-[var(--ok)]">Invitation Link Generated</span>
          </div>
          <p className="text-[12px] text-[var(--text)]">
            Share this single-use activation link with your teammate. It expires in 72 hours.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-[var(--surface-1)] border border-[var(--border)] font-mono text-[12px] text-[var(--text)] break-all">
              {`${window.location.origin}/accept-invite?token=${inviteToken}`}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/accept-invite?token=${inviteToken}`);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[var(--ok)]" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInviteToken(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Last Login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium text-[var(--text)]">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "critical" : u.role === "OPERATOR" ? "warning" : "neutral"}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.status === "ACTIVE" ? "ok" : "neutral"}>{u.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-[12px] text-[var(--muted)]">
                  {relativeTime(u.created_at)}
                </TableCell>
                <TableCell className="text-right font-mono text-[12px] text-[var(--muted)]">
                  {u.last_login_at ? relativeTime(u.last_login_at) : "Never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Create a cryptographic invite token for a developer or operator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Assigned Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              >
                <option value="VIEWER">VIEWER (Read-only)</option>
                <option value="OPERATOR">OPERATOR (Approve & triage incidents)</option>
                <option value="ADMIN">ADMIN (Full management)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
              loading={inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// 3. Webhooks Tab Component
// ==========================================
function WebhooksTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [targetType, setTargetType] = useState("slack");
  const [url, setUrl] = useState("");
  const [minSeverity, setMinSeverity] = useState("HIGH");

  const { data: webhooks = [], isLoading, error } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => api.getWebhooks(),
    enabled: isAdmin,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(20),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createWebhook({
        target_type: targetType,
        url,
        min_severity: minSeverity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setShowCreate(false);
      setUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only ADMIN users can configure alerting webhooks."
        icon={Bell}
      />
    );
  }

  if (isLoading) return <LoadingState message="Loading webhooks..." />;
  if (error) return <ErrorState title="Failed to load webhooks" error={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[var(--muted)] font-mono">
          Outbound notifications dispatched on circuit breaker events (Slack, PagerDuty, generic JSON)
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
          Add Webhook
        </Button>
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <TableHead>Type</TableHead>
              <TableHead>Target URL</TableHead>
              <TableHead>Min Severity</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[12px] text-[var(--muted)] font-mono">
                  No outbound webhooks configured.
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((w) => (
                <TableRow key={w.webhook_id}>
                  <TableCell className="font-mono uppercase text-[12px] font-semibold text-[var(--text)]">
                    {w.target_type}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-[var(--muted)] truncate max-w-xs">
                    {w.url}
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.min_severity === "CRITICAL" ? "critical" : "warning"}>
                      {w.min_severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-[var(--muted)]">
                    {relativeTime(w.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(w.webhook_id)}
                      aria-label={`Delete webhook ${w.target_type}`}
                      className="text-[var(--critical)] hover:bg-[var(--critical-surface)]"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Recent Dispatched Alerts */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-semibold text-[var(--text)] font-mono uppercase tracking-wider">
          Recent Dispatches
        </h3>
        <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                <TableHead>Status</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-[12px] text-[var(--muted)] font-mono">
                    No dispatches recorded.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow key={n.notification_id}>
                    <TableCell>
                      <Badge variant={n.status === "DELIVERED" ? "ok" : "critical"}>{n.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-[var(--text)]">
                      {n.incident_id?.slice(0, 8) || "n/a"}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-[var(--muted)]">
                      {n.target_type}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-[var(--muted)]">
                      {n.latency_ms ? `${n.latency_ms}ms` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[12px] text-[var(--muted)]">
                      {relativeTime(n.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Webhook Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Outbound Webhook</DialogTitle>
            <DialogDescription>
              Receive deterministic notifications when incidents trip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Target Platform</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              >
                <option value="slack">Slack Webhook</option>
                <option value="pagerduty">PagerDuty Events API v2</option>
                <option value="opsgenie">Opsgenie Alert API</option>
                <option value="generic">Generic JSON POST</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Webhook URL</label>
              <Input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Minimum Severity Trigger</label>
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              >
                <option value="LOW">LOW (All incidents)</option>
                <option value="MEDIUM">MEDIUM and above</option>
                <option value="HIGH">HIGH and CRITICAL</option>
                <option value="CRITICAL">CRITICAL only</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!url.trim() || createMutation.isPending}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// 4. Audit Export Tab Component
// ==========================================
function AuditExportTab() {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [agentId, setAgentId] = useState("");
  const [failureType, setFailureType] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    setIsExporting(true);
    setExportError("");
    try {
      await api.downloadAuditExport({
        format,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        agentId: agentId.trim() || undefined,
        failureType: failureType || undefined,
      });
    } catch (err: any) {
      setExportError(err.message || "Failed to download audit archive");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-[12px] text-[var(--muted)] font-mono">
          Export verified cryptographic audit history for compliance and SOC2 sign-off.
        </p>
      </div>

      <div className="p-5 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] space-y-4">
        {exportError && (
          <div className="p-3 rounded bg-[var(--critical-surface)] border border-[var(--critical-border)] text-[var(--critical)] text-[12px] font-mono">
            {exportError}
          </div>
        )}

        <div>
          <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Export Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`p-2.5 rounded-[var(--radius-control)] border text-[12px] font-mono font-medium transition-colors ${
                format === "csv"
                  ? "bg-[var(--surface-3)] border-[var(--brand)] text-[var(--text)]"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              CSV (Spreadsheet)
            </button>
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`p-2.5 rounded-[var(--radius-control)] border text-[12px] font-mono font-medium transition-colors ${
                format === "json"
                  ? "bg-[var(--surface-3)] border-[var(--brand)] text-[var(--text)]"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              JSON (Raw Evidence)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Filter Agent ID (Optional)</label>
          <Input placeholder="e.g. data-pipeline-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)} />
        </div>

        <div>
          <label className="text-[11px] font-mono text-[var(--muted)] block mb-1">Failure Type (Optional)</label>
          <select
            value={failureType}
            onChange={(e) => setFailureType(e.target.value)}
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          >
            <option value="">All Failure Types</option>
            <option value="STUCK_LOOP">STUCK_LOOP</option>
            <option value="BUDGET_EXCEEDED">BUDGET_EXCEEDED</option>
          </select>
        </div>

        <div className="pt-2">
          <Button variant="primary" loading={isExporting} onClick={handleExport} className="w-full">
            <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Export Compliance Archive
          </Button>
        </div>
      </div>
    </div>
  );
}
