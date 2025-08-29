export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported',
      allowed_methods: ['GET']
    });
  }

  try {
    // Check Gemini API status
    let geminiStatus = 'unknown';
    try {
      const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        }),
      });
      geminiStatus = geminiRes.ok ? 'operational' : 'degraded';
    } catch (error) {
      geminiStatus = 'down';
    }

    // Get current timestamp
    const now = new Date();
    
    // Calculate uptime (simplified - in production, track actual uptime)
    const startTime = new Date('2024-01-01T00:00:00Z'); // Example start date
    const uptimeMs = now.getTime() - startTime.getTime();
    const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const uptimeHours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    const response = {
      success: true,
      data: {
        status: 'operational',
        timestamp: now.toISOString(),
        uptime: {
          days: uptimeDays,
          hours: uptimeHours,
          total_seconds: Math.floor(uptimeMs / 1000)
        },
        services: {
          api: 'operational',
          gemini_ai: geminiStatus,
          database: 'operational',
          webhooks: process.env.WEBHOOK_URL ? 'configured' : 'not_configured'
        },
        limits: {
          analyze: {
            requests_per_minute: 10,
            requests_per_hour: 600,
            requests_per_day: 14400
          },
          convert: {
            requests_per_minute: 15,
            requests_per_hour: 900,
            requests_per_day: 21600
          },
          query: {
            requests_per_minute: 20,
            requests_per_hour: 1200,
            requests_per_day: 28800
          }
        },
        endpoints: [
          {
            name: 'Code Analysis',
            endpoint: '/api/public/analyze',
            method: 'POST',
            description: 'Analyze code for bugs and issues',
            rate_limit: '10 requests/minute'
          },
          {
            name: 'Code Conversion',
            endpoint: '/api/public/convert',
            method: 'POST',
            description: 'Convert code between programming languages',
            rate_limit: '15 requests/minute'
          },
          {
            name: 'Natural Language Query',
            endpoint: '/api/public/query',
            method: 'POST',
            description: 'Ask questions about code in natural language',
            rate_limit: '20 requests/minute'
          },
          {
            name: 'API Status',
            endpoint: '/api/public/status',
            method: 'GET',
            description: 'Check API health and status',
            rate_limit: '60 requests/minute'
          }
        ],
        version: '1.0.0',
        documentation_url: '/api/docs'
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Status API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve status information',
      timestamp: new Date().toISOString()
    });
  }
} 