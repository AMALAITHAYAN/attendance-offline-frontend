import { useEffect, useMemo, useState } from "react";

export default function useSessionTimer({ endTimeIso, enabled }) {
  const endMs = useMemo(() => {
    if (!endTimeIso) return null;
    const d = new Date(endTimeIso);
    return isNaN(d.getTime()) ? null : d.getTime();
  }, [endTimeIso]);

  const [remainingMs, setRemainingMs] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!enabled || !endMs) {
      setRemainingMs(null);
      setExpired(false);
      return;
    }

    let timer = null;
    const tick = () => {
      const diff = endMs - Date.now();
      setRemainingMs(diff);
      setExpired(diff <= 0);
    };

    tick();
    timer = setInterval(tick, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [enabled, endMs]);

  return { remainingMs, expired };
}
