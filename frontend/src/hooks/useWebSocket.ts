import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000/ws";

export interface WsMessage {
  type?: string;
  [key: string]: unknown;
}

export function useWebSocket(token: string | null) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [messages, setMessages] = useState<WsMessage[]>([]);

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      if (socketRef.current === ws) socketRef.current = null;
    };
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as WsMessage;
        setLastMessage(parsed);
        setMessages((existing) => [parsed, ...existing].slice(0, 20));
      } catch {
        const raw = { type: "ws.raw", data: event.data };
        setLastMessage(raw);
        setMessages((existing) => [raw, ...existing].slice(0, 20));
      }
    };
    return () => {
      ws.close();
      if (socketRef.current === ws) socketRef.current = null;
    };
  }, [token]);

  const send = useCallback((message: Record<string, unknown>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  return { connected, lastMessage, messages, send };
}
