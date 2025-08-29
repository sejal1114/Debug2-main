import { extractJsonFromMarkdown, parseJsonRobustly } from '../../../lib/json-parser';
import rateLimit from '../../../lib/rate-limit';

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 users per minute
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported',
      allowed_methods: ['POST']
    });
  }

  // Rate limiting
  try {
    await limiter.check(res, 10, 'CACHE_TOKEN'); // 10 requests per minute
  } catch {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retry_after: 60
    });
  }

  const { code, language = 'javascript', level = 'intermediate', api_key } = req.body;

  // Validate required fields
  if (!code) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'Code is required',
      required_fields: ['code'],
      optional_fields: ['language', 'level', 'api_key']
    });
  }

  // API key validation (optional for public API)
  let userId = null;
  if (api_key) {
    // In a real implementation, validate API key against database
    // For now, we'll accept any non-empty API key
    userId = `api_user_${api_key.substring(0, 8)}`;
  }

  try {
    const prompt = `
You are an AI code assistant. Given the following code snippet, perform the following tasks:

- Detect bugs, logical errors${level === 'advanced' ? ', and performance issues' : ''}
- Suggest corrections${level !== 'beginner' ? ' with explanations' : ''}
- ${level === 'beginner'
  ? 'Explain in plain English (ELI5 style), using analogies, metaphors, visuals, and simple terms. Avoid technical jargon.'
  : level === 'intermediate'
  ? 'Explain the code logic and potential issues using technical detail suitable for intermediate programmers.'
  : 'Provide deep technical analysis and optimization suggestions with advanced concepts.'}

- Break down the code line-by-line. Use actual line numbers from the user's code.
- Return a flowchart-friendly JSON of code logic.

IMPORTANT BUG DETECTION RULES:
- Set "bugs_detected": true if you find ANY bugs, errors, or issues in the code
- Set "bugs_detected": false ONLY if the code is completely correct and has no issues
- If you detect bugs, ALWAYS include them in the "issues" array

CRITICAL FIX REQUIREMENTS:
- The "suggested_fix" field should contain ONLY the corrected code, not explanations
- Do NOT include explanations, comments, or markdown in the suggested_fix
- The fix should be ready to copy-paste and run immediately

For the visualization, each node MUST include:
- "code_snippet": the code for that block
- "variables": object of variables in scope or modified in that block
- "line": line number or range for that block
- "type": one of "function", "condition", "loop", "call", "return", "declaration", "assignment", "decision", "output", "input"

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no explanations, no code blocks.

Code:
${code}

Respond in this exact JSON structure:
{
  "explanation": "Your explanation here",
  "bugs_detected": true/false,
  "issues": ["issue1", "issue2"],
  "suggested_fix": "print('hello')",
  "line_by_line": {
    "1": "line 1 explanation",
    "2": "line 2 explanation"
  },
  "visualization": {
    "nodes": [
      {
        "id": "1",
        "type": "function",
        "label": "Function",
        "code_snippet": "code here",
        "variables": {
          "var1": "value1"
        },
        "line": "1-5"
      }
    ],
    "edges": [
      {
        "from": "1",
        "to": "2"
      }
    ]
  }
}`;

    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { parts: [ { text: prompt } ] }
        ]
      }),
    });

    if (!geminiRes.ok) {
      const error = await geminiRes.text();
      console.error('Gemini API error:', error);
      return res.status(500).json({ 
        error: 'AI service error',
        message: 'Failed to analyze code. Please try again.',
        details: error
      });
    }

    const data = await geminiRes.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON using shared utility
    let jsonText = extractJsonFromMarkdown(content);
    
    // Parse JSON using robust parser
    const aiResponse = parseJsonRobustly(jsonText, {
      explanation: 'Unable to analyze code properly.',
      bugs_detected: false,
      issues: [],
      suggested_fix: '',
      line_by_line: {},
      visualization: { nodes: [], edges: [] }
    });

    // Normalize the response
    if (aiResponse.bugs_detected === true && (!aiResponse.issues || aiResponse.issues.length === 0)) {
      if (aiResponse.explanation) {
        const bugKeywords = ['bug', 'error', 'issue', 'problem', 'wrong', 'incorrect', 'undefined', 'not defined'];
        const hasBugKeywords = bugKeywords.some(keyword => 
          aiResponse.explanation.toLowerCase().includes(keyword)
        );
        
        if (hasBugKeywords) {
          aiResponse.issues = [aiResponse.explanation];
        } else {
          aiResponse.bugs_detected = false;
        }
      } else {
        aiResponse.bugs_detected = false;
      }
    }

    // Prepare API response
    const response = {
      success: true,
      data: {
        analysis: aiResponse,
        metadata: {
          language: language,
          level: level,
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      }
    };

    // Add webhook notification if configured
    if (process.env.WEBHOOK_URL) {
      try {
        await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'code_analyzed',
            user_id: userId,
            language: language,
            level: level,
            bugs_detected: aiResponse.bugs_detected,
            timestamp: new Date().toISOString()
          })
        });
      } catch (webhookError) {
        console.error('Webhook notification failed:', webhookError);
        // Don't fail the request if webhook fails
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Public API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
} 