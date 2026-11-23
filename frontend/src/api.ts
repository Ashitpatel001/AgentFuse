import type { PaginatedResponse, Incident, Run, TimelineEntry, RecoveryPlan } from "./types";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiKey(): string | null {
  return sessionStorage.getItem("agentfuse_api_key");
}

export function setApiKey(key: string) {
  sessionStorage.setItem("agentfuse_api_key", key);
}

export function clearApiKey() {
  sessionStorage.removeItem("agentfuse_api_key");
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const key = getApiKey();
  const headers = new Headers(options.headers || {});
  
  // Do not attach for /health or /readiness
  if (key && !endpoint.startsWith('/health') && !endpoint.startsWith('/readiness')) {
    headers.set("X-API-Key", key);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include", // send the session cookie (human-auth plane)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.detail || response.statusText);
  }

  return response.json();
}

export interface AuthUser {
  user_id: string;
  email: string;
  org_id: string;
  role: "VIEWER" | "OPERATOR" | "ADMIN";
  auth: "session" | "api_key";
}

export interface MetricsSummary {
  runs_monitored: number;
  incidents_detected: number;
  runs_flagged: number;
  cost_on_flagged_runs_usd: number;
  time_to_detection_ms: { p50: number | null; p95: number | null; p99: number | null; count: number };
}

export const api = {
  health: () => fetchWithAuth("/health"),

  // --- Human auth (session) ---
  login: (email: string, password: string): Promise<AuthUser> =>
    fetchWithAuth("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  logout: (): Promise<{ status: string }> =>
    fetchWithAuth("/api/auth/logout", { method: "POST" }),
  me: (): Promise<AuthUser> => fetchWithAuth("/api/auth/me"),
  getUsers: (): Promise<Array<{ user_id: string; email: string; role: string; status: string; created_at: string; last_login_at: string | null }>> =>
    fetchWithAuth("/api/users"),
  getMetrics: (): Promise<MetricsSummary> => fetchWithAuth("/api/metrics/summary"),
  invite: (email: string, role: string): Promise<{ status: string; invite_token: string }> =>
    fetchWithAuth("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    }),
  acceptInvite: (token: string, password: string): Promise<AuthUser> =>
    fetchWithAuth("/api/auth/accept-invitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }),

  getIncidents: (skip = 0, limit = 50): Promise<PaginatedResponse<Incident>> => 
    fetchWithAuth(`/api/incidents?skip=${skip}&limit=${limit}`),
    
  getIncident: (id: string): Promise<Incident> => 
    fetchWithAuth(`/api/incidents/${id}`),
    
  getPlan: (id: string): Promise<RecoveryPlan> => 
    fetchWithAuth(`/api/incidents/${id}/plan`),
    
  approvePlan: (id: string): Promise<{status: string, message: string}> => 
    fetchWithAuth(`/api/incidents/${id}/plan/approve`, { method: 'POST' }),
    
  rejectPlan: (id: string): Promise<{status: string, message: string}> => 
    fetchWithAuth(`/api/incidents/${id}/plan/reject`, { method: 'POST' }),
    
  getKeys: (): Promise<any[]> => fetchWithAuth(`/api/keys`),
  
  createKey: (name: string, role: string): Promise<any> => 
    fetchWithAuth(`/api/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    }),
    
  revokeKey: (keyId: string): Promise<{status: string}> =>
    fetchWithAuth(`/api/keys/${keyId}/revoke`, { method: 'POST' }),

  getFleet: (): Promise<any[]> => 
    fetchWithAuth(`/api/fleet`),

  getWebhooks: (): Promise<any[]> => 
    fetchWithAuth(`/api/webhooks`),

  createWebhook: (data: { target_type: string; url: string; secret_token?: string; min_severity?: string; escalation_timeout_minutes?: number }): Promise<any> => 
    fetchWithAuth(`/api/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteWebhook: (webhookId: string): Promise<{ status: string }> => 
    fetchWithAuth(`/api/webhooks/${webhookId}`, { method: 'DELETE' }),

  getNotifications: (limit = 50): Promise<any[]> => 
    fetchWithAuth(`/api/notifications?limit=${limit}`),

  getPatterns: (): Promise<{ data: any[] }> =>
    fetchWithAuth(`/api/patterns`),
    
  getRuns: (skip = 0, limit = 50): Promise<PaginatedResponse<Run>> => 
    fetchWithAuth(`/api/runs?skip=${skip}&limit=${limit}`),
    
  getRun: (runId: string): Promise<Run> => 
    fetchWithAuth(`/api/runs/${runId}`),
    
  getRunTimeline: (runId: string): Promise<TimelineEntry[]> => 
    fetchWithAuth(`/api/runs/${runId}/timeline`),
    
  resumeRun: (runId: string): Promise<{status: string, message: string}> => 
    fetchWithAuth(`/api/runs/${runId}/resume`, { method: 'POST' }),

  downloadAuditExport: async (params: { format: 'json' | 'csv'; fromDate?: string; toDate?: string; agentId?: string; failureType?: string }) => {
    const key = getApiKey();
    const query = new URLSearchParams();
    query.set("format", params.format);
    if (params.fromDate) query.set("from_date", params.fromDate);
    if (params.toDate) query.set("to_date", params.toDate);
    if (params.agentId) query.set("agent_id", params.agentId);
    if (params.failureType) query.set("failure_type", params.failureType);

    const headers = new Headers();
    if (key) headers.set("X-API-Key", key);

    const response = await fetch(`/api/audit/export?${query.toString()}`, { headers, credentials: "include" });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new ApiError(response.status, err.detail || response.statusText);
    }

    if (params.format === "csv") {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agentfuse_audit_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      const json = await response.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agentfuse_audit_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  }
};
