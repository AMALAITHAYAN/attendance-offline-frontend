import React from "react";
import QRCode from "react-qr-code";

export default function QRCodeDisplay({ value }) {
  if (!value) return null;
  return (
    <div style={{ background: "white", padding: 8, display: "inline-block" }}>
      <QRCode value={value} size={220} />
    </div>
  );
}
