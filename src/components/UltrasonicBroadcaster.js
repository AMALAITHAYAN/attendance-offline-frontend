import React, { useEffect, useRef, useState } from "react";

// Demo-friendly ultrasonic broadcaster:
// - Generates a constant high-frequency tone (default 19kHz)
// - Students can "detect presence" via microphone (not decoding the token)
export default function UltrasonicBroadcaster({ enabled, frequency = 19000 }) {
  const ctxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const [running, setRunning] = useState(false);

  async function start() {
    if (running) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = frequency;

    // Keep very low volume to avoid annoyance; still detectable nearby on some devices
    gain.gain.value = 0.02;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();

    ctxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
    setRunning(true);
  }

  async function stop() {
    try {
      oscRef.current?.stop?.();
    } catch {}
    try {
      await ctxRef.current?.close?.();
    } catch {}
    ctxRef.current = null;
    oscRef.current = null;
    gainRef.current = null;
    setRunning(false);
  }

  useEffect(() => {
    if (!enabled && running) {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Ultrasonic Broadcaster (Demo)</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        Plays a {frequency} Hz tone. Students can detect presence using mic.
      </div>
      <button onClick={start} disabled={!enabled || running}>
        Start Ultrasonic
      </button>
      <button onClick={stop} disabled={!enabled || !running} style={{ marginLeft: 8 }}>
        Stop
      </button>
      <div style={{ marginTop: 8, fontSize: 12 }}>
        Status: {enabled ? (running ? "Running" : "Ready") : "Disabled"}
      </div>
    </div>
  );
}
