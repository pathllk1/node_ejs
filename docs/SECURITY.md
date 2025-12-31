# Security Documentation

This document provides comprehensive information about the security implementation of the Secure Express.js Authentication Application.

## 🛡️ Security Architecture Overview

The application implements a multi-layered security architecture designed to protect against common web vulnerabilities and ensure data integrity.

### Security Layers

1. **Input Validation & Sanitization**
2. **Authentication & Authorization**
3. **Content Security Policy (CSP)**
4. **Security Headers**
5. **Request Logging & Monitoring**
6. **Database Security**

## 🔒 Authentication System

### Dual-Token Architecture

The application uses a sophisticated dual-token authentication system:

#### Access Tokens
- **Lifetime**: 15 minutes
- **Purpose**: API request authentication
- **Storage**: Client-side (localStorage)
- **Transmission**: `Authorization: Bearer <token>` header

#### Refresh Tokens
- **Lifetime**: 7 days
- **Purpose**: Obtaining new access tokens
- **Storage**: Client-side (localStorage)
- **Transmission**: `X-Refresh-Token` header

### Auto-Refresh Mechanism

The application implements transparent token refresh:

1. **Request Flow**:
   ```mermaid
   graph LR
   A[Client Request] --> B[Send Both Tokens]
   B --> C[Server Validates Access Token]
   C --> D{Access Token Valid?}
   D -->|Yes| E[Process Request]
   D -->|No| F[Check Refresh Token]
   F --> G[Generate New Tokens]
   G --> H[Return Response + New Tokens]
   E --> I[Return Response]
   ```

2. **Client-Side Handling**:
   - Intercepts all requests to add tokens
   - Checks for new tokens in response headers
   - Automatically updates stored tokens
   - Handles 401 errors with redirect to login

### Password Security

- **Hashing Algorithm**: bcrypt with salt rounds
- **Salt**: Automatically generated per password
- **Storage**: Only hashed passwords stored in database
- **No Plain Text**: Passwords never stored in plain text

## 🚫 Input Sanitization

### XSS Protection

All incoming requests are sanitized using the `xss` library:

```javascript
// middleware/sanitizer.js
const xss = require('xss');

function sanitizeInput(input) {
  return xss(input, {
    whiteList: {}, // Allow no HTML tags
    stripIgnoreTag: true, // Remove all HTML tags
    stripIgnoreTagBody: ['script'] // Remove script content
  });
}
```

### Sanitization Targets

- **Request Body**: POST data
- **Query Parameters**: URL parameters
- **Route Parameters**: Dynamic route segments

### Example Protection

```javascript
// Input: "<img src=x onerror='alert(1)'>"
// Output: "<img src=x>" // onclick attribute removed
```

## 🎯 Content Security Policy (CSP)

### Strict CSP Implementation

The application implements strict CSP policies to prevent code injection attacks:

```javascript
// middleware/csp.js
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; '));
  next();
});
```

### CSP Directives

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Block all external content |
| `script-src` | `'self'` | Only allow same-origin scripts |
| `style-src` | `'self' https://fonts.googleapis.com` | Allow Google Fonts CSS |
| `font-src` | `'self' https://fonts.gstatic.com` | Allow Google Fonts |
| `img-src` | `'self' data: https:` | Allow images from same origin and HTTPS |
| `connect-src` | `'self'` | Only allow same-origin API calls |
| `frame-ancestors` | `'none'` | Prevent clickjacking |
| `form-action` | `'self'` | Only allow form submission to same origin |
| `object-src` | `'none'` | Block plugins (Flash, Java) |
| `upgrade-insecure-requests` | - | Auto-upgrade HTTP to HTTPS |
| `block-all-mixed-content` | - | Block HTTP content on HTTPS pages |

## 🔐 Security Headers

### Comprehensive Header Protection

The application sets multiple security headers:

```javascript
// Additional security headers
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
```

### Header Descriptions

| Header | Purpose |
|--------|---------|
| `X-Content-Type-Options: nosniff` | Prevent MIME type sniffing |
| `X-XSS-Protection: 1; mode=block` | Enable XSS filter in older browsers |
| `X-Frame-Options: DENY` | Prevent clickjacking attacks |
| `Referrer-Policy: strict-origin-when-cross-origin` | Control referrer information |
| `Cross-Origin-Opener-Policy: same-origin` | Isolate from cross-origin openers |
| `Cross-Origin-Resource-Policy: same-origin` | Prevent cross-origin resource sharing |
| `Permissions-Policy` | Restrict browser features |

## 📊 Request Logging

### Audit Trail Implementation

All incoming requests are logged for security monitoring:

