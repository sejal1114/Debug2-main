import { extractJsonFromMarkdown, parseJsonRobustly } from '../../lib/json-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, code } = req.body;
  if (!query || !code) {
    return res.status(400).json({ error: 'Query and code are required' });
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
You MUST respond with ONLY a valid JSON object. No markdown, no explanations, no code blocks, no additional text.

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
- ALWAYS respond with valid JSON only
- Use double quotes for all strings
- Escape any quotes within strings with backslash
- Do not include any text before or after the JSON

CRITICAL: Respond ONLY with the JSON object. No markdown, no explanations, no code blocks. Start with { and end with }. The response must be valid JSON that can be parsed by JSON.parse().`;

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
      return res.status(500).json({ error: 'Gemini API error', details: error });
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

    return res.status(200).json(result);
  } catch (err) {
    console.error('Natural language query error:', err);
    return res.status(500).json({ 
      error: 'Failed to process natural language query', 
      details: err.message 
    });
  }
} 