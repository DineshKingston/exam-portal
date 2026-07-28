// Vercel Serverless Function - Fetch Available AI Models Server-Side
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
    const queryKey = req.query.apiKey || '';
    const apiKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : queryKey;

    let baseUrl = req.query.baseUrl || req.body?.baseUrl || 'https://integrate.api.nvidia.com/v1';
    baseUrl = baseUrl.replace(/\/+$/, '');

    const fetchHeaders = {
      'Content-Type': 'application/json'
    };

    if (apiKey && apiKey.trim()) {
      fetchHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: fetchHeaders
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        success: false,
        message: `Upstream API returned HTTP ${response.status}: ${errText.slice(0, 100)}`
      });
    }

    const data = await response.json();
    const rawList = data.data || data.models || (Array.isArray(data) ? data : []);

    if (Array.isArray(rawList) && rawList.length > 0) {
      const models = rawList.map(item => {
        if (typeof item === 'string') return { id: item, name: item };
        return {
          id: item.id || item.name || item.model || 'unknown-model',
          name: item.name || item.id || item.display_name || item.id
        };
      });
      return res.status(200).json({ success: true, models });
    }

    return res.status(200).json({ success: false, message: 'No models array found in upstream response', models: [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, models: [] });
  }
}
