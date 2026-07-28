// Vercel Serverless Function - Store & Fetch Exams across devices with /tmp file persistence
import fs from 'fs';
import path from 'path';

const TMP_FILE = path.join('/tmp', 'exams_store.json');

function loadStore() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, 'utf8');
      return JSON.parse(data) || [];
    }
  } catch (e) {
    console.error('Error reading exams /tmp store:', e);
  }
  return [];
}

function saveStore(exams) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(exams, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing exams /tmp store:', e);
  }
}

let memoryStore = loadStore();

export default async function handler(req, res) {
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
      const exam = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (exam && exam.title) {
        exam.id = exam.id || `exam-${Date.now().toString(36)}`;
        exam.createdAt = exam.createdAt || new Date().toISOString();
        
        memoryStore = loadStore();
        // Remove existing duplicate if present
        memoryStore = memoryStore.filter(e => e.id !== exam.id);
        memoryStore.unshift(exam);
        saveStore(memoryStore);

        return res.status(200).json({ success: true, exam });
      }
      return res.status(400).json({ success: false, message: 'Invalid exam payload' });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === 'GET') {
    memoryStore = loadStore();
    return res.status(200).json({ success: true, exams: memoryStore });
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}

