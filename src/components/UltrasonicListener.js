import React, { useEffect, useRef, useState } from "react";

// Demo-friendly ultrasonic listener:
// - Listens on microphone
// - Detects energy around target frequency (default 19kHz)
// - Sets "detected" true if energy crosses threshold
export default function UltrasonicListener({ enabled, frequency = 19000, onDetected }) {
  const [status, setStatus] = useState("idle");
  const [detected, setDetected] = useState(false);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setStatus("disabled");
      setDetected(false);
      return;
    }
    setStatus("ready");

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function start() {
    setDetected(false);
    try {
      setStatus("requesting-mic");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;
      source.connect(analyser);

      setStatus("listening");

      const binCount = analyser.frequencyBinCount;
      const data = new Uint8Array(binCount);
      const sampleRate = ctx.sampleRate;

      const targetIndex = Math.round((frequency / sampleRate) * analyser.fftSize);
      const windowBins = 2;

      const loop = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        let n = 0;
        for (let i = targetIndex - windowBins; i <= targetIndex + windowBins; i++) {
          if (i >= 0 && i < data.length) {
            sum += data[i];
            n++;
          }
        }
        const avg = n ? sum / n : 0;

        // Threshold tuned for demos; different devices vary.
        if (avg > 70) {
          setDetected(true);
          onDetected?.(true);
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setStatus("mic-denied");
    }
  }

  function cleanup() {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } catch {}
    rafRef.current = null;

    try {
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;

    try {
      ctxRef.current?.close?.();
    } catch {}
    ctxRef.current = null;
    analyserRef.current = null;
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Ultrasonic Listener (Demo)</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        Detects presence of a ~{frequency} Hz tone. (Detection varies by device/mic.)
      </div>
      <button onClick={start} disabled={!enabled || status === "listening"}>
        Start Listening
      </button>
      <button
        onClick={() => {
          cleanup();
          setStatus(enabled ? "ready" : "disabled");
        }}
        disabled={!enabled || status !== "listening"}
        style={{ marginLeft: 8 }}
      >
        Stop
      </button>
      <div style={{ marginTop: 8, fontSize: 12 }}>
        Status: {status} | Detected: {detected ? "YES" : "NO"}
      </div>
    </div>
  );
}
