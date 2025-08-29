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
    await limiter.check(res, 20, 'CACHE_TOKEN'); // 20 requests per minute
  } catch {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retry_after: 60
    });
  }

  const { query, code, api_key } = req.body;

  // Validate required fields
  if (!query || !code) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Query and code are required',
      required_fields: ['query', 'code'],
      optional_fields: ['api_key']
    });
  }

  // API key validation (optional for public API)
  let userId = null;
  if (api_key) {
    userId = `api_user_${api_key.substring(0, 8)}`;
  }

  try {
    const prompt = `You are an expert code analyst and debugging assistant. A user has asked a question about their code in natural language.

USER'S QUESTION: "${query}"

CODE TO ANALYZE:
${code}

TASK: Provide a comprehensive, helpful answer to the user's question. Consider:
- What the code does and how it works
- Potential issues or bugs
- Performance considerations
- Best practices and improvements
- Specific answers to the user's question

RESPONSE FORMAT:
Return ONLY a valid JSON object with this structure:
{
  "answer": "Comprehensive answer to the user's question",
  "codeSuggestion": "optional improved code if relevant",
  "explanation": "optional detailed explanation",
  "confidence": "high|medium|low",
  "relatedTopics": ["topic1", "topic2"],
  "nextSteps": ["step1", "step2"]
}

IMPORTANT GUIDELINES:
- Be specific and actionable
- If the user asks about performance, provide concrete analysis
- If they ask about bugs, identify specific issues
- If they ask for explanations, break down the code clearly
- If they ask for optimizations, provide specific improvements
- Use clear, non-technical language when possible
- Provide code examples when helpful
- Be encouraging and constructive

CRITICAL: Respond ONLY with the JSON object. No markdown, no explanations, no code blocks.`;

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
        message: 'Failed to process query. Please try again.',
        details: error
      });
    }

    const data = await geminiRes.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON using shared utility
    let jsonText = extractJsonFromMarkdown(content);
    
    // Parse JSON using robust parser with fallback
    const fallbackData = {
      answer: "I'm sorry, I couldn't process your question properly. Please try rephrasing your question or provide more specific details about what you'd like to know about the code.",
      codeSuggestion: null,
      explanation: null,
      confidence: "low",
      relatedTopics: [],
      nextSteps: ["Try asking a more specific question", "Check if the code is complete"]
    };
    
    const result = parseJsonRobustly(jsonText, fallbackData);
    
    // Ensure required fields exist
    if (!result.answer) {
      result.answer = fallbackData.answer;
    }
    
    // Clean up optional fields
    if (!result.codeSuggestion) {
      result.codeSuggestion = null;
    }
    if (!result.explanation) {
      result.explanation = null;
    }
    if (!result.confidence) {
      result.confidence = "medium";
    }
    if (!result.relatedTopics) {
      result.relatedTopics = [];
    }
    if (!result.nextSteps) {
      result.nextSteps = [];
    }

    // Prepare API response
    const response = {
      success: true,
      data: {
        query: query,
        answer: result.answer,
        codeSuggestion: result.codeSuggestion,
        explanation: result.explanation,
        confidence: result.confidence,
        relatedTopics: result.relatedTopics,
        nextSteps: result.nextSteps,
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
            event: 'query_processed',
            user_id: userId,
            query: query,
            confidence: result.confidence,
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
    console.error('Public API query error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
} 