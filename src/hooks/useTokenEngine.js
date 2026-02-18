import { useEffect, useMemo, useState } from "react";
import { sha256Hex } from "../utils/hash";

// Token = SHA256(sessionId + ":" + windowTime + ":" + sessionSecret)
export default function useTokenEngine({ sessionId, sessionSecret, tokenWindowSeconds, enabled }) {
  const [windowTime, setWindowTime] = useState(null);
  const [token, setToken] = useState(null);

  const safeTokenWindow = useMemo(() => {
    const v = Number(tokenWindowSeconds);
    return Number.isFinite(v) && v > 0 ? v : 20;
  }, [tokenWindowSeconds]);

  useEffect(() => {
    if (!enabled || !sessionId || !sessionSecret) {
      setWindowTime(null);
      setToken(null);
      return;
    }

    let timer = null;

    const tick = async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const wt = Math.floor(nowSec / safeTokenWindow);
      setWindowTime(wt);
    };

    tick();
    timer = setInterval(tick, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [enabled, sessionId, sessionSecret, safeTokenWindow]);

  useEffect(() => {
    if (!enabled || !sessionId || !sessionSecret || windowTime === null) {
      setToken(null);
      return;
    }
    let cancelled = false;

    (async () => {
      const raw = `${sessionId}:${windowTime}:${sessionSecret}`;
      const t = await sha256Hex(raw);
      if (!cancelled) setToken(t);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, sessionId, sessionSecret, windowTime]);

  return { windowTime, token };
}
