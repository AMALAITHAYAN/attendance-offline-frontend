// SHA-256 (hex) using Web Crypto API
export async function sha256Hex(input) {
  const enc = new TextEncoder();
  const buf = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
