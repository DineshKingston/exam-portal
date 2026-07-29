/**
 * Device & Network Telemetry Service
 * Captures student IP address, mobile/desktop device model, browser, OS, and screen resolution.
 */

// Cache client IP in memory during active session
let cachedIp = null;

/**
 * Fetch Public IP Address of the student
 */
export async function getStudentIpAddress() {
  if (cachedIp) return cachedIp;

  // Try 1: Fetch from ipify API
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedIp = data.ip;
        return cachedIp;
      }
    }
  } catch (e) {
    // Continue to next tier
  }

  // Try 2: Fetch from ipapi fallback
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedIp = data.ip;
        return cachedIp;
      }
    }
  } catch (e) {
    // Fallback
  }

  return 'Local / Private Network';
}

/**
 * Generate or retrieve persistent Device Fingerprint ID
 */
export function getDeviceFingerprint() {
  let fp = localStorage.getItem('proctorai_device_fp');
  if (!fp) {
    fp = `dev-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem('proctorai_device_fp', fp);
  }
  return fp;
}

/**
 * Detect Device Details (Mobile vs Desktop, OS, Browser, Screen Size)
 */
export function getDeviceDetails() {
  const ua = navigator.userAgent || '';
  let deviceType = 'Desktop';
  if (/mobile/i.test(ua)) deviceType = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'Tablet';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

  const screenResolution = `${window.screen.width}x${window.screen.height}`;

  return {
    deviceType,
    os,
    browser,
    screenResolution,
    userAgent: ua,
    deviceFingerprint: getDeviceFingerprint()
  };
}

/**
 * Get comprehensive student device & telemetry payload
 */
export async function getStudentTelemetryPayload() {
  const ip = await getStudentIpAddress();
  const details = getDeviceDetails();

  return {
    ip,
    ...details,
    capturedAt: new Date().toISOString()
  };
}
