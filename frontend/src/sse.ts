import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiKey } from './api';


export function useSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let abortController = new AbortController();
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let connected = false;

    const connect = async () => {
      const apiKey = getApiKey();

      try {
        queryClient.setQueryData(['sse_status'], 'reconnecting');
        
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers['X-API-Key'] = apiKey;
        }

        const response = await fetch('/api/stream', {
          headers,
          credentials: 'include',
          signal: abortController.signal
        });

        if (!response.ok) {
          queryClient.setQueryData(['sse_status'], 'offline');
          throw new Error('SSE connection failed');
        }

        queryClient.setQueryData(['sse_status'], 'connected');
        connected = true;
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the incomplete line

          let currentEvent = 'message';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('event: ')) {
              currentEvent = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              const dataStr = line.substring(6).trim();
              if (dataStr === 'ping' || dataStr === 'new_data_available') continue;

              try {
                const data = JSON.parse(dataStr);
                handleEvent(currentEvent, data);
              } catch (e) {
                console.error("Failed to parse SSE JSON", e);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("SSE Error:", err);
        } else if (!(err instanceof Error)) {
          console.error("SSE Error:", err);
        }
      } finally {
        if (connected) {
          queryClient.setQueryData(['sse_status'], 'reconnecting');
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    };

    const handleEvent = (event: string, data: Record<string, unknown>) => {
      // Record last event with timestamp to drive row-level flashing
      queryClient.setQueryData(['sse_last_event'], { event, data, timestamp: Date.now() });

      if (event === 'incident_created') {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['fleet'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
        queryClient.invalidateQueries({ queryKey: ['timeline', String(data.run_id)] });
      } else if (event === 'run_status_changed') {
        queryClient.invalidateQueries({ queryKey: ['runs'] });
        queryClient.invalidateQueries({ queryKey: ['fleet'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
        queryClient.invalidateQueries({ queryKey: ['run', String(data.run_id)] });
        queryClient.invalidateQueries({ queryKey: ['timeline', String(data.run_id)] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] }); 
        queryClient.invalidateQueries({ queryKey: ['incident'] });
      } else if (event === 'run_resumed' || event === 'plan_approved' || event === 'plan_rejected') {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['incident'] });
        queryClient.invalidateQueries({ queryKey: ['fleet'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
        queryClient.invalidateQueries({ queryKey: ['plan'] });
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
      }
    };

    connect();

    return () => {
      connected = false;
      abortController.abort();
      clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);
}
