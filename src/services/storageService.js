/**
 * Storage Service - Database & Local State Management for ProctorAI
 * Integrated with Vercel Serverless API for Automatic Cross-Device Student Sync!
 */

const STORAGE_KEYS = {
  ADMIN_SETTINGS: 'proctorai_admin_settings',
  EXAMS: 'proctorai_exams',
  SUBMISSIONS: 'proctorai_submissions',
  VIOLATIONS: 'proctorai_violations'
};

// Initial Seed Data
const DEFAULT_SETTINGS = {
  adminPassword: 'admin', 
  opencodeApiKey: '',
  opencodeBaseUrl: 'https://integrate.api.nvidia.com/v1',
  opencodeModel: 'meta/llama-3.1-405b-instruct',
  maxWarningsAllowed: 2,
  cloudSyncUrl: ''
};

const DEFAULT_EXAMS = [];


// Helper: Read LocalStorage with JSON parse
function readStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading storage key ${key}:`, e);
    return fallback;
  }
}

// Helper: Write LocalStorage with JSON stringify
function writeStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing storage key ${key}:`, e);
  }
}

/* ==================== ADMIN SETTINGS & AUTH ==================== */
export function getAdminSettings() {
  return readStorage(STORAGE_KEYS.ADMIN_SETTINGS, DEFAULT_SETTINGS);
}

export function saveAdminSettings(settings) {
  const current = getAdminSettings();
  const updated = { ...current, ...settings };
  writeStorage(STORAGE_KEYS.ADMIN_SETTINGS, updated);
  return updated;
}

export function verifyAdminPassword(inputPassword) {
  const settings = getAdminSettings();
  const validPassword = settings.adminPassword || 'admin';
  return inputPassword && inputPassword.trim() === validPassword.trim();
}

/* ==================== EXAM MANAGEMENT ==================== */
export function getAllExams() {
  return readStorage(STORAGE_KEYS.EXAMS, DEFAULT_EXAMS);
}

export function getExamById(id) {
  const exams = getAllExams();
  return exams.find(e => e.id === id) || null;
}

export function saveExam(examData) {
  const exams = getAllExams();
  const newExam = {
    id: `exam-${Date.now().toString(36)}`,
    title: examData.title || 'Untitled Exam',
    topic: examData.topic || 'General Science',
    questionCount: parseInt(examData.questionCount, 10) || 10,
    difficulty: examData.difficulty || 'Medium',
    useDynamicPasscode: examData.useDynamicPasscode ?? true,
    staticPasscode: examData.staticPasscode || '123456',
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  };

  const updatedExams = [newExam, ...exams];
  writeStorage(STORAGE_KEYS.EXAMS, updatedExams);

  // Sync exam to Vercel API backend
  syncExamToVercelAPI(newExam);

  return newExam;
}

export function deleteExam(examId) {
  const exams = getAllExams();
  const updated = exams.filter(e => e.id !== examId);
  writeStorage(STORAGE_KEYS.EXAMS, updated);
}

/* ==================== SUBMISSIONS & PROCTOR LOGS ==================== */
export function getAllSubmissions() {
  return readStorage(STORAGE_KEYS.SUBMISSIONS, []);
}

export function getSubmissionsByExam(examId) {
  const submissions = getAllSubmissions();
  return submissions.filter(s => s.examId === examId);
}

export function saveSubmission(submission) {
  const submissions = getAllSubmissions();
  const newSubmission = {
    id: `sub-${Date.now().toString(36)}`,
    submittedAt: new Date().toISOString(),
    ...submission
  };
  const updated = [newSubmission, ...submissions];
  writeStorage(STORAGE_KEYS.SUBMISSIONS, updated);

  // Sync student submission to Vercel Serverless API backend so Admin sees it across all devices!
  syncSubmissionToVercelAPI(newSubmission);

  return newSubmission;
}

export function deleteSubmission(submissionId) {
  const submissions = getAllSubmissions();
  const updated = submissions.filter(s => s.id !== submissionId);
  writeStorage(STORAGE_KEYS.SUBMISSIONS, updated);
  return updated;
}

/* ==================== AUTOMATIC VERCEL BACKEND SYNC ==================== */
async function syncSubmissionToVercelAPI(submissionData) {
  try {
    const settings = getAdminSettings();
    const endpoint = settings.cloudSyncUrl || '/api/submissions';

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData)
    });
  } catch (err) {
    console.warn('Vercel submission sync:', err.message);
  }
}

async function syncExamToVercelAPI(examData) {
  try {
    const settings = getAdminSettings();
    const endpoint = settings.cloudSyncUrl ? `${settings.cloudSyncUrl}/exams` : '/api/exams';

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData)
    });
  } catch (err) {
    console.warn('Vercel exam sync:', err.message);
  }
}

/**
 * Fetch remote exams from Vercel Serverless API backend to merge into Admin & Student view across all devices!
 */
export async function fetchRemoteExams() {
  try {
    const settings = getAdminSettings();
    const endpoint = settings.cloudSyncUrl ? `${settings.cloudSyncUrl}/exams` : '/api/exams';

    const response = await fetch(endpoint);
    if (response.ok) {
      const data = await response.json();
      const remoteList = data.exams || (Array.isArray(data) ? data : []);

      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const local = getAllExams();
        const mergedMap = new Map();
        [...DEFAULT_EXAMS, ...local, ...remoteList].forEach(item => {
          if (item.id) mergedMap.set(item.id, item);
        });
        const mergedList = Array.from(mergedMap.values());
        writeStorage(STORAGE_KEYS.EXAMS, mergedList);
        return mergedList;
      }
    }
  } catch (e) {
    console.warn('Vercel remote exams fetch fallback:', e.message);
  }

  return getAllExams();
}

/**
 * Fetch remote student submissions from Vercel Serverless API backend to merge into Admin view!
 */
export async function fetchRemoteSubmissions() {
  try {
    const settings = getAdminSettings();
    const endpoint = settings.cloudSyncUrl || '/api/submissions';

    const response = await fetch(endpoint);
    if (response.ok) {
      const data = await response.json();
      const remoteList = data.submissions || (Array.isArray(data) ? data : []);

      if (Array.isArray(remoteList) && remoteList.length > 0) {
        const local = getAllSubmissions();
        const mergedMap = new Map();
        [...local, ...remoteList].forEach(item => {
          if (item.id) mergedMap.set(item.id, item);
        });
        const mergedList = Array.from(mergedMap.values());
        writeStorage(STORAGE_KEYS.SUBMISSIONS, mergedList);
        return mergedList;
      }
    }
  } catch (e) {
    console.warn('Vercel remote fetch fallback:', e.message);
  }

  return getAllSubmissions();
}

/* ==================== SECURITY VIOLATION AUDIT ==================== */
export function logViolationEvent({ studentName, registerNo, examId, type, details }) {
  const violations = readStorage(STORAGE_KEYS.VIOLATIONS, []);
  const entry = {
    id: `viol-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    studentName,
    registerNo,
    examId,
    type, // 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'BLUR'
    details: details || 'Proctoring rule violation detected'
  };
  const updated = [entry, ...violations];
  writeStorage(STORAGE_KEYS.VIOLATIONS, updated);
  return entry;
}

export function getViolationsByStudent(registerNo, examId) {
  const violations = readStorage(STORAGE_KEYS.VIOLATIONS, []);
  return violations.filter(v => v.registerNo === registerNo && v.examId === examId);
}
