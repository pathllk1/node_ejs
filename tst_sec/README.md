# Security Testing Suite

This directory contains a comprehensive set of security testing scripts organized by severity level. Each level includes multiple approaches to test different aspects of the application's security posture.

## Directory Structure

```
tst_sec/
├── low/                    # Low severity tests (basic vulnerabilities)
│   ├── sql_injection_basic.js
│   ├── auth_bypass_basic.js
│   └── input_validation_basic.js
├── medium/                 # Medium severity tests (advanced techniques)
│   ├── sql_injection_advanced.js
│   ├── jwt_weaknesses.js
│   └── insecure_deserialization.js
├── high/                   # High severity tests (exploitation attempts)
│   ├── oauth_jwt_exploit.js
│   ├── server_side_vulnerabilities.js
│   └── advanced_auth_bypass.js
├── most_tight/             # Most severe tests (advanced persistent attacks)
│   ├── zero_day_exploits.js
│   ├── supply_chain_attack.js
│   └── comprehensive_penetration.js
└── README.md               # This file
```

## Test Categories

### Low Severity Tests
- Basic SQL injection attempts
- Simple XSS payloads
- Authentication bypass with obvious techniques
- Input validation bypasses
- Parameter pollution
- Path traversal attempts

### Medium Severity Tests
- Advanced SQL injection (time-based, boolean-based, error-based)
- JWT algorithm confusion attacks
- Prototype pollution
- Mass assignment vulnerabilities
- Content-type abuse
- Session fixation attempts

### High Severity Tests
- Server-side request forgery (SSRF)
- JWT signing key leakage
- Timing attacks
- Advanced JWT manipulations
- File upload bypasses
- Business logic flaws
- Environment variable exposure

### Most Tight/Advanced Tests
- Multi-vector attack combinations
- Advanced evasion techniques
- Zero-day exploit simulations
- Supply chain attacks
- Cryptographic attack simulations
- AI/ML model exposure tests
- Complex business logic attacks

## Running Tests

Before running any tests, make sure the application is running:

```bash
npm start
# or
node ./bin/www
```

Then run individual test files:

```bash
# Install dependencies if not already installed
npm install axios jsonwebtoken

# Run a specific test
node tst_sec/low/sql_injection_basic.js

# Run all tests in a category
node tst_sec/medium/sql_injection_advanced.js
node tst_sec/medium/jwt_weaknesses.js
node tst_sec/medium/insecure_deserialization.js
```

## Security Coverage

### Authentication & Authorization
- JWT implementation vulnerabilities
- Token manipulation and replay
- Algorithm confusion attacks
- Session management flaws
- Privilege escalation attempts
- Multi-factor authentication bypasses

### Input Validation & Sanitization
- SQL injection (various types)
- Cross-site scripting (XSS)
- Command injection
- Path traversal
- Format string vulnerabilities
- Integer overflow/underflow

### Business Logic
- Race conditions
- Parameter tampering
- Workflow bypasses
- State management issues
- Access control flaws
- Transaction integrity

### Infrastructure
- Server-side request forgery (SSRF)
- File inclusion vulnerabilities
- Resource exhaustion
- Denial of service
- Cache poisoning
- HTTP parameter pollution

### Data Protection
- Cryptographic implementation flaws
- Weak randomness
- Padding oracle attacks
- Information disclosure
- Data exposure
- Token leakage

## Risk Assessment

Each test script includes risk indicators:
- ✅ Good: Security measure is working properly
- ⚠️  Warning: Potential issue that needs investigation
- 🚨 Critical: Severe vulnerability detected
- 📋 Info: Informational finding

## Responsible Disclosure

These tests are designed for authorized security assessments only. Ensure you have explicit permission before running these tests against any system you do not own. Never use these tests for unauthorized access or malicious purposes.

## Dependencies

The test scripts require the following npm packages:
- `axios` - for making HTTP requests
- `jsonwebtoken` - for JWT manipulation tests

Install with:
```bash
npm install axios jsonwebtoken
```

## Test Results Interpretation

- **Green indicators (✅)**: Security controls are functioning properly
- **Yellow indicators (⚠️)**: Potential security issues requiring manual review
- **Red indicators (🚨)**: Confirmed security vulnerabilities requiring immediate attention
- **Gray indicators (📋)**: Informational findings for awareness

## Remediation Recommendations

Based on test results, consider implementing:
- Enhanced input validation and sanitization
- Improved authentication and authorization checks
- Better error handling without information disclosure
- Rate limiting and request throttling
- Stronger cryptographic implementations
- Regular security code reviews
- Automated security testing in CI/CD pipeline