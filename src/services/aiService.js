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
  // Seed PRNG generator from Student Register No
  let seed = 1337;
  for (let i = 0; i < registerNo.length; i++) {
    seed = (seed * 31 + registerNo.charCodeAt(i)) % 2147483647;
  }

  // Linear Congruential Generator (LCG) for deterministic seeded randomness
  const prng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const topicKeywords = topic.split(/\s+/).filter(Boolean);
  const mainTopic = topicKeywords.join(' ') || 'General Knowledge';

  const questionBankPool = [
    {
      template: (t) => `Which of the following best defines the primary concept of ${t}?`,
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
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
      options: (t) => [
        `It streamlines building, testing, and automated deployment`,
        `It replaces the need for human developers`,
        `It prevents code from being committed to repositories`,
        `It locks developer workstations after 5 PM`
      ],
      correctIdx: 0,
      explanation: (t) => `CI/CD pipelines automate quality gates and deployment cycles for rapid, reliable delivery.`
    },
    {
      template: (t) => `Which layer of the architecture is primarily responsible for business logic in ${t}?`,
      options: (t) => [
        `Application / Service Domain Layer`,
        `Physical Cabling & Hardware Switch Layer`,
        `Client Display Rendering Engine`,
        `Static Asset CDN Edge Cache`
      ],
      correctIdx: 0,
      explanation: (t) => `The domain/service layer encapsulates state rules and domain workflows.`
    },
    {
      template: (t) => `How does caching improve user experience when working with ${t}?`,
      options: (t) => [
        `Reduces database load and accelerates response time for frequent queries`,
        `Deletes cold data to save disk space automatically`,
        `Encrypts static images with zero overhead`,
        `Forces all clients to re-download raw files on every page click`
      ],
      correctIdx: 0,
      explanation: (t) => `In-memory caching avoids repetitive disk/DB lookups for hot data.`
    },
    {
      template: (t) => `What is a core principle of defensive programming in ${t}?`,
      options: (t) => [
        `Validating all input boundaries and assuming external data can be malformed`,
        `Trusting all incoming API parameters without sanitization`,
        `Writing long single-file functions to avoid modular imports`,
        `Turning off logging in production environments`
      ],
      correctIdx: 0,
      explanation: (t) => `Defensive programming anticipates bad inputs and unexpected edge cases.`
    },
    {
      template: (t) => `In database management for ${t}, what is the main purpose of indexing?`,
      options: (t) => [
        `Speeding up record retrieval by reducing table scan time`,
        `Compressing table columns into binary zips`,
        `Automatically deleting records older than 30 days`,
        `Locking tables permanently during write operations`
      ],
      correctIdx: 0,
      explanation: (t) => `Indexes create lookup trees so queries run in O(log N) instead of O(N) full table scans.`
    },
    {
      template: (t) => `What distinguishes synchronous communication from asynchronous communication in ${t}?`,
      options: (t) => [
        `Synchronous blocks execution until a response arrives; asynchronous non-blocks`,
        `Synchronous is faster under all network conditions`,
        `Asynchronous requires dedicated satellite uplinks`,
        `Synchronous can only run on mobile devices`
      ],
      correctIdx: 0,
      explanation: (t) => `Asynchronous operations allow threads to continue other tasks while awaiting I/O completion.`
    },
    {
      template: (t) => `When performing code reviews for ${t}, what aspect is most critical to evaluate?`,
      options: (t) => [
        `Correctness, security vulnerabilities, edge cases, and code clarity`,
        `The font style used in the code editor`,
        `Whether variables use single or double quotes exclusively`,
        `The developer's typing speed`
      ],
      correctIdx: 0,
      explanation: (t) => `Code reviews focus on preventing bugs, ensuring security standards, and maintaining readability.`
    },
    {
      template: (t) => `What is the primary function of API rate limiting in ${t}?`,
      options: (t) => [
        `Protecting servers against denial-of-service (DoS) attacks and resource exhaustion`,
        `Slowing down legitimate users to save electricity`,
        `Restricting access to paid subscribers only`,
        `Auto-generating database migrations`
      ],
      correctIdx: 0,
      explanation: (t) => `Rate limiters cap requests per minute to prevent malicious overloading of server nodes.`
    },
    {
      template: (t) => `Why is structured logging essential for diagnosing production issues in ${t}?`,
      options: (t) => [
        `Enables automated log parsing, searching, and metric aggregation`,
        `Reduces total log file size to zero bytes`,
        `Prevents stack traces from being recorded`,
        `Hides errors from system administrators`
      ],
      correctIdx: 0,
      explanation: (t) => `Structured JSON logs allow log processors (like ELK/Datadog) to index attributes for rapid debugging.`
    },
    {
      template: (t) => `What is the role of environment variables in ${t} configuration?`,
      options: (t) => [
        `Separating configuration and secrets from source code across environments`,
        `Increasing the execution speed of Javascript loops`,
        `Storing user passwords in plain text on client machines`,
        `Formatting HTML output automatically`
      ],
      correctIdx: 0,
      explanation: (t) => `Environment variables decouple environment-specific configs (dev/prod keys) from codebase commits.`
    },
    {
      template: (t) => `How does load balancing contribute to high availability in ${t}?`,
      options: (t) => [
        `Distributes incoming traffic across multiple healthy server instances`,
        `Forces all traffic through a single master node`,
        `Powers down inactive servers during peak hours`,
        `Increases network packet sizes`
      ],
      correctIdx: 0,
      explanation: (t) => `Load balancers route client requests away from degraded instances to healthy targets.`
    }
  ];

  const totalAvailable = questionBankPool.length;

  // Create an array of indices [0, 1, 2, ..., totalAvailable - 1]
  const indices = Array.from({ length: totalAvailable }, (_, idx) => idx);

  // Perform Fisher-Yates shuffle using our seeded PRNG
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Pick required number of unique question items without replacement!
  const targetCount = Math.min(count, totalAvailable);
  const selectedIndices = indices.slice(0, targetCount);

  const generated = [];

  for (let i = 0; i < selectedIndices.length; i++) {
    const qIndex = selectedIndices[i];
    const item = questionBankPool[qIndex];

    const rawOptions = item.options(mainTopic);
    
    // Seeded shuffle of options per question so correct choice position varies
    const optionIndices = [0, 1, 2, 3];
    for (let o = optionIndices.length - 1; o > 0; o--) {
      const oj = Math.floor(prng() * (o + 1));
      [optionIndices[o], optionIndices[oj]] = [optionIndices[oj], optionIndices[o]];
    }

    const shuffledOptions = optionIndices.map(idx => rawOptions[idx]);
    const originalCorrectStr = rawOptions[item.correctIdx];
    const newCorrectIdx = shuffledOptions.indexOf(originalCorrectStr);

    generated.push({
      id: i + 1,
      question: item.template(mainTopic),
      options: shuffledOptions,
      answerIndex: newCorrectIdx >= 0 ? newCorrectIdx : 0,
      explanation: item.explanation(mainTopic)
    });
  }

  return generated;
}

