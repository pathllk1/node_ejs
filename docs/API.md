# API Documentation

This document describes the RESTful API endpoints provided by the Secure Express.js Authentication Application.

## Base URL

```
http://localhost:3000
```

## Authentication

All API endpoints (except login and signup) require authentication via JWT tokens.

### Token Format

The application uses a dual-token system:

- **Access Token**: Short-lived token (15 minutes) for API requests
- **Refresh Token**: Long-lived token (7 days) for obtaining new access tokens

### Request Headers

For authenticated requests, include both tokens in the headers:

```http
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

### Auto-Refresh Mechanism

The application automatically refreshes tokens when the access token expires:

1. Client sends request with both tokens
2. Server checks access token validity
3. If expired but refresh token is valid:
   - Server generates new tokens
   - Returns new tokens in response headers:
     - `X-New-Access-Token`: New access token
     - `X-New-Refresh-Token`: New refresh token
4. Client interceptor automatically updates stored tokens

## Endpoints

### Authentication (implemented under `/users`)

#### POST /users/login

Authenticate a user and return JWT tokens.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "user": {
    "username": "string",
    "fullname": "string"
  }
}
```

**Error Responses:**
- 400 Bad Request: Missing or invalid credentials
- 401 Unauthorized: Invalid credentials
- 500 Internal Server Error: Server error

#### POST /users/signup

Register a new user account.

**Request Body:**
```json
{
  "fullname": "string",
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response (201 Created):**
```json
{
  "message": "Account created successfully! Please login."
}
```

**Error Responses:**
- 400 Bad Request: Missing or invalid data
- 409 Conflict: Username or email already exists
- 500 Internal Server Error: Server error

#### Logout

There is no dedicated server-side logout endpoint in the current implementation.
Client-side logout is done by clearing stored tokens (localStorage/cookies) and redirecting to `/users/login`.

### User Management (implemented under `/users`)

#### GET /users/api/profile

Get current user profile information.

**Request Headers:**
```http
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "number",
    "fullname": "string",
    "username": "string",
    "email": "string",
    "created_at": "string (ISO date)",
    "updated_at": "string (ISO date)"
  }
}
```

**Error Responses:**
- 401 Unauthorized: Invalid or missing tokens
- 500 Internal Server Error: Server error

### AI Integration (mounted under `/ai` and protected)

#### POST /ai/api/ai-check

Analyze text sentiment using AI microservice.

**Request Headers:**
```http
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

**Request Body:**
```json
{
  "message": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "analysis_result": "Positive|Negative|Neutral",
    "confidence_score": 0.0-1.0,
    "original_text": "string"
  }
}
```

**Error Responses:**
- 400 Bad Request: Missing message field
- 401 Unauthorized: Invalid or missing tokens
- 500 Internal Server Error: AI service unavailable

#### POST /ai/api/chat

Engage in conversation with AI assistant.

