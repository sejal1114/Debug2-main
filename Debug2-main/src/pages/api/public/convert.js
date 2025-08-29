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
    await limiter.check(res, 15, 'CACHE_TOKEN'); // 15 requests per minute
  } catch {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retry_after: 60
    });
  }

  const { source_code, source_language, target_language, api_key } = req.body;

  // Validate required fields
  if (!source_code || !source_language || !target_language) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'source_code, source_language, and target_language are required',
      required_fields: ['source_code', 'source_language', 'target_language'],
      optional_fields: ['api_key']
    });
  }

  // Validate supported languages
  const supportedLanguages = [
    'javascript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift',
    'kotlin', 'typescript', 'scala', 'haskell', 'perl', 'r', 'dart', 'elixir', 'julia',
    'bash', 'sql', 'matlab', 'objectivec'
  ];

  if (!supportedLanguages.includes(source_language.toLowerCase())) {
    return res.status(400).json({
      error: 'Unsupported source language',
      message: `Source language '${source_language}' is not supported`,
      supported_languages: supportedLanguages
    });
  }

  if (!supportedLanguages.includes(target_language.toLowerCase())) {
    return res.status(400).json({
      error: 'Unsupported target language',
      message: `Target language '${target_language}' is not supported`,
      supported_languages: supportedLanguages
    });
  }

  // API key validation (optional for public API)
  let userId = null;
  if (api_key) {
    userId = `api_user_${api_key.substring(0, 8)}`;
  }

  try {
    const prompt = `You are an expert multilingual code translator.

Convert the following code from ${source_language} to ${target_language}.

REQUIREMENTS:
- Preserve logic and structure exactly
- Use idiomatic syntax of the target language
- If any feature doesn't exist in the target language, explain with comments
- Maintain the same functionality and behavior
- Handle language-specific differences appropriately
- Output only the converted code, with comments where necessary

SOURCE CODE:
${source_code}

CRITICAL: Return ONLY the converted code. No explanations, no markdown, no code blocks.`;

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
        message: 'Failed to convert code. Please try again.',
        details: error
      });
    }

    const data = await geminiRes.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Try to extract code block
    let translated_code = content;
    const match = content.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    if (match) {
      translated_code = match[1].trim();
    }

    // Prepare API response
    const response = {
      success: true,
      data: {
        source_code: source_code,
        source_language: source_language,
        target_language: target_language,
        translated_code: translated_code,
        metadata: {
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
            event: 'code_converted',
            user_id: userId,
            source_language: source_language,
            target_language: target_language,
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
    console.error('Public API convert error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
} 