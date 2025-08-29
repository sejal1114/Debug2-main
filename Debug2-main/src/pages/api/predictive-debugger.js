import { extractJsonFromMarkdown, parseJsonRobustly } from '../../lib/json-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, language, riskLevel = 'medium' } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const prompt = `You are an expert predictive debugging system. Analyze the following code to anticipate potential issues, bugs, and performance problems before they occur.

CODE TO ANALYZE:
${code}

LANGUAGE: ${language}
RISK LEVEL: ${riskLevel}

TASK: Perform comprehensive predictive analysis including:
1. Identify potential bugs and issues
2. Analyze performance bottlenecks
3. Detect security vulnerabilities
4. Suggest preventive measures
5. Provide code improvements
6. Assess overall risk level

ANALYSIS CRITERIA:
- Code complexity and maintainability
- Common programming mistakes
- Performance anti-patterns
- Memory leaks and resource management
- Error handling and edge cases
- Security best practices
- Scalability concerns
- Code style and readability

RESPONSE FORMAT:
Return ONLY a valid JSON object with this structure:
{
  "overallRisk": "low|medium|high",
  "riskSummary": "Brief summary of overall risk assessment",
  "potentialIssues": [
    {
      "title": "Issue title",
      "description": "Detailed description",
      "severity": "low|medium|high",
      "lineNumber": "optional line number",
      "suggestion": "How to fix or prevent"
    }
  ],
  "performancePredictions": [
    {
      "metric": "Time Complexity",
      "description": "Analysis of time complexity",
      "impact": "High/Medium/Low impact"
    }
  ],
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ],
  "codeSuggestions": [
    {
      "description": "What this improvement does",
      "code": "Improved code snippet"
    }
  ]
}

IMPORTANT GUIDELINES:
- Be thorough but not overwhelming
- Focus on actionable insights
- Provide specific, implementable suggestions
- Consider the specified risk level
- Balance between being helpful and not being alarmist
- Include both immediate fixes and long-term improvements

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
      return res.status(500).json({ error: 'Gemini API error', details: error });
    }

    const data = await geminiRes.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON using shared utility
    let jsonText = extractJsonFromMarkdown(content);
    
    // Parse JSON using robust parser with fallback
    const fallbackData = {
      overallRisk: "medium",
      riskSummary: "Unable to perform complete analysis due to parsing issues. Please try again with a simpler code snippet.",
      potentialIssues: [
        {
          title: "Analysis Error",
          description: "Could not perform predictive analysis properly",
          severity: "medium",
          suggestion: "Try with a smaller code snippet or different approach"
        }
      ],
      performancePredictions: [],
      recommendations: ["Ensure proper error handling", "Add input validation"],
      codeSuggestions: []
    };
    
    const result = parseJsonRobustly(jsonText, fallbackData);
    
    // Ensure required fields exist
    if (!result.overallRisk) {
      result.overallRisk = "medium";
    }
    if (!result.riskSummary) {
      result.riskSummary = "Analysis completed with some limitations";
    }
    if (!result.potentialIssues) {
      result.potentialIssues = [];
    }
    if (!result.performancePredictions) {
      result.performancePredictions = [];
    }
    if (!result.recommendations) {
      result.recommendations = [];
    }
    if (!result.codeSuggestions) {
      result.codeSuggestions = [];
    }

    // Validate and clean up issues
    result.potentialIssues = result.potentialIssues.map(issue => ({
      title: issue.title || "Unknown Issue",
      description: issue.description || "No description available",
      severity: issue.severity || "medium",
      lineNumber: issue.lineNumber || null,
      suggestion: issue.suggestion || "No suggestion available"
    }));

    // Validate and clean up performance predictions
    result.performancePredictions = result.performancePredictions.map(prediction => ({
      metric: prediction.metric || "Unknown Metric",
      description: prediction.description || "No description available",
      impact: prediction.impact || "Unknown"
    }));

    // Validate and clean up code suggestions
    result.codeSuggestions = result.codeSuggestions.map(suggestion => ({
      description: suggestion.description || "Code improvement",
      code: suggestion.code || "// No code provided"
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('Predictive debugger error:', err);
    return res.status(500).json({ 
      error: 'Failed to perform predictive analysis', 
      details: err.message 
    });
  }
} 