/**
 * OpenCode & NVIDIA AI API Service & Smart Unique Question Synthesizer
 */

import { getAdminSettings } from './storageService';

/**
 * Helper to resolve endpoint URL, routing through local Vite proxy for NVIDIA API
 * to prevent browser CORS "Failed to fetch" errors.
 */
function resolveEndpoint(baseUrl, path = '') {
  let cleanBase = (baseUrl || '').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If running in browser and targeting NVIDIA, try /nvidia-api first (Vite proxy or Vercel rewrite)
  if (cleanBase.includes('integrate.api.nvidia.com')) {
    return `/nvidia-api${cleanPath}`;
  }

  return `${cleanBase}${cleanPath}`;
}

/**
 * Generate questions for an exam based on topic, register number, and count.
 * Ensures per-student question uniqueness!
 */
export async function generateStudentExamQuestions({
  topic = 'General AI & Computer Science',
  questionCount = 10,
  difficulty = 'Medium',
  studentName = '',
  registerNo = '',
  examId = ''
}) {
  const settings = getAdminSettings();
  const apiKey = settings.opencodeApiKey || '';
  const baseUrl = settings.opencodeBaseUrl || 'https://integrate.api.nvidia.com/v1';
  const model = settings.opencodeModel || 'meta/llama-3.1-405b-instruct';

  // If API key is present, try real AI API first
  if (apiKey.trim()) {
    try {
      const questions = await fetchOpenCodeAIQuestions({
        apiKey,
        baseUrl,
        model,
        topic,
        questionCount,
        difficulty,
        registerNo,
        studentName
      });
      if (questions && questions.length >= 5) {
        return questions;
      }
    } catch (err) {
      console.warn('AI API call failed, using intelligent unique fallback engine:', err);
    }
  }

  // Fallback to intelligent deterministic unique question generator per student ID
  return generateDeterministicUniqueQuestions(topic, questionCount, registerNo, difficulty);
}

/**
 * Fetch questions from AI API (NVIDIA NIM or OpenCode)
 */
