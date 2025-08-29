export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    // Use Gemini Vision API to analyze the screenshot
    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an expert code analyzer. Extract and analyze the code from this screenshot.

IMPORTANT REQUIREMENTS:
1. Extract ALL code visible in the image, maintaining exact formatting and indentation
2. Identify the programming language (JavaScript, Python, Java, C++, etc.)
3. Preserve all syntax, comments, and structure
4. If there are multiple code blocks, extract them all
5. Handle different code styles and formatting
6. Be precise with spacing, brackets, and special characters

RESPONSE FORMAT:
Return ONLY a valid JSON object with this structure:
{
  "extractedCode": "the complete code extracted from the image",
  "language": "detected_language",
  "confidence": "high|medium|low",
  "analysis": {
    "summary": "brief description of what the code does",
    "complexity": "simple|moderate|complex",
    "suggestions": ["suggestion1", "suggestion2"]
  }
}

CRITICAL: Respond ONLY with the JSON object. No explanations, no markdown, no code blocks.`
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image.split(',')[1] // Remove data:image/jpeg;base64, prefix
                }
              }
            ]
          }
        ]
      }),
    });

    if (!geminiRes.ok) {
      const error = await geminiRes.text();
      console.error('Gemini Vision API error:', error);
      return res.status(500).json({ error: 'Gemini Vision API error', details: error });
    }

    const data = await geminiRes.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from the response
    let jsonText = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON parsing fails, create a fallback response
      result = {
        extractedCode: content,
        language: 'unknown',
        confidence: 'low',
        analysis: {
          summary: 'Code extracted from image',
          complexity: 'unknown',
          suggestions: ['Unable to parse response properly']
        }
      };
    }

    // Validate and clean the response
    if (!result.extractedCode) {
      return res.status(500).json({ error: 'Failed to extract code from image' });
    }

    // Clean up the extracted code
    result.extractedCode = result.extractedCode.trim();
    
    // Ensure we have a valid language
    if (!result.language || result.language === 'unknown') {
      // Try to detect language from the code
      const code = result.extractedCode.toLowerCase();
      if (code.includes('function') || code.includes('const') || code.includes('let') || code.includes('var')) {
        result.language = 'javascript';
      } else if (code.includes('def ') || code.includes('import ') || code.includes('print(')) {
        result.language = 'python';
      } else if (code.includes('public class') || code.includes('public static void')) {
        result.language = 'java';
      } else if (code.includes('#include') || code.includes('int main')) {
        result.language = 'cpp';
      } else {
        result.language = 'javascript'; // Default fallback
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Screenshot analysis error:', err);
    return res.status(500).json({ error: 'Failed to analyze screenshot', details: err.message });
  }
} 