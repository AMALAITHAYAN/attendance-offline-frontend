import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import UltrasonicListener from "../components/UltrasonicListener";
import QRCodeScanner from "../components/QRCodeScanner";
import { distanceMeters } from "../utils/geo";
import { sha256Hex } from "../utils/hash";
import { toLocalDateTimeString } from "../utils/time";
import { getDeviceFingerprint } from "../services/DeviceFingerprintService";
import { saveOfflineAttendance, listOfflineAttendance } from "../services/LocalAttendanceStore";
import { syncAllPending } from "../services/PendingSyncManager";

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  const defaultStudentId = user?.id ? String(user.id) : user?.email;

  const [studentId, setStudentId] = useState(defaultStudentId || "");
  const [ultraDetected, setUltraDetected] = useState(false);

  const [qrRaw, setQrRaw] = useState(null);
  const [qrError, setQrError] = useState(null);

  const [location, setLocation] = useState(null); // {lat,lng,accuracy,capturedAt}
  const [locError, setLocError] = useState(null);

  const [statusMsg, setStatusMsg] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const parsedQr = useMemo(() => {
    if (!qrRaw) return null;
    try {
      // QR payload is JSON from teacher
      const obj = JSON.parse(qrRaw);
      return obj;
    } catch {
      return null;
    }
  }, [qrRaw]);

  const checks = useMemo(() => {
    if (!parsedQr) return { ok: false, issues: ["Scan QR"], score: 0 };

    const issues = [];

    const nowSec = Math.floor(Date.now() / 1000);
    const tokenWindow = Number(parsedQr.tokenWindowSeconds) || 20;
    const expectedWindowTime = Math.floor(nowSec / tokenWindow);

    // Token window freshness check (client-side)
    const wt = Number(parsedQr.windowTime);
    if (!Number.isFinite(wt) || Math.abs(wt - expectedWindowTime) > 1) {
      issues.push("Token time-window mismatch (refresh QR)");
    }

    // QR refresh check (client-side)
    const qrInterval = Number(parsedQr.qrRefreshIntervalSeconds) || 20;
    const expectedQrTime = Math.floor(nowSec / qrInterval);
    const qt = Number(parsedQr.qrTime);
    if (!Number.isFinite(qt) || Math.abs(qt - expectedQrTime) > 1) {
      issues.push("QR is old (refresh QR)");
    }

    // Location checks
    let dist = null;
    let locOk = false;
    if (location?.lat != null && location?.lng != null && parsedQr.teacherLat != null && parsedQr.teacherLng != null) {
      dist = distanceMeters(parsedQr.teacherLat, parsedQr.teacherLng, location.lat, location.lng);
      const radius = Number(parsedQr.allowedRadiusMeters) || 50;
      if (dist != null && dist <= radius) {
        locOk = true;
      } else {
        issues.push(`Outside radius (${radius}m)`);
      }

      const maxAcc = parsedQr.maxGpsAccuracyMeters;
      if (maxAcc != null && location.accuracy != null && Number(location.accuracy) > Number(maxAcc)) {
        issues.push(`GPS accuracy too low (>${maxAcc}m)`);
        locOk = false;
      }

      const maxAge = parsedQr.locationMaxAgeSeconds;
      if (maxAge != null && location.capturedAt) {
        const ageSec = Math.abs((Date.now() - new Date(location.capturedAt).getTime()) / 1000);
        if (ageSec > Number(maxAge)) {
          issues.push(`Location too old (>${maxAge}s)`);
          locOk = false;
        }
      }
    } else {
      issues.push("Capture location");
    }

    // Confidence score (demo)
    let score = 0;
    // QR success
    score += parsedQr?.token ? 30 : 0;
    // Ultrasonic detection bonus
    score += ultraDetected ? 40 : 0;
    // Location bonus
    score += locOk ? 30 : 0;

    // Hard reject if token freshness fails
    const tokenOk = !issues.some((x) => x.toLowerCase().includes("time-window") || x.toLowerCase().includes("qr is old"));
    const ok = tokenOk && score >= 60;

    return { ok, issues, score, dist };
  }, [parsedQr, location, ultraDetected]);

  async function captureLocation() {
    setLocError(null);
    setLocation(null);

    if (!navigator.geolocation) {
      setLocError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
      },
      (err) => {
        setLocError(err?.message || "Location failed");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function markAttendanceOffline() {
    setStatusMsg(null);

    if (!studentId.trim()) {
      setStatusMsg("StudentId is required");
      return;
    }
    if (!parsedQr?.sessionId || !parsedQr?.token || parsedQr.windowTime == null) {
      setStatusMsg("Scan the teacher QR first");
      return;
    }

    // Duplicate guard (local)
    const all = await listOfflineAttendance();
    const exists = all.some((x) => x.studentId === studentId.trim() && x.sessionId === parsedQr.sessionId);
    if (exists) {
      setStatusMsg("Duplicate attempt (already saved offline)");
      return;
    }

    const fp = getDeviceFingerprint();
    const proof = await sha256Hex(`${studentId.trim()}:${parsedQr.sessionId}:${parsedQr.token}:${fp.deviceId || ""}`);

    // verifiedAt & locationCapturedAt must be ISO_LOCAL_DATE_TIME (no Z) for Spring LocalDateTime
    const verifiedAt = toLocalDateTimeString(new Date());
    const locationCapturedAt = location?.capturedAt ? toLocalDateTimeString(new Date(location.capturedAt)) : null;

    const record = {
      id: `${parsedQr.sessionId}_${studentId.trim()}`,
      studentId: studentId.trim(),
      sessionId: parsedQr.sessionId,
      windowTime: Number(parsedQr.windowTime),
      token: parsedQr.token,
      proof,
      confidenceScore: checks.score,
      userAgent: fp.userAgent,
      screenResolution: fp.screenResolution,
      deviceId: fp.deviceId,
      studentLat: location?.lat ?? null,
      studentLng: location?.lng ?? null,
      gpsAccuracyMeters: location?.accuracy ?? null,
      locationCapturedAt,
      verifiedAt,
    };

    await saveOfflineAttendance(record);

    setStatusMsg(`Saved offline. Score=${checks.score}. Now click Sync.`);

    const after = await listOfflineAttendance();
    setPendingCount(after.length);
  }

  async function doSync() {
    setStatusMsg(null);
    try {
      const res = await syncAllPending();
      setStatusMsg(`Sync done. Accepted=${res.accepted} Rejected=${res.rejected}`);
      const after = await listOfflineAttendance();
      setPendingCount(after.length);
    } catch (e) {
      setStatusMsg(e?.response?.data?.message || "Sync failed (check backend running + login)" );
    }
  }

  async function refreshPending() {
    const after = await listOfflineAttendance();
    setPendingCount(after.length);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Student Dashboard</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{user?.email} ({user?.role})</div>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12 }}>Student Id used for attendance</label>
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ width: 320 }} />
      </div>

      {statusMsg && <div style={{ marginBottom: 10, color: statusMsg.toLowerCase().includes("failed") ? "crimson" : "#0a6" }}>{String(statusMsg)}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <UltrasonicListener enabled={true} onDetected={(v) => setUltraDetected(!!v)} />

        <QRCodeScanner
          enabled={true}
          onScan={(txt) => {
            setQrError(null);
            setQrRaw(txt);
          }}
          onError={() => {}}
        />
      </div>

      {qrError && <div style={{ color: "crimson", marginTop: 10 }}>{String(qrError)}</div>}

      <div style={{ marginTop: 12, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
        <div style={{ fontWeight: 800 }}>Step: Location</div>
        <button onClick={captureLocation}>Capture Location</button>
        {locError && <span style={{ color: "crimson", marginLeft: 8 }}>{String(locError)}</span>}
        {location && (
          <div style={{ marginTop: 8, fontSize: 12 }}>
            lat/lng: <b>{location.lat.toFixed(5)}</b>, <b>{location.lng.toFixed(5)}</b> | accuracy: <b>{Math.round(location.accuracy)}m</b>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
        <div style={{ fontWeight: 800 }}>Validation & Score</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>
          QR scanned: <b>{parsedQr ? "YES" : "NO"}</b> | Ultrasonic: <b>{ultraDetected ? "YES" : "NO"}</b>
          {checks.dist != null && (
            <>
              {" "}| Distance: <b>{Math.round(checks.dist)}m</b>
            </>
          )}
        </div>
        <div style={{ marginTop: 8 }}>
          Score: <b>{checks.score}</b> | Result: <b style={{ color: checks.ok ? "#0a6" : "crimson" }}>{checks.ok ? "VERIFIED" : "NOT VERIFIED"}</b>
        </div>
        {!checks.ok && (
          <ul style={{ marginTop: 8 }}>
            {(checks.issues || []).map((x) => (
              <li key={x} style={{ fontSize: 12 }}>{x}</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={markAttendanceOffline} disabled={!parsedQr || !location}>
          Save Attendance Offline
        </button>
        <button onClick={doSync}>Sync to Backend</button>
        <button onClick={refreshPending}>Refresh Pending</button>
        <div style={{ alignSelf: "center", fontSize: 12, opacity: 0.8 }}>Pending: {pendingCount}</div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85 }}>
        Notes: For backend validation, the proof = SHA256(studentId:sessionId:token:deviceId). Token and windowTime are validated on server.
      </div>
    </div>
  );
}
