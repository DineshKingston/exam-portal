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
 * Detect Device Details (Mobile vs Desktop, Phone Brand/Model, OS, Browser, Screen Size)
 */
export function getDeviceDetails() {
  const ua = navigator.userAgent || '';
  let isMobile = /mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile/i.test(ua);
  let isTablet = /tablet|ipad|playbook|silk/i.test(ua);
  let deviceCategory = isMobile ? 'Mobile' : (isTablet ? 'Tablet' : 'Desktop');

  let os = 'Unknown OS';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone/i.test(ua)) os = 'iPhone / iOS';
  else if (/ipad/i.test(ua)) os = 'iPad / iPadOS';
  else if (/cros/i.test(ua)) os = 'ChromeOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/ucbrowser/i.test(ua)) browser = 'UC Browser';

  // Comprehensive Mobile Brands Matcher
  let brandName = '';
  const brandPatterns = [
    { brand: 'Vivo', regex: /\b(vivo|iqoo|v2[0-9]{3}|v1[0-9]{3}|v3[0-9]{3})\b/i },
    { brand: 'Oppo', regex: /\b(oppo|cph[0-9]{4}|pexm[0-9]{2})\b/i },
    { brand: 'Realme', regex: /\b(realme|rmx[0-9]{4})\b/i },
    { brand: 'Samsung', regex: /\b(samsung|sm-[a-z0-9]+|galaxy)\b/i },
    { brand: 'Xiaomi', regex: /\b(xiaomi|redmi|poco|mi\s[0-9]+|2[0-9]{7}[a-z]+)\b/i },
    { brand: 'OnePlus', regex: /\b(oneplus|nord|in20[0-9]{2}|ne22[0-9]{2}|cph24[0-9]{2})\b/i },
    { brand: 'Apple iPhone', regex: /\b(iphone)\b/i },
    { brand: 'Apple iPad', regex: /\b(ipad)\b/i },
    { brand: 'Google Pixel', regex: /\b(pixel\s?[0-9a-z]*)\b/i },
    { brand: 'Motorola', regex: /\b(moto|motorola)\b/i },
    { brand: 'Nothing', regex: /\b(nothing|a063|a065)\b/i },
    { brand: 'Infinix', regex: /\b(infinix|x[0-9]{3,4})\b/i },
    { brand: 'Tecno', regex: /\b(tecno)\b/i },
    { brand: 'Lava', regex: /\b(lava)\b/i },
    { brand: 'Micromax', regex: /\b(micromax)\b/i },
    { brand: 'Nokia', regex: /\b(nokia)\b/i },
    { brand: 'Honor', regex: /\b(honor)\b/i },
    { brand: 'Huawei', regex: /\b(huawei|mate|p[0-9]{2})\b/i },
    { brand: 'Asus', regex: /\b(asus|rog)\b/i },
    { brand: 'Lenovo', regex: /\b(lenovo)\b/i },
    { brand: 'Sony', regex: /\b(xperia|sony)\b/i },
    { brand: 'ZTE', regex: /\b(zte|nubia)\b/i },
    { brand: 'LG', regex: /\b(lg-|\blg\b)\b/i },
    { brand: 'Itel', regex: /\b(itel)\b/i }
  ];

  for (const b of brandPatterns) {
    if (b.regex.test(ua)) {
      brandName = b.brand;
      break;
    }
  }

  // Universal Android Hardware Model Code Extractor (e.g. "; V2205 Build/" or "; CPH2381 Build/")
  let hardwareModel = '';
  const androidModelMatch = ua.match(/;\s*([A-Za-z0-9\s_\-]{3,25})\s*Build\//i) || ua.match(/Android[^;]+;\s*([^;)]+)/i);
  if (androidModelMatch && androidModelMatch[1]) {
    const raw = androidModelMatch[1].trim();
    if (!/Linux|Android|wv|K|Build/i.test(raw) || raw.length > 4) {
      hardwareModel = raw;
    }
  }

  let finalDeviceLabel = deviceCategory;

  if (brandName && hardwareModel) {
    if (hardwareModel.toLowerCase().includes(brandName.toLowerCase())) {
      finalDeviceLabel = hardwareModel;
    } else {
      finalDeviceLabel = `${brandName} (${hardwareModel})`;
    }
  } else if (brandName) {
    finalDeviceLabel = `${brandName} ${deviceCategory}`;
  } else if (hardwareModel) {
    finalDeviceLabel = `${deviceCategory} (${hardwareModel})`;
  } else if (isMobile) {
    finalDeviceLabel = `Mobile (${os})`;
  } else if (isTablet) {
    finalDeviceLabel = `Tablet (${os})`;
  } else {
    finalDeviceLabel = `Desktop (${os})`;
  }

  const screenResolution = `${window.screen.width}x${window.screen.height}`;

  return {
    deviceType: finalDeviceLabel,
    rawDeviceCategory: deviceCategory,
    os,
    browser,
    screenResolution,
    userAgent: ua,
    deviceFingerprint: getDeviceFingerprint()
  };
}

/**
 * Get comprehensive student device & telemetry payload (with async high-entropy model enhancement)
 */
export async function getStudentTelemetryPayload() {
  const ip = await getStudentIpAddress();
  const details = getDeviceDetails();

  // Try Modern UserAgentData API for exact model if supported by client browser
  if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
    try {
      const hints = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
      if (hints && hints.model && hints.model.trim()) {
        const cleanModel = hints.model.trim();
        if (cleanModel !== 'Unknown' && !details.deviceType.includes(cleanModel)) {
          details.deviceType = `${details.deviceType} [${cleanModel}]`;
        }
      }
    } catch (e) {
      // Ignore if userAgentData is blocked
    }
  }

  return {
    ip,
    ...details,
    capturedAt: new Date().toISOString()
  };
}

