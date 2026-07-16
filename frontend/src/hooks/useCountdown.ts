import { useEffect, useState } from 'react';

function secondsUntil(expiresAt?: string) {
  return Math.max(0, Math.ceil(((expiresAt ? Date.parse(expiresAt) : 0) - Date.now()) / 1000));
}

export function useCountdown(expiresAt?: string) {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    setSeconds(secondsUntil(expiresAt));
    const interval = window.setInterval(() => setSeconds(secondsUntil(expiresAt)), 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return seconds;
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
