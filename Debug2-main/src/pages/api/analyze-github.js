import { extractJsonFromMarkdown, parseJsonRobustly } from '../../lib/json-parser';
import rateLimit from '../../lib/rate-limit';

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 users per minute
});

// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

// Supported file extensions for analysis
const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', 
  '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.hs', 
  '.pl', '.r', '.dart', '.ex', '.jl', '.sh', '.sql', '.m', '.mm'
];

// Common file patterns to analyze
const IMPORTANT_FILES = [
  'main', 'index', 'app', 'server', 'client', 'utils', 'helpers',
  'README', 'package.json', 'requirements.txt', 'Cargo.toml', 'pom.xml'
];

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
    await limiter.check(res, 5, 'CACHE_TOKEN'); // 5 requests per minute (GitHub analysis is resource-intensive)
  } catch {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retry_after: 60
    });
  }

  const { github_url, api_key } = req.body;

  // Validate required fields
  if (!github_url) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'GitHub URL is required',
      required_fields: ['github_url'],
      optional_fields: ['api_key']
    });
  }

  // Parse GitHub URL
  let repoInfo, filePath;
  try {
    const url = new URL(github_url);
    const pathParts = url.pathname.split('/').filter(part => part);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub URL format');
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    
    if (pathParts.length >= 4 && pathParts[2] === 'blob') {
      // File URL: github.com/owner/repo/blob/branch/path/to/file
      const branch = pathParts[3];
      filePath = pathParts.slice(4).join('/');
      repoInfo = { owner, repo, branch, filePath };
    } else {
      // Repository URL: github.com/owner/repo
      const branch = pathParts[2] || 'main'; // Default to main branch
      repoInfo = { owner, repo, branch };
    }
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid GitHub URL',
      message: 'Please provide a valid GitHub repository or file URL',
      example_urls: [
        'https://github.com/owner/repo',
        'https://github.com/owner/repo/blob/main/src/index.js'
      ]
    });
  }

  // API key validation (optional)
  let userId = null;
  if (api_key) {
    userId = `api_user_${api_key.substring(0, 8)}`;
  }

  try {
    let filesToAnalyze = [];

    if (repoInfo.filePath) {
      // Single file analysis
      const fileContent = await fetchGitHubFile(repoInfo);
      filesToAnalyze.push({
        path: repoInfo.filePath,
        content: fileContent,
        language: getLanguageFromExtension(repoInfo.filePath)
      });
    } else {
      // Repository analysis
      filesToAnalyze = await fetchRepositoryFiles(repoInfo);
    }

    if (filesToAnalyze.length === 0) {
      return res.status(404).json({
        error: 'No analyzable files found',
        message: 'No supported code files found in the repository',
        supported_extensions: SUPPORTED_EXTENSIONS
      });
    }

    // Analyze each file
    const analysisResults = [];
    let totalIssues = 0;
    let totalBugs = 0;

    for (const file of filesToAnalyze) {
      try {
        const analysis = await analyzeCode(file.content, file.language);
        analysisResults.push({
          file: file.path,
          language: file.language,
          analysis: analysis,
          issues_count: analysis.issues?.length || 0,
          bugs_detected: analysis.bugs_detected || false
        });
        
        totalIssues += analysis.issues?.length || 0;
        if (analysis.bugs_detected) totalBugs++;
      } catch (error) {
        console.error(`Error analyzing ${file.path}:`, error);
        analysisResults.push({
          file: file.path,
          language: file.language,
          error: 'Failed to analyze this file',
          analysis: null
        });
      }
    }

    // Generate summary
    const summary = {
      total_files: filesToAnalyze.length,
      analyzed_files: analysisResults.filter(r => !r.error).length,
      total_issues: totalIssues,
      files_with_bugs: totalBugs,
      repository: `${repoInfo.owner}/${repoInfo.repo}`,
      branch: repoInfo.branch
    };

    // Prepare response
    const response = {
      success: true,
      data: {
        summary: summary,
        files: analysisResults,
        metadata: {
          github_url: github_url,
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
            event: 'github_repo_analyzed',
            user_id: userId,
            repository: `${repoInfo.owner}/${repoInfo.repo}`,
            files_analyzed: summary.analyzed_files,
            total_issues: totalIssues,
            timestamp: new Date().toISOString()
          })
        });
      } catch (webhookError) {
        console.error('Webhook notification failed:', webhookError);
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('GitHub analysis error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      message: 'Failed to analyze the GitHub repository. Please try again.',
      details: error.message,
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
}

// Helper function to fetch a single file from GitHub
async function fetchGitHubFile(repoInfo) {
  const rawUrl = `${GITHUB_RAW_BASE}/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.branch}/${repoInfo.filePath}`;
  
  const response = await fetch(rawUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }
  
  return await response.text();
}

// Helper function to fetch repository files
async function fetchRepositoryFiles(repoInfo) {
  const apiUrl = `${GITHUB_API_BASE}/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.branch}?recursive=1`;
  
  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CodeAnalyzer/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repository: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const files = [];

  // Filter for supported file types and important files
  for (const item of data.tree) {
    if (item.type === 'blob' && isAnalyzableFile(item.path)) {
      try {
        const content = await fetchGitHubFile({
          ...repoInfo,
          filePath: item.path
        });
        
        files.push({
          path: item.path,
          content: content,
          language: getLanguageFromExtension(item.path)
        });

        // Limit to first 10 files to avoid overwhelming the API
        if (files.length >= 10) break;
      } catch (error) {
        console.error(`Failed to fetch ${item.path}:`, error);
      }
    }
  }

  return files;
}

// Helper function to check if a file is analyzable
function isAnalyzableFile(filePath) {
  const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(extension) || 
         IMPORTANT_FILES.some(pattern => filePath.toLowerCase().includes(pattern.toLowerCase()));
}

// Helper function to get language from file extension
function getLanguageFromExtension(filePath) {
  const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.hs': 'haskell',
    '.pl': 'perl',
    '.r': 'r',
    '.dart': 'dart',
    '.ex': 'elixir',
    '.jl': 'julia',
    '.sh': 'bash',
    '.sql': 'sql',
    '.m': 'objectivec',
    '.mm': 'objectivec'
  };
  
  return languageMap[extension] || 'javascript';
}

// Helper function to analyze code using existing AI endpoint
async function analyzeCode(code, language) {
  const prompt = `
You are an AI code assistant. Given the following code snippet, perform the following tasks:

- Detect bugs, logical errors, and performance issues
- Suggest corrections with explanations
- Explain the code logic and potential issues using technical detail suitable for intermediate programmers

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
    throw new Error(`AI service error: ${geminiRes.status}`);
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

  return aiResponse;
} 