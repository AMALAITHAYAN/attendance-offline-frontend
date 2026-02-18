import React, { useEffect, useState } from "react";

export default function OfflineSessionSetupModal({ open, initialValues, onClose, onSubmit }) {
  const [form, setForm] = useState(
    initialValues || {
      qrRefreshIntervalSeconds: 20,
      tokenWindowSeconds: 20,
      allowedRadiusMeters: 50,
      durationMinutes: 5,
      maxGpsAccuracyMeters: 50,
      locationMaxAgeSeconds: 30,
      teacherLat: null,
      teacherLng: null,
    }
  );

  useEffect(() => {
    if (initialValues) setForm((p) => ({ ...p, ...initialValues }));
  }, [initialValues]);

  if (!open) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 999,
      }}
    >
      <div style={{ background: "#fff", width: 520, maxWidth: "100%", padding: 16, borderRadius: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Start Offline Session</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          Teacher sets QR refresh, token window, radius and duration.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <label style={{ fontSize: 12 }}>
            QR Interval (sec)
            <input
              type="number"
              min={5}
              max={120}
              value={form.qrRefreshIntervalSeconds}
              onChange={(e) => set("qrRefreshIntervalSeconds", Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ fontSize: 12 }}>
            Token Window (sec)
            <input
              type="number"
              min={5}
              max={120}
              value={form.tokenWindowSeconds}
              onChange={(e) => set("tokenWindowSeconds", Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ fontSize: 12 }}>
            Allowed Radius (meters)
            <input
              type="number"
              min={5}
              max={500}
              value={form.allowedRadiusMeters}
              onChange={(e) => set("allowedRadiusMeters", Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ fontSize: 12 }}>
            Duration (minutes)
            <input
              type="number"
              min={1}
              max={180}
              value={form.durationMinutes}
              onChange={(e) => set("durationMinutes", Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ fontSize: 12 }}>
            Max GPS Accuracy (m)
            <input
              type="number"
              min={5}
              max={200}
              value={form.maxGpsAccuracyMeters}
              onChange={(e) => set("maxGpsAccuracyMeters", Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ fontSize: 12 }}>
            Location Max Age (sec)
            <input
              type="number"
              min={5}
              max={300}
              value={form.locationMaxAgeSeconds}
              onChange={(e) => set("locationMaxAgeSeconds", Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.85 }}>
            Teacher location will be captured automatically when you click “Use My Location”.
          </div>

          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  set("teacherLat", pos.coords.latitude);
                  set("teacherLng", pos.coords.longitude);
                },
                () => {}
              );
            }}
          >
            Use My Location
          </button>

          <div style={{ fontSize: 12, alignSelf: "center" }}>
            Lat/Lng: {form.teacherLat?.toFixed?.(5) ?? "-"} , {form.teacherLng?.toFixed?.(5) ?? "-"}
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit?.(form)}
            style={{ fontWeight: 700 }}
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}
