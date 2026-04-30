import { useRef, useCallback } from 'react';
import { getWebSocketUrl } from '@/services/chatService';

type MsgHandler = (data: Record<string, unknown>) => void;

export function useWebSocket(onMessage: MsgHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<string[]>([]);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const flushPending = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const pending = pendingRef.current;
    while (pending.length > 0) {
      const msg = pending.shift()!;
      ws.send(msg);
    }
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    const msg = JSON.stringify(data);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else {
      // Queue for sending when connection opens
      pendingRef.current.push(msg);
      // Auto-connect if not already
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        doConnect();
      }
    }
  }, []);

  const doConnect = useCallback(() => {
    // Don't double-connect
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const url = getWebSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      flushPending();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed — reconnecting in 3s');
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => doConnect(), 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [flushPending]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    doConnect();
  }, [doConnect]);

  return { connect, send, disconnect };
}
