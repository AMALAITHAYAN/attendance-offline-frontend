import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function QRCodeScanner({ enabled, onScan, onError }) {
  const [active, setActive] = useState(false);
  const idRef = useRef(`qr_reader_${Math.random().toString(16).slice(2)}`);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setActive(false);
      return;
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  function start() {
    if (!enabled || active) return;

    const scanner = new Html5QrcodeScanner(
      idRef.current,
      { fps: 10, qrbox: 250, rememberLastUsedCamera: true },
      false
    );

    scannerRef.current = scanner;
    setActive(true);

    scanner.render(
      (decodedText) => {
        onScan?.(decodedText);
        cleanup();
        setActive(false);
      },
      (err) => {
        // continuous errors are normal while scanning
        onError?.(err);
      }
    );
  }

  function cleanup() {
    try {
      scannerRef.current?.clear?.();
    } catch {}
    scannerRef.current = null;
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>QR Scanner</div>
      <button onClick={start} disabled={!enabled || active}>
        {active ? "Scanning…" : "Start QR Scan"}
      </button>
      <div style={{ marginTop: 10 }}>
        <div id={idRef.current} />
      </div>
    </div>
  );
}