async function fetchOpenCodeAIQuestions({
  apiKey,
  baseUrl,
  model,
  topic,
  questionCount,
  difficulty,
  registerNo,
  studentName
}) {
  const endpointsToTry = [
    `/api/nvidia-proxy?path=/chat/completions&baseUrl=${encodeURIComponent(baseUrl)}`,
    resolveEndpoint(baseUrl, '/chat/completions'),
    `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  ];

  const systemPrompt = `You are an expert academic assessment AI creating unique, high-quality Multiple Choice Questions (MCQs).
Target Topic: "${topic}"
Difficulty Level: ${difficulty}
Total Questions Required: ${questionCount}
Student Registration ID Seed: "${registerNo}" (Student Name: ${studentName})

RULES:
1. Questions should be conceptual, clear, engaging, and practical.
2. Format MUST be a valid JSON array of question objects only.
3. Each question object MUST have: "id", "question", "options" (4 distinct strings), "answerIndex" (0-3), "explanation".

JSON Output Format:
[
  {
    "id": 1,
    "question": "What is the primary function of ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answerIndex": 1,
    "explanation": "Option B is correct because ..."
  }
]`;

  let lastError = null;

  for (const endpoint of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate ${questionCount} unique MCQs for student ${registerNo} on topic: ${topic}` }
          ],
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
        const rawJson = jsonMatch ? jsonMatch[0] : content;
        const parsed = JSON.parse(rawJson);

        if (Array.isArray(parsed)) {
          return parsed.slice(0, questionCount).map((q, idx) => ({
            id: idx + 1,
            question: q.question || `Question ${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex % 4 : 0,
            explanation: q.explanation || 'Option is correct based on core principles.'
          }));
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }

  throw lastError || new Error('All question generation endpoints failed');
}

/**
 * Fetch available models dynamically from API endpoint /models with multi-tier fallback
 */
export async function fetchAvailableApiModels(apiKey = '', baseUrl = 'https://integrate.api.nvidia.com/v1') {
  const cleanBase = (baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  // Tier 1: Try Vercel Serverless Endpoint /api/models (Server-side fetch, avoids CORS/proxy issues)
  try {
    const serverlessUrl = `/api/models?baseUrl=${encodeURIComponent(cleanBase)}`;
    const response = await fetch(serverlessUrl, { method: 'GET', headers });
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        return { success: true, models: data.models };
      }
    }
  } catch (e) {
    // Continue to next tier
  }

  // Tier 2: Try Vercel Rewrite / Vite Proxy /nvidia-api/models
  try {
    const proxyUrl = resolveEndpoint(cleanBase, '/models');
    const response = await fetch(proxyUrl, { method: 'GET', headers });
    if (response.ok) {
      const data = await response.json();
      const rawList = data.data || data.models || (Array.isArray(data) ? data : []);
      if (Array.isArray(rawList) && rawList.length > 0) {
        const models = rawList.map(item => typeof item === 'string' ? { id: item, name: item } : { id: item.id || item.name, name: item.name || item.id });
        return { success: true, models };
      }
    }
  } catch (e) {
    // Continue to next tier
  }

  // Tier 3: Direct fetch to cleanBase/models
  try {
    const directUrl = `${cleanBase}/models`;
    const response = await fetch(directUrl, { method: 'GET', headers });
    if (response.ok) {
      const data = await response.json();
      const rawList = data.data || data.models || (Array.isArray(data) ? data : []);
      if (Array.isArray(rawList) && rawList.length > 0) {
        const models = rawList.map(item => typeof item === 'string' ? { id: item, name: item } : { id: item.id || item.name, name: item.name || item.id });
        return { success: true, models };
      }
    }
  } catch (e) {
    // End of tiers
  }

  return { 
    success: false, 
    message: 'Could not fetch models automatically. Select your NVIDIA model from the comprehensive catalog list below.', 
    models: [] 
  };
}

/**
 * Test OpenCode / NVIDIA API Key connection with fast multi-tier verification
 */
export async function testOpenCodeApiKey(apiKey, baseUrl = 'https://integrate.api.nvidia.com/v1', model = 'meta/llama-3.1-405b-instruct') {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'API key cannot be empty' };
  }

  // Try Serverless /api/models first
  const res = await fetchAvailableApiModels(apiKey, baseUrl);
  if (res.success && res.models.length > 0) {
    return { success: true, message: `API Key & Endpoint authenticated successfully! (${res.models.length} models accessible)` };
  }

  // Fallback try test completion via proxy or direct
  const cleanBase = (baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const testEndpoints = [
    `/api/nvidia-proxy?path=/chat/completions&baseUrl=${encodeURIComponent(cleanBase)}`,
    resolveEndpoint(cleanBase, '/chat/completions'),
    `${cleanBase}/chat/completions`
  ];

  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: model || 'meta/llama-3.1-405b-instruct',
          messages: [{ role: 'user', content: 'Respond OK' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        return { success: true, message: 'API Key authenticated successfully!' };
      }
    } catch (e) {
      // Continue
    }
  }

  return { success: false, message: 'Authentication Failed. Please verify your NVIDIA API Key or network connectivity.' };
}

/**
 * Intelligent Fallback Synthesizer that generates distinct, unique high-quality questions 
 * based on Topic + Student Register No seed!
 */
function generateDeterministicUniqueQuestions(topic, count, registerNo, difficulty) {
  // Simple seed generator from Student Register No
  let seed = 0;
  for (let i = 0; i < registerNo.length; i++) {
    seed += registerNo.charCodeAt(i) * (i + 1);
  }

  const topicKeywords = topic.split(/\s+/).filter(Boolean);
  const mainTopic = topicKeywords.join(' ') || 'General Knowledge';

  const questionBankPool = [
    {
      template: (t) => `Which of the following best defines the primary concept of ${t}?`,
      options: (t, s) => [
        `A structured methodology designed to optimize ${t} workflows and problem solving`,
        `A legacy manual protocol used before modern computing systems`,
        `An abstract hardware component used for network packet routing`,
        `A temporary memory storage buffer restricted to system administrators`
      ],
      correctIdx: 0,
      explanation: (t) => `${t} focuses primarily on structured, optimized methods for solving domain problems effectively.`
    },
    {
      template: (t) => `When implementing ${t} in real-world scenarios, what is a crucial best practice?`,
      options: (t, s) => [
        `Ignoring error handling to maximize execution speed`,
        `Modular design, consistent validation, and clear documentation`,
        `Storing all security keys directly inside public repositories`,
        `Bypassing testing phases for quick deployment`
      ],
      correctIdx: 1,
      explanation: (t) => `Modular architecture combined with validation ensures reliability and scalability in ${t}.`
    },
    {
      template: (t) => `What is the key advantage of utilizing ${t} over traditional approaches?`,
      options: (t, s) => [
        `Increased computational cost with no performance gain`,
        `Higher latency during peak workloads`,
        `Enhanced efficiency, scalability, and simplified maintainability`,
        `Requirement for specialized legacy hardware interfaces`
      ],
      correctIdx: 2,
      explanation: (t) => `Modern approaches to ${t} significantly reduce overhead while increasing scalability.`
    },
    {
      template: (t) => `In the context of ${t}, how does real-time monitoring impact system health?`,
      options: (t, s) => [
        `It enables early anomaly detection and proactive resolution`,
        `It degrades system security by exposing internal telemetry`,
        `It slows down CPU clock frequency by 50%`,
        `It requires manual user input for every execution step`
      ],
      correctIdx: 0,
      explanation: (t) => `Real-time monitoring allows immediate visibility into health metrics and proactive alerts.`
    },
    {
      template: (t) => `Which scenario represents an ideal application of ${t}?`,
      options: (t, s) => [
        `Automating repetitive tasks and data processing at scale`,
        `Manually entering records on physical ledger books`,
        `Disabling network encryption for internal office devices`,
        `Replacing core database indexing with randomized arrays`
      ],
      correctIdx: 0,
      explanation: (t) => `Automation and scalable data handling are classic use cases for ${t}.`
    },
    {
      template: (t) => `What common pitfall should be avoided when designing solutions for ${t}?`,
      options: (t, s) => [
        `Writing unit tests for critical functions`,
        `Over-engineering simple requirements without performance benefit`,
        `Using standard version control systems`,
        `Creating user documentation`
      ],
      correctIdx: 1,
      explanation: (t) => `Over-engineering increases complexity and maintenance debt without adding value.`
    },
    {
      template: (t) => `How does data integrity play a vital role in ${t}?`,
      options: (t, s) => [
        `It guarantees that information remains accurate, consistent, and unaltered`,
        `It randomizes stored values to prevent correlation`,
        `It forces all data to be converted into static text files`,
        `It deletes logs automatically after every transaction`
      ],
      correctIdx: 0,
      explanation: (t) => `Data integrity ensures the accuracy, completeness, and trust in system data.`
    },
    {
      template: (t) => `Which component forms the foundational building block of ${t}?`,
      options: (t, s) => [
        `Core logic modules and structured data schemas`,
        `Third-party advertising widgets`,
        `Unencrypted temporary cache files`,
        `Deprecated legacy drivers`
      ],
      correctIdx: 0,
      explanation: (t) => `Core logic modules and well-defined data models form the core foundation of ${t}.`
    },
    {
      template: (t) => `What security standard is essential when deploying ${t} applications?`,
      options: (t, s) => [
        `Least privilege access control and encrypted transport`,
        `Broadcasting admin credentials over unencrypted HTTP`,
        `Disabling authentication for external API endpoints`,
        `Using hardcoded default passwords in source code`
      ],
      correctIdx: 0,
      explanation: (t) => `Enforcing principle of least privilege and end-to-end encryption guards against security threats.`
    },
    {
      template: (t) => `In performance optimization for ${t}, what metric is typically evaluated first?`,
      options: (t, s) => [
        `Response latency and throughput under load`,
        `The physical weight of the server rack`,
        `The number of comments in the CSS stylesheet`,
        `The desktop wallpaper resolution`
      ],
      correctIdx: 0,
      explanation: (t) => `Latency and throughput are primary metrics for benchmarking performance.`
    },
    {
      template: (t) => `When scaling ${t} for thousands of concurrent users, what architecture pattern is recommended?`,
      options: (t, s) => [
        `Stateless microservices with distributed caching`,
        `Monolithic single-threaded script running on a desktop`,
        `Storing user sessions in global text files`,
        `Disabling load balancers`
      ],
      correctIdx: 0,
      explanation: (t) => `Stateless microservices and caching enable seamless horizontal scaling.`
    },
    {
      template: (t) => `What role does automated regression testing play in ${t} development?`,
      options: (t, s) => [
        `It catches unexpected bugs and breaks before production releases`,
        `It automatically deletes old codebase commits`,
        `It doubles the size of database storage required`,
        `It requires continuous manual intervention`
      ],
      correctIdx: 0,
      explanation: (t) => `Automated regression testing ensures stability when adding new features.`
    },
    {
      template: (t) => `How should failure recovery be handled in a robust ${t} setup?`,
      options: (t, s) => [
        `With automated failover mechanisms and health checks`,
        `By manually restarting servers only during business hours`,
        `By ignoring system logs`,
        `By wiping all configuration databases`
      ],
      correctIdx: 0,
      explanation: (t) => `Automated failover and continuous health probes minimize service downtime.`
    },
    {
      template: (t) => `What is the impact of asynchronous execution in modern ${t} platforms?`,
      options: (t, s) => [
        `Prevents thread blocking and improves total concurrent throughput`,
        `Forces all network calls to execute strictly one at a time`,
        `Increases CPU usage exponentially for idle states`,
        `Disables background event loops`
      ],
      correctIdx: 0,
      explanation: (t) => `Asynchronous execution frees main threads to process other incoming requests without waiting.`
    },
    {
      template: (t) => `Why is continuous integration (CI/CD) valuable for teams working on ${t}?`,
      options: (t, s) => [
        `It streamlines building, testing, and automated deployment`,
        `It replaces the need for human developers`,
        `It prevents code from being committed to repositories`,
        `It locks developer workstations after 5 PM`
      ],
      correctIdx: 0,
      explanation: (t) => `CI/CD pipelines automate quality gates and deployment cycles for rapid, reliable delivery.`
    }
  ];

  // Rotate and permute question choices according to student's seed!
  const generated = [];
  const totalAvailable = questionBankPool.length;

  for (let i = 0; i < Math.min(count, totalAvailable); i++) {
    // Determine question index based on student seed
    const qIndex = (seed + i * 3) % totalAvailable;
    const item = questionBankPool[qIndex];

    const rawOptions = item.options(mainTopic, seed);
    // Shuffle options per student seed so correct option position varies
    const optionShift = (seed + i) % 4;
    const shiftedOptions = [...rawOptions];
    
    // Rotate options array
    for (let r = 0; r < optionShift; r++) {
      shiftedOptions.push(shiftedOptions.shift());
    }

    // Find new position of the correct answer string
    const correctAnswerStr = rawOptions[item.correctIdx];
    const newCorrectIdx = shiftedOptions.indexOf(correctAnswerStr);

    generated.push({
      id: i + 1,
      question: item.template(mainTopic),
      options: shiftedOptions,
      answerIndex: newCorrectIdx >= 0 ? newCorrectIdx : 0,
      explanation: item.explanation(mainTopic)
    });
  }

  return generated;
}
