/**
 * Dynamic 1-Minute Rotating Passcode Generator & Validator (TOTP Style)
 * Generates a 6-digit passcode that changes automatically every 60 seconds.
 */

// Simple deterministic hash to turn string + timestamp into 6-digit code
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate 6-digit passcode for a specific exam and minute window
 * @param {string} examId - ID of the exam
 * @param {number} epochMinute - Math.floor(Date.now() / 60000)
 */
export function getPasscodeForMinute(examId, epochMinute) {
  const seedStr = `EXAM_${examId}_TIME_${epochMinute}_SALT_SECURE_2026`;
  const rawHash = hashString(seedStr);
  const codeInt = (rawHash % 900000) + 100000; // Ensures 6 digits (100000 - 999999)
  return codeInt.toString();
}

/**
 * Gets current active 1-minute passcode and time metrics
 * @param {string} examId 
 */
export function getCurrentPasscodeState(examId = 'default') {
  const nowMs = Date.now();
  const currentMinute = Math.floor(nowMs / 60000);
  const secondsElapsed = Math.floor((nowMs % 60000) / 1000);
  const secondsRemaining = 60 - secondsElapsed;
  const currentCode = getPasscodeForMinute(examId, currentMinute);
  
  return {
    code: currentCode,
    secondsRemaining,
    secondsElapsed,
    currentMinute,
    progressPercentage: Math.round((secondsRemaining / 60) * 100)
  };
}

/**
 * Validates passcode provided by student against current or immediately preceding minute window
 * @param {string} examId 
 * @param {string} inputCode 
 */
export function validatePasscode(examId, inputCode) {
  if (!inputCode) return false;
  const cleanedCode = inputCode.trim();
  const currentMinute = Math.floor(Date.now() / 60000);
  
  // Check current minute passcode
  const currentCode = getPasscodeForMinute(examId, currentMinute);
  if (cleanedCode === currentCode) return true;
  
  // Check previous minute passcode (60s grace window)
  const prevCode = getPasscodeForMinute(examId, currentMinute - 1);
  if (cleanedCode === prevCode) return true;

  // Fallback for custom master override passcodes set by admin (e.g. "123456" or custom text)
  return false;
}