**Request Headers:**
```http
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

**Request Body:**
```json
{
  "message": "string",
  "history": [
    {
      "role": "user|assistant",
      "content": "string"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "reply": "string",
  "success": true
}
```

**Error Responses:**
- 400 Bad Request: Missing message field
- 401 Unauthorized: Invalid or missing tokens
- 500 Internal Server Error: AI service unavailable

### Admin Endpoints (mounted under `/admin` and protected)

#### GET /admin/logs

View system request logs (requires authentication).

**Request Headers:**
```http
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

**Response (200 OK):**
```json
{
  "layout": "layouts/main",
  "title": "System Logs",
  "logs": [
    {
      "id": "number",
      "method": "string",
      "url": "string",
      "ip": "string",
      "timestamp": "string (ISO date)"
    }
  ]
}
```

**Error Responses:**
- 401 Unauthorized: Invalid or missing tokens
- 500 Internal Server Error: Database or service error

## Token Transport and Refresh (important)

### Request headers (primary)

For authenticated API requests, the client should send:

```http
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

### Refresh behavior

If the access token is expired and the refresh token is valid, the server returns new tokens via headers:

```http
X-New-Access-Token: <new_access_token>
X-New-Refresh-Token: <new_refresh_token>
```

The server also sets cookies `access_token` and `refresh_token` (SameSite=Strict) as a fallback for browser refresh flows.

## Additional protected modules (high-level)

The following route prefixes are mounted and protected by JWT:

- **`/inventory`**, **`/inventory/sls`**, **`/inventory/prs`**
- **`/ledger`**
- **`/masterrolls`**

Each module exposes multiple `*/api/*` endpoints under its prefix (see route files in `routes/`).

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "string",
  "message": "string"
}
```

### Common Error Codes

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or invalid tokens
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate username)
- **500 Internal Server Error**: Server error
- **502 Bad Gateway**: Microservice unavailable
- **503 Service Unavailable**: Service temporarily unavailable

## Security Considerations

### Token Security

1. **Storage**: Tokens are stored in localStorage on the client
2. **Transmission**: Tokens are sent in HTTP headers, not URLs
3. **Expiration**: Access tokens expire after 15 minutes
4. **Refresh**: Refresh tokens are only used when access token expires
5. **Invalidation**: Tokens are invalidated on logout

### Input Validation

All input is validated and sanitized:

- **XSS Protection**: Input is sanitized using the `xss` library
- **SQL Injection**: Database queries use parameterized statements
- **Password Security**: Passwords are hashed using bcrypt
- **AI Input**: Text inputs are validated before AI processing

### Rate Limiting

Consider implementing rate limiting in production:

- Limit login attempts per IP address
- Limit API requests per user
- Implement CAPTCHA for suspicious activity
- Rate limit AI service calls

### Microservice Security

- **Internal Communication**: Microservice endpoints are internal-only
- **Authentication**: All microservice calls require authentication
- **Input Validation**: AI service validates all inputs
- **Error Handling**: Graceful error handling without information leakage

## Client-Side Implementation

### JavaScript Example

```javascript
// Login
async function login(username, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    const data = await response.json();
    const accessToken = response.headers.get('X-Access-Token');
    const refreshToken = response.headers.get('X-Refresh-Token');

    // Store tokens
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    return data;
  } else {
    throw new Error('Login failed');
  }
}

// Make authenticated request
async function makeAuthenticatedRequest(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'X-Refresh-Token': refreshToken
    }
  });

  // Check for new tokens
  const newAccessToken = response.headers.get('X-New-Access-Token');
  const newRefreshToken = response.headers.get('X-New-Refresh-Token');

  if (newAccessToken && newRefreshToken) {
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
  }

  return response;
}

// AI Analysis
async function analyzeSentiment(text) {
  const response = await window.api.post('/ai/api/ai-check', { message: text });
  return response.json();
}

// AI Chat
async function chatWithAI(message, history = []) {
  const response = await window.api.post('/ai/api/chat', { message, history });
  return response.json();
}
```

### Auto-Refresh Implementation

The application includes automatic token refresh functionality:

1. **Request Interceptor**: Adds tokens to all requests
2. **Response Interceptor**: Checks for new tokens and updates storage
3. **Error Handling**: Redirects to login on 401 errors

## Testing the API

### Using curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Get profile (replace with actual tokens)
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Refresh-Token: <refresh_token>"

# AI Analysis
curl -X POST http://localhost:3000/ai/api/ai-check \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Refresh-Token: <refresh_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"I love this application!"}'

# Admin Logs
curl -X GET http://localhost:3000/admin/logs \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Refresh-Token: <refresh_token>"
```

### Using Postman

1. Create a new collection
2. Add requests for each endpoint
3. Use environment variables for tokens
4. Add pre-request scripts for token management
5. Use test scripts to extract and store tokens
6. Test AI endpoints with authentication

### Python Microservice Testing

```bash
# Health check
curl http://localhost:5200/

# AI Analysis (internal)
curl -X POST http://localhost:5200/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"I love this application!"}'

# Chat (internal)
curl -X POST http://localhost:5200/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello", "history":[]}'

# Logs (internal)
curl http://localhost:5200/logs
```

## Development Notes

### Middleware Stack

The API uses the following middleware in order:

1. **CSP Headers**: Content Security Policy
2. **Input Sanitization**: XSS protection
3. **Request Logging**: Audit trail
4. **Authentication**: Token verification (for protected routes)

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  fullname TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Request logs table
CREATE TABLE request_logs (
  id INTEGER PRIMARY KEY,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Environment Variables

For production deployment, consider using environment variables:

```bash
PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
DB_PATH=./config/app.db
OPENROUTER_API_KEY=your-openrouter-api-key
```

### Microservice Configuration

```bash
# Python service
cd python_service
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install fastapi uvicorn openai python-dotenv

# Start service
uvicorn main:app --reload --port 5200
```

## Architecture Notes

### Service Communication

- **Node.js (3000)**: Main application server
- **Python (5200)**: AI microservice
- **SQLite**: Shared database
- **JWT**: Authentication tokens

### Security Flow

1. User authenticates with Node.js server
2. Tokens stored in localStorage
3. All requests include tokens in headers
4. Node.js validates tokens and forwards to Python service
5. Python service processes AI requests
6. Responses returned through Node.js to client

### Error Handling Strategy

1. **Client-side**: Token refresh and retry logic
2. **Server-side**: Graceful error responses
3. **Microservice**: Circuit breaker patterns
4. **Database**: Connection pooling and error recovery