# Public API Implementation

## 🎯 **Overview**

This document outlines the comprehensive Public API implementation with RESTful endpoints, webhook support, rate limiting, and developer documentation.

## 🚀 **API Endpoints**

### **1. Code Analysis** (`/api/public/analyze`)

**Endpoint:** `POST /api/public/analyze`

**Description:** Analyze code for bugs, issues, and provide AI-powered suggestions

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "code": "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); }",
  "language": "javascript",
  "level": "intermediate",
  "api_key": "optional_api_key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "explanation": "This function implements the Fibonacci sequence...",
      "bugs_detected": false,
      "issues": [],
      "suggested_fix": "",
      "line_by_line": {
        "1": "Function declaration with parameter n",
        "2": "Base case: if n is 0 or 1, return n"
      },
      "visualization": {
        "nodes": [...],
        "edges": [...]
      }
    },
    "metadata": {
      "language": "javascript",
      "level": "intermediate",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "request_id": "req_1704110400000_abc123"
    }
  }
}
```

### **2. Code Conversion** (`/api/public/convert`)

**Endpoint:** `POST /api/public/convert`

**Description:** Convert code between different programming languages

**Rate Limit:** 15 requests/minute

**Request Body:**
```json
{
  "source_code": "function factorial(n) { if (n <= 1) return 1; return n * factorial(n - 1); }",
  "source_language": "javascript",
  "target_language": "python",
  "api_key": "optional_api_key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "source_code": "function factorial(n) { if (n <= 1) return 1; return n * factorial(n - 1); }",
    "source_language": "javascript",
    "target_language": "python",
    "translated_code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)",
    "metadata": {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "request_id": "req_1704110400000_def456"
    }
  }
}
```

### **3. Natural Language Query** (`/api/public/query`)

**Endpoint:** `POST /api/public/query`

**Description:** Ask questions about code in natural language

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "query": "Why is this loop slow?",
  "code": "for (let i = 0; i < 1000000; i++) { console.log(i); }",
  "api_key": "optional_api_key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "Why is this loop slow?",
    "answer": "This loop is slow because it performs a console.log operation 1 million times...",
    "codeSuggestion": "for (let i = 0; i < 1000000; i++) { /* Use batch processing instead */ }",
    "explanation": "Console.log is a synchronous operation that blocks the main thread...",
    "confidence": "high",
    "relatedTopics": ["performance", "optimization", "loops"],
    "nextSteps": ["Use batch processing", "Consider async operations"],
    "metadata": {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "request_id": "req_1704110400000_ghi789"
    }
  }
}
```

### **4. API Status** (`/api/public/status`)

**Endpoint:** `GET /api/public/status`

**Description:** Check API health and service status

**Rate Limit:** 60 requests/minute

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": {
      "days": 30,
      "hours": 12,
      "total_seconds": 2592000
    },
    "services": {
      "api": "operational",
      "gemini_ai": "operational",
      "database": "operational",
      "webhooks": "configured"
    },
    "limits": {
      "analyze": {
        "requests_per_minute": 10,
        "requests_per_hour": 600,
        "requests_per_day": 14400
      },
      "convert": {
        "requests_per_minute": 15,
        "requests_per_hour": 900,
        "requests_per_day": 21600
      },
      "query": {
        "requests_per_minute": 20,
        "requests_per_hour": 1200,
        "requests_per_day": 28800
      }
    },
    "endpoints": [...],
    "version": "1.0.0",
    "documentation_url": "/api/docs"
  }
}
```

## 🔧 **Rate Limiting**

### **Implementation**
- **In-memory rate limiter** with automatic cleanup
- **Configurable limits** per endpoint
- **Rate limit headers** included in responses
- **Graceful degradation** when limits exceeded

### **Rate Limits**
- **Code Analysis:** 10 requests/minute
- **Code Conversion:** 15 requests/minute
- **Natural Language Query:** 20 requests/minute
- **API Status:** 60 requests/minute

### **Headers**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1704110460
```