```javascript
// middleware/requestLogger.js
app.use((req, res, next) => {
  const logEntry = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    user_agent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // Log to database
  db.prepare(`
    INSERT INTO request_logs (method, url, ip, user_agent, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(logEntry.method, logEntry.url, logEntry.ip, logEntry.user_agent, logEntry.timestamp);

  next();
});
```

### Log Fields

- **Method**: HTTP method (GET, POST, etc.)
- **URL**: Requested endpoint
- **IP**: Client IP address
- **User Agent**: Browser/client information
- **Timestamp**: Request time (ISO format)

### Log Access

Request logs can be queried for:
- Security incident investigation
- Traffic analysis
- User behavior monitoring
- Performance optimization

## 🗄️ Database Security

### SQLite with WAL Mode

```javascript
// config/db.js
const db = new Database(path.join(__dirname, './app.db'));
db.pragma('journal_mode = WAL'); // Write-Ahead Logging for concurrency
```

### Database Schema Security

```sql
-- Users table with strict constraints
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  fullname TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

-- Request logs table
CREATE TABLE request_logs (
  id INTEGER PRIMARY KEY,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;
```

### Security Measures

- **Parameterized Queries**: All database operations use parameterized queries
- **Input Validation**: All inputs validated before database operations
- **Unique Constraints**: Username and email must be unique
- **Strict Mode**: SQLite strict mode enabled for data integrity

## 🚨 Threat Mitigation

### XSS (Cross-Site Scripting)

**Protection**:
- Input sanitization with `xss` library
- CSP blocking inline scripts and eval()
- Content-Type validation

**Testing**:
```javascript
// Test input
const maliciousInput = "<script>alert('XSS')</script>";
// Expected output: "<script>alert('XSS')</script>"
```

### CSRF (Cross-Site Request Forgery)

**Protection**:
- Token-based authentication
- Same-origin policy enforcement
- CORS headers (future implementation)

### Clickjacking

**Protection**:
- `X-Frame-Options: DENY`
- `frame-ancestors 'none'` in CSP

### MIME Type Sniffing

**Protection**:
- `X-Content-Type-Options: nosniff`
- Proper Content-Type headers

### Unauthorized Access

**Protection**:
- JWT token verification on all protected endpoints
- Token expiration and refresh mechanism
- Secure password hashing

### Token Theft Mitigation

**Protection**:
- Short-lived access tokens (15 minutes)
- Refresh tokens only used when needed
- Headers-only token transmission (not in URL)

## 🔧 Security Configuration

### Environment Variables

For production deployment, use environment variables:

```bash
# Security secrets
JWT_SECRET=your-256-bit-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Database
DB_PATH=./config/app.db

# Server
PORT=3000
NODE_ENV=production
```

### HTTPS Configuration

In production, ensure HTTPS is enabled:

```javascript
// Force HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

## 🧪 Security Testing

### Manual Testing Checklist

- [ ] CSP headers present in all responses
- [ ] XSS attempts blocked by sanitizer
- [ ] Google Fonts loads correctly
- [ ] All API requests include both tokens
- [ ] Token refresh works transparently
- [ ] 401 errors redirect to login
- [ ] Dashboard loads after authentication
- [ ] Logout clears all tokens
- [ ] No inline script executions
- [ ] No external scripts loaded
- [ ] HTTPS upgrade working
- [ ] Clickjacking protection active

### Automated Testing

Consider implementing automated security tests:

```javascript
// Example security test
describe('Security Headers', () => {
  it('should include CSP header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  it('should include X-Frame-Options header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });
});
```

## 📋 Security Best Practices

### Development

1. **Never commit secrets** to version control
2. **Use environment variables** for configuration
3. **Validate all inputs** on both client and server
4. **Use HTTPS** in production
5. **Keep dependencies updated**

### Production

1. **Enable HTTPS** with valid certificates
2. **Implement rate limiting** for API endpoints
3. **Monitor logs** for suspicious activity
4. **Regular security audits** and updates
5. **Backup database** regularly

### Monitoring

1. **Log analysis** for unusual patterns
2. **Performance monitoring** for DoS attacks
3. **Security scanning** for vulnerabilities
4. **User activity tracking** for anomalies

## 🆘 Incident Response

### Security Breach Protocol

1. **Immediate Actions**:
   - Disable affected accounts
   - Rotate all JWT secrets
   - Review access logs
   - Notify users if necessary

2. **Investigation**:
   - Analyze request logs
   - Check for data exfiltration
   - Identify attack vectors
   - Assess impact scope

3. **Remediation**:
   - Patch vulnerabilities
   - Update security measures
   - Enhance monitoring
   - Document lessons learned

### Contact Information

For security issues or vulnerabilities:
- Report via GitHub Issues
- Include detailed reproduction steps
- Provide impact assessment
- Suggest potential fixes if possible

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Note**: This security implementation is designed for educational and demonstration purposes. For production applications, consider additional security measures such as rate limiting, more comprehensive input validation, and regular security audits.