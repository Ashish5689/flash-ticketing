import { useEffect, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000/ws";

export function useWebSocket(token: string | null) {
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    ws.onmessage = (event) => {
      try {
        setMessages((existing) => [JSON.parse(event.data), ...existing].slice(0, 20));
      } catch {
        setMessages((existing) => [{ type: "ws.raw", data: event.data }, ...existing].slice(0, 20));
      }
    };
    return () => ws.close();
  }, [token]);

  return messages;
}
