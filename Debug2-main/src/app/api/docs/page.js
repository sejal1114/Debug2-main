'use client';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../components/ThemeContext';

const ENDPOINTS = [
  {
    name: 'Code Analysis',
    endpoint: '/api/public/analyze',
    method: 'POST',
    description: 'Analyze code for bugs, issues, and provide suggestions',
    rateLimit: '10 requests/minute',
    parameters: [
      { name: 'code', type: 'string', required: true, description: 'The code to analyze' },
      { name: 'language', type: 'string', required: false, description: 'Programming language (default: javascript)' },
      { name: 'level', type: 'string', required: false, description: 'Analysis level: beginner, intermediate, advanced (default: intermediate)' },
      { name: 'api_key', type: 'string', required: false, description: 'Optional API key for tracking' }
    ],
    example: {
      code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));`,
      language: 'javascript',
      level: 'intermediate'
    }
  },
  {
    name: 'Code Conversion',
    endpoint: '/api/public/convert',
    method: 'POST',
    description: 'Convert code between different programming languages',
    rateLimit: '15 requests/minute',
    parameters: [
      { name: 'source_code', type: 'string', required: true, description: 'The source code to convert' },
      { name: 'source_language', type: 'string', required: true, description: 'Source programming language' },
      { name: 'target_language', type: 'string', required: true, description: 'Target programming language' },
      { name: 'api_key', type: 'string', required: false, description: 'Optional API key for tracking' }
    ],
    example: {
      source_code: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
      source_language: 'javascript',
      target_language: 'python'
    }
  },
  {
    name: 'Natural Language Query',
    endpoint: '/api/public/query',
    method: 'POST',
    description: 'Ask questions about code in natural language',
    rateLimit: '20 requests/minute',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Your question about the code' },
      { name: 'code', type: 'string', required: true, description: 'The code to analyze' },
      { name: 'api_key', type: 'string', required: false, description: 'Optional API key for tracking' }
    ],
    example: {
      query: 'Why is this loop slow?',
      code: `for (let i = 0; i < 1000000; i++) {
  console.log(i);
}`
    }
  },
  {
    name: 'API Status',
    endpoint: '/api/public/status',
    method: 'GET',
    description: 'Check API health and service status',
    rateLimit: '60 requests/minute',
    parameters: [],
    example: {}
  },
  {
    name: 'GitHub Repository Analysis',
    endpoint: '/api/analyze-github',
    method: 'POST',
    description: 'Analyze entire GitHub repositories for bugs and issues',
    rateLimit: '5 requests/minute',
    parameters: [
      { name: 'github_url', type: 'string', required: true, description: 'GitHub repository or file URL' },
      { name: 'api_key', type: 'string', required: false, description: 'Optional API key for tracking' }
    ],
    example: {
      github_url: 'https://github.com/username/repository'
    }
  },
  {
    name: 'Generate PDF Report',
    endpoint: '/api/generate-pdf',
    method: 'POST',
    description: 'Generate PDF report from analysis results',
    rateLimit: '10 requests/minute',
    parameters: [
      { name: 'analysisData', type: 'object', required: true, description: 'Analysis data from GitHub analysis' }
    ],
    example: {
      analysisData: {
        summary: { repository: 'owner/repo', total_files: 5, total_issues: 12 },
        files: [{ file: 'src/index.js', analysis: { explanation: '...', issues: ['...'] } }],
        metadata: { timestamp: '2024-01-01T12:00:00.000Z', request_id: 'req_123' }
      }
    }
  }
];

export default function APIDocsPage() {
  const { dark } = useTheme();
  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const [testResponse, setTestResponse] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://your-domain.com'); // Default fallback

  // Set the base URL after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const endpoint = ENDPOINTS[activeEndpoint];

  const handleTestAPI = async () => {
    setIsTesting(true);
    setTestResponse(null);

    try {
      const requestBody = {
        ...endpoint.example,
        ...(apiKey && { api_key: apiKey })
      };

      const response = await fetch(endpoint.endpoint, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: endpoint.method === 'POST' ? JSON.stringify(requestBody) : undefined,
      });

      const data = await response.json();
      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      });
    } catch (error) {
      setTestResponse({
        error: error.message,
        status: 0,
        statusText: 'Network Error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const generateCurlCommand = () => {
    const endpoint = ENDPOINTS[activeEndpoint];
    
    if (endpoint.method === 'GET') {
      return `curl -X GET "${baseUrl}${endpoint.endpoint}"`;
    }

    const body = JSON.stringify(endpoint.example, null, 2);
    return `curl -X POST "${baseUrl}${endpoint.endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;
  };

  const generateJavaScriptExample = () => {
    const endpoint = ENDPOINTS[activeEndpoint];
    
    if (endpoint.method === 'GET') {
      return `fetch("${baseUrl}${endpoint.endpoint}")
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
    }

    const body = JSON.stringify(endpoint.example, null, 2);
    return `fetch("${baseUrl}${endpoint.endpoint}", {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${body})
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-700">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-6">
            API Documentation
          </h1>
          <p className="text-xl lg:text-2xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto leading-relaxed">
            Comprehensive RESTful API for AI-powered code analysis, conversion, and natural language queries
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Endpoint Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Endpoints
                </h2>
                <div className="space-y-3">
                  {ENDPOINTS.map((endpoint, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveEndpoint(index)}
                      className={`w-full text-left p-4 rounded-2xl transition-all duration-300 ${
                        activeEndpoint === index
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          endpoint.method === 'GET' ? 'bg-green-500' : 'bg-blue-500'
                        }`}>
                          {endpoint.method}
                        </span>
                        <span className="text-sm opacity-75">{endpoint.rateLimit}</span>
                      </div>
                      <h3 className="font-semibold mb-1">{endpoint.name}</h3>
                      <p className="text-sm opacity-75">{endpoint.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Endpoint Details */}
            <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  endpoint.method === 'GET' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {endpoint.method}
                </span>
                <code className="text-lg font-mono text-slate-900 dark:text-white">
                  {endpoint.endpoint}
                </code>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {endpoint.rateLimit}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {endpoint.name}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {endpoint.description}
              </p>

              {/* Parameters */}
              {endpoint.parameters.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                    Parameters
                  </h3>
                  <div className="space-y-3">
                    {endpoint.parameters.map((param, index) => (
                      <div key={index} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-blue-400 font-mono">{param.name}</code>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {param.type}
                          </span>
                          {param.required && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-500 text-white">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {param.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Examples */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Code Examples
                </h3>
                
                {/* cURL Example */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    cURL
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 overflow-x-auto">
                    <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                      <code>{generateCurlCommand()}</code>
                    </pre>
                  </div>
                </div>

                {/* JavaScript Example */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    JavaScript
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 overflow-x-auto">
                    <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                      <code>{generateJavaScriptExample()}</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Test API */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Test API
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      API Key (Optional)
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key for tracking"
                      className="w-full px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-slate-700 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                    />
                  </div>

                  <button
                    onClick={handleTestAPI}
                    disabled={isTesting}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTesting ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Testing...</span>
                      </div>
                    ) : (
                      'Test API'
                    )}
                  </button>
                </div>

                {/* Test Response */}
                {testResponse && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                      Response
                    </h4>
                    <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 overflow-x-auto">
                      <div className="mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          testResponse.status >= 200 && testResponse.status < 300
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {testResponse.status} {testResponse.statusText}
                        </span>
                      </div>
                      <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                        <code>{JSON.stringify(testResponse.data, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* API Information */}
            <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                API Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Rate Limits
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Code Analysis:</span>
                      <span className="font-mono text-slate-900 dark:text-white">10/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Code Conversion:</span>
                      <span className="font-mono text-slate-900 dark:text-white">15/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Natural Language Query:</span>
                      <span className="font-mono text-slate-900 dark:text-white">20/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">API Status:</span>
                      <span className="font-mono text-slate-900 dark:text-white">60/min</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Features
                  </h3>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                    <li>• CORS enabled for cross-origin requests</li>
                    <li>• Webhook notifications for real-time updates</li>
                    <li>• Comprehensive error handling</li>
                    <li>• Request ID tracking for debugging</li>
                    <li>• Rate limit headers included</li>
                    <li>• JSON response format</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}