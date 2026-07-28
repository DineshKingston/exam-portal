// Vercel Serverless Function - Store & Fetch Student Submissions across all student devices with /tmp persistence
import fs from 'fs';
import path from 'path';

const TMP_FILE = path.join('/tmp', 'submissions_store.json');

function loadStore() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, 'utf8');
      return JSON.parse(data) || [];
    }
  } catch (e) {
    console.error('Error reading submissions /tmp store:', e);
  }
  return [];
}

function saveStore(submissions) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(submissions, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing submissions /tmp store:', e);
  }
}

let memoryStore = loadStore();

export default async function handler(req, res) {
  // Enable CORS headers for cross-device access
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const submission = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (submission && submission.studentName) {
        submission.id = submission.id || `sub-${Date.now().toString(36)}`;
        submission.submittedAt = submission.submittedAt || new Date().toISOString();
        
        memoryStore = loadStore();
        // Avoid duplicate ID
        memoryStore = memoryStore.filter(s => s.id !== submission.id);
        memoryStore.unshift(submission);
        saveStore(memoryStore);
        
        return res.status(200).json({ success: true, submission, total: memoryStore.length });
      }
      return res.status(400).json({ success: false, message: 'Invalid submission payload' });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === 'GET') {
    memoryStore = loadStore();
    return res.status(200).json({ success: true, submissions: memoryStore });
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}

