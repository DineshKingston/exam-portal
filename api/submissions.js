// Vercel Serverless Function - Store & Fetch Student Submissions across all student devices
let globalSubmissionsStore = [];

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
        
        // Push to global submissions store
        globalSubmissionsStore.unshift(submission);
        
        return res.status(200).json({ success: true, submission, total: globalSubmissionsStore.length });
      }
      return res.status(400).json({ success: false, message: 'Invalid submission payload' });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, submissions: globalSubmissionsStore });
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
