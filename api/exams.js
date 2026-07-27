// Vercel Serverless Function - Store & Fetch Exams across devices
let globalExamsStore = [];

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
        globalExamsStore.unshift(exam);
        return res.status(200).json({ success: true, exam });
      }
      return res.status(400).json({ success: false, message: 'Invalid exam payload' });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, exams: globalExamsStore });
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
