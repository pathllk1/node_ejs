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

### Authentication

#### POST /api/auth/login

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
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "number",
    "fullname": "string",
    "username": "string",
    "email": "string"
  }
}
```

**Response Headers:**
- `X-Access-Token`: Access token (15 minutes)
- `X-Refresh-Token`: Refresh token (7 days)

**Error Responses:**
- 400 Bad Request: Missing or invalid credentials
- 401 Unauthorized: Invalid credentials
- 500 Internal Server Error: Server error

#### POST /api/auth/signup

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
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "number",
    "fullname": "string",
    "username": "string",
    "email": "string"
  }
}
```

**Error Responses:**
- 400 Bad Request: Missing or invalid data
- 409 Conflict: Username or email already exists
- 500 Internal Server Error: Server error

#### POST /api/auth/logout

Logout user and invalidate tokens.

**Request Headers:**
```http
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Responses:**
- 401 Unauthorized: Invalid or missing tokens
- 500 Internal Server Error: Server error

### User Management

#### GET /api/users/profile

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

### Rate Limiting

Consider implementing rate limiting in production:
- Limit login attempts per IP address
- Limit API requests per user
- Implement CAPTCHA for suspicious activity

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
```

### Using Postman

1. Create a new collection
2. Add requests for each endpoint
3. Use environment variables for tokens
4. Add pre-request scripts for token management
5. Use test scripts to extract and store tokens

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