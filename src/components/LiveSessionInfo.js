import React from "react";

export default function LiveSessionInfo({ session, remainingMs, expired }) {
  if (!session) return null;

  const fmt = (ms) => {
    if (ms === null || ms === undefined) return "-";
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 700 }}>Live Session</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>
        <div>Session ID: <b>{session.sessionId}</b></div>
        <div>Status: <b>{session.status}</b></div>
        <div>QR Refresh: <b>{session.qrRefreshIntervalSeconds}s</b></div>
        <div>Token Window: <b>{session.tokenWindowSeconds}s</b></div>
        <div>Radius: <b>{session.allowedRadiusMeters}m</b></div>
        <div>Max GPS Accuracy: <b>{session.maxGpsAccuracyMeters ?? "-"}m</b></div>
        <div>Location Max Age: <b>{session.locationMaxAgeSeconds ?? "-"}s</b></div>
        <div>Ends at: <b>{String(session.endTime)}</b></div>
        <div style={{ marginTop: 8 }}>
          Time Left: <b>{expired ? "EXPIRED" : fmt(remainingMs)}</b>
        </div>
      </div>
    </div>
  );
}
