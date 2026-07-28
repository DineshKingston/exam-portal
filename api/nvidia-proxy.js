// Vercel Serverless Function - NVIDIA / OpenCode API Proxy
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const authHeader = req.headers.authorization || '';
    const path = req.query.path || '/chat/completions';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    let baseUrl = req.query.baseUrl || req.body?.baseUrl || 'https://integrate.api.nvidia.com/v1';
    baseUrl = baseUrl.replace(/\/+$/, '');

    const targetUrl = `${baseUrl}${cleanPath}`;

    const fetchHeaders = {
      'Content-Type': 'application/json'
    };

    if (authHeader) {
      fetchHeaders['Authorization'] = authHeader;
    }

    const fetchOptions = {
      method: req.method,
      headers: fetchHeaders
    };

    if (req.method === 'POST' && req.body) {
      const bodyCopy = { ...req.body };
      delete bodyCopy.baseUrl; 
      fetchOptions.body = JSON.stringify(bodyCopy);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json().catch(() => null);

    if (response.ok && data) {
      return res.status(200).json(data);
    } else {
      return res.status(response.status).json(data || { error: `Proxy received HTTP ${response.status}` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
