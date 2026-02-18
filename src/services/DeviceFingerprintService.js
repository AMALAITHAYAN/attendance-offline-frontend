export function getOrCreateDeviceId() {
  const key = "deviceId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}_${Math.random()}`).toString();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getDeviceFingerprint() {
  const userAgent = navigator.userAgent;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const deviceId = getOrCreateDeviceId();
  return { userAgent, screenResolution, deviceId };
}