## 🔗 **Webhook Support**

### **Configuration**
Set `WEBHOOK_URL` environment variable to enable webhook notifications.

### **Webhook Events**
- **`code_analyzed`**: When code analysis is completed
- **`code_converted`**: When code conversion is completed
- **`query_processed`**: When natural language query is processed

### **Webhook Payload**
```json
{
  "event": "code_analyzed",
  "user_id": "api_user_abc123",
  "language": "javascript",
  "level": "intermediate",
  "bugs_detected": false,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🔒 **Security Features**

### **CORS Support**
- **Cross-origin requests** enabled
- **Configurable origins** for production
- **Preflight request handling**

### **Input Validation**
- **Required field validation**
- **Data type checking**
- **Language support validation**
- **Request size limits**

### **Error Handling**
- **Comprehensive error messages**
- **Request ID tracking**
- **Graceful fallbacks**
- **Detailed logging**

## 📋 **Environment Variables**

### **Required**
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### **Optional**
```bash
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
MONGODB_URI=your_mongodb_connection_string
```

## 🎨 **API Documentation**

### **Interactive Documentation**
- **Live API testing** interface
- **Code examples** in multiple languages
- **Request/response examples**
- **Rate limit information**

### **Features**
- **Endpoint navigation** with sidebar
- **Real-time API testing**
- **cURL and JavaScript examples**
- **Response visualization**
- **Error handling examples**

## 🚀 **Usage Examples**

### **JavaScript**
```javascript
// Code Analysis
const response = await fetch('/api/public/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'function test() { return "hello"; }',
    language: 'javascript',
    level: 'intermediate'
  })
});

const data = await response.json();
console.log(data.data.analysis);
```

### **cURL**
```bash
# Code Conversion
curl -X POST "https://your-domain.com/api/public/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "function test() { return \"hello\"; }",
    "source_language": "javascript",
    "target_language": "python"
  }'
```

### **Python**
```python
import requests

# Natural Language Query
response = requests.post('https://your-domain.com/api/public/query', json={
    'query': 'What does this function do?',
    'code': 'function test() { return "hello"; }'
})

data = response.json()
print(data['data']['answer'])
```

## 📊 **Response Headers**

### **Standard Headers**
```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
```

### **Rate Limit Headers**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1704110460
```

### **Custom Headers**
```
X-Request-ID: req_1704110400000_abc123
X-API-Version: 1.0.0
```

## 🔍 **Error Responses**

### **400 Bad Request**
```json
{
  "error": "Missing required field",
  "message": "Code is required",
  "required_fields": ["code"],
  "optional_fields": ["language", "level", "api_key"]
}
```

### **429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

### **500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again.",
  "request_id": "req_1704110400000_abc123"
}
```

## 🧪 **Testing**

### **API Testing**
- **Interactive testing** in documentation
- **Real-time response** visualization
- **Error scenario** testing
- **Rate limit** testing

### **Integration Testing**
- **Webhook delivery** testing
- **CORS functionality** testing
- **Rate limiting** validation
- **Error handling** verification

## 📈 **Monitoring**

### **Health Checks**
- **Service status** monitoring
- **Uptime tracking**
- **Performance metrics**
- **Error rate monitoring**

### **Analytics**
- **Request volume** tracking
- **Endpoint usage** statistics
- **Error rate** analysis
- **Response time** monitoring

## 🔄 **Future Enhancements**

### **Planned Features**
- **Authentication** system
- **API key management**
- **Usage analytics** dashboard
- **Advanced rate limiting**
- **Webhook retry logic**
- **Response caching**

### **Scalability**
- **Redis integration** for rate limiting
- **Load balancing** support
- **CDN integration**
- **Database optimization**

This implementation provides a robust, scalable, and developer-friendly public API that enables external integrations while maintaining security and performance standards. 