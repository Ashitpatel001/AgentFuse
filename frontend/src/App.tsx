import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { AuthGate } from "./components/AuthGate";
import { IncidentQueue } from "./pages/IncidentQueue";
import { AgentQueuesMonitoring } from "./pages/AgentQueuesMonitoring";
import { RunsList } from "./pages/RunsList";
import { RunDetail } from "./pages/RunDetail";
import { IncidentDetail } from "./pages/IncidentDetail";
import { FleetView } from "./pages/FleetView";
import { ApiKeysView } from "./pages/ApiKeysView";
import { TeamView } from "./pages/TeamView";
import { AcceptInvite } from "./pages/AcceptInvite";

const queryClient = new QueryClient();

function ProtectedApp() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<IncidentQueue />} />
          <Route path="queues" element={<AgentQueuesMonitoring />} />
          <Route path="monitoring" element={<Navigate to="/queues" replace />} />
          <Route path="fleet" element={<FleetView />} />
          <Route path="runs" element={<RunsList />} />
          <Route path="runs/:id" element={<RunDetail />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="team" element={<TeamView />} />
          <Route path="keys" element={<ApiKeysView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public: activating an invite happens before authentication. */}
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
