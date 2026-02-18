import { offlineSyncApi } from "../api/syncApi";
import { listOfflineAttendance, removeOfflineAttendance } from "./LocalAttendanceStore";

export async function syncAllPending() {
  const pending = await listOfflineAttendance();
  if (!pending.length) {
    return { accepted: 0, rejected: 0, results: [], message: "No pending records" };
  }

  // Backend expects fields of OfflineAttendanceRequest
  const payload = pending.map((p) => ({
    studentId: p.studentId,
    sessionId: p.sessionId,
    windowTime: p.windowTime,
    token: p.token,
    proof: p.proof,
    confidenceScore: p.confidenceScore,
    userAgent: p.userAgent,
    screenResolution: p.screenResolution,
    deviceId: p.deviceId,
    studentLat: p.studentLat,
    studentLng: p.studentLng,
    gpsAccuracyMeters: p.gpsAccuracyMeters,
    locationCapturedAt: p.locationCapturedAt,
    verifiedAt: p.verifiedAt,
  }));

  const res = await offlineSyncApi(payload);

  const acceptedPairs = new Set(
    (res?.results || [])
      .filter((r) => (r.status || "").toUpperCase() === "ACCEPTED")
      .map((r) => `${r.studentId}__${r.sessionId}`)
  );

  // If server didn't return per-item results but accepted > 0, remove all
  if ((!res?.results || !res.results.length) && (res?.accepted || 0) > 0) {
    for (const p of pending) {
      await removeOfflineAttendance(p.id);
    }
    return res;
  }

  for (const p of pending) {
    const key = `${p.studentId}__${p.sessionId}`;
    if (acceptedPairs.has(key)) {
      await removeOfflineAttendance(p.id);
    }
  }

  return res;
}
