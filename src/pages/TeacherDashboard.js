import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import OfflineSessionSetupModal from "../components/OfflineSessionSetupModal";
import LiveSessionInfo from "../components/LiveSessionInfo";
import QRCodeDisplay from "../components/QRCodeDisplay";
import UltrasonicBroadcaster from "../components/UltrasonicBroadcaster";
import useTokenEngine from "../hooks/useTokenEngine";
import useSessionTimer from "../hooks/useSessionTimer";
import {
  getSessionTeacherViewApi,
  startSessionApi,
  closeSessionApi,
} from "../api/sessionApi";
import { listAttendanceBySessionApi, getSessionSummaryApi } from "../api/attendanceApi";

export default function TeacherDashboard() {
  const { user, logout } = useAuth();

  const [setupOpen, setSetupOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionSecret, setSessionSecret] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enabled = session?.status === "ACTIVE";
  const { remainingMs, expired } = useSessionTimer({ endTimeIso: session?.endTime, enabled: !!session });

  // If expired, disable broadcaster + token engine
  const tokenEnabled = enabled && !expired;

  const { windowTime, token } = useTokenEngine({
    sessionId: session?.sessionId,
    sessionSecret,
    tokenWindowSeconds: session?.tokenWindowSeconds,
    enabled: tokenEnabled,
  });

  const qrPayload = useMemo(() => {
    if (!session || !token || windowTime === null) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    const qrInterval = Number(session.qrRefreshIntervalSeconds) || 20;
    const qrTime = Math.floor(nowSec / qrInterval);

    return JSON.stringify({
      v: 1,
      sessionId: session.sessionId,
      windowTime,
      token,
      qrTime,
      qrRefreshIntervalSeconds: session.qrRefreshIntervalSeconds,
      tokenWindowSeconds: session.tokenWindowSeconds,
      allowedRadiusMeters: session.allowedRadiusMeters,
      teacherLat: session.teacherLat,
      teacherLng: session.teacherLng,
      maxGpsAccuracyMeters: session.maxGpsAccuracyMeters,
      locationMaxAgeSeconds: session.locationMaxAgeSeconds,
      issuedAt: new Date().toISOString(),
    });
  }, [session, token, windowTime]);

  async function startSession(values) {
    setError(null);
    setLoading(true);
    try {
      const s = await startSessionApi(values);
      setSession(s);
      // start returns secret for teacher
      setSessionSecret(s.sessionSecret || null);

      // if for some reason secret not included, fetch teacher-view
      if (!s.sessionSecret) {
        const tv = await getSessionTeacherViewApi(s.sessionId);
        setSession(tv);
        setSessionSecret(tv.sessionSecret || null);
      }

      setSetupOpen(false);
      setAttendance([]);
      setSummary(null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start session");
    } finally {
      setLoading(false);
    }
  }

  async function closeSession() {
    if (!session?.sessionId) return;
    setError(null);
    setLoading(true);
    try {
      await closeSessionApi(session.sessionId);
      // refresh teacher view
      const tv = await getSessionTeacherViewApi(session.sessionId);
      setSession(tv);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to close session");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAttendance() {
    if (!session?.sessionId) return;
    setError(null);
    try {
      const list = await listAttendanceBySessionApi(session.sessionId);
      setAttendance(list);
      const sum = await getSessionSummaryApi(session.sessionId);
      setSummary(sum);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to fetch attendance");
    }
  }

  // auto-refresh attendance every 5s while active
  useEffect(() => {
    if (!session?.sessionId || !enabled) return;
    const t = setInterval(refreshAttendance, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.sessionId, enabled]);

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Teacher Dashboard</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{user?.email} ({user?.role})</div>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 10 }}>{String(error)}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setSetupOpen(true)} disabled={loading || enabled}>
          {enabled ? "Session Active" : "Start Offline Session"}
        </button>
        <button onClick={closeSession} disabled={loading || !enabled}>
          Close Session
        </button>
        <button onClick={refreshAttendance} disabled={!session?.sessionId}>
          Refresh Attendance
        </button>
      </div>

      <OfflineSessionSetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSubmit={startSession}
      />

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <LiveSessionInfo session={session} remainingMs={remainingMs} expired={expired} />

        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>QR Code</div>
          {!enabled && <div style={{ fontSize: 12, opacity: 0.8 }}>Start a session to show QR.</div>}
          {expired && <div style={{ color: "crimson", marginBottom: 8 }}>Session expired.</div>}

          <QRCodeDisplay value={tokenEnabled ? qrPayload : null} />

          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div>windowTime: <b>{windowTime ?? "-"}</b></div>
            <div>token (first 10): <b>{token ? token.slice(0, 10) + "…" : "-"}</b></div>
            <div style={{ marginTop: 8, opacity: 0.8 }}>
              Students scan this QR if ultrasonic fails.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <UltrasonicBroadcaster enabled={tokenEnabled} />
      </div>

      <div style={{ marginTop: 16, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
        <div style={{ fontWeight: 800 }}>Attendance (Live)</div>
        {summary && (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Total: <b>{summary.totalAttendance}</b> | Avg Score: <b>{summary.avgConfidenceScore ?? "-"}</b>
          </div>
        )}

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>StudentId</th>
                <th>Score</th>
                <th>Distance(m)</th>
                <th>DeviceId</th>
                <th>Verified At</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.studentId + "_" + a.verifiedAt}>
                  <td>{a.studentId}</td>
                  <td>{a.confidenceScore}</td>
                  <td>{a.distanceMeters ?? "-"}</td>
                  <td>{a.deviceId ? String(a.deviceId).slice(0, 8) + "…" : "-"}</td>
                  <td>{String(a.verifiedAt)}</td>
                </tr>
              ))}
              {!attendance.length && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", opacity: 0.7 }}>
                    No attendance yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
