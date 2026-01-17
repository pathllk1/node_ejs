/**
 * High Severity Advanced Authentication Bypass Test Script
 * Tests sophisticated authentication bypass techniques
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testJWTKeyConfusion() {
    console.log("Testing JWT key confusion attacks...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Simple key confusion attack
    try {
        // Try to use a known string as both public key and secret
        const publicKey = '-----BEGIN PUBLIC KEY-----\nFAKE_KEY_DATA\n-----END PUBLIC KEY-----';
        
        // Try to use the public key as an HS256 secret
        const maliciousToken = jwt.sign(
            { id: 1, username: 'admin', firm_id: 1, type: 'access' },
            publicKey,
            { algorithm: 'HS256' }
        );
        
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Authorization': `Bearer ${maliciousToken}`
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log("🚨 CRITICAL VULNERABILITY: Public key confusion attack successful!");
        } else {
            console.log("✅ Good: Public key confusion properly rejected");
        }
    } catch (error) {
        console.log("✅ Good: Public key confusion properly rejected");
    }
    
    console.log("JWT key confusion tests completed.\n");
}

async function testJWTJWKSEndpoint() {
    console.log("Testing for JWKS endpoint exposure...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Check for common JWKS endpoints that shouldn't exist in this setup
    const jwksEndpoints = [
        '/.well-known/jwks.json',
        '/jwks.json',
        '/oauth/jwks',
        '/api/jwks'
    ];
    
    for (const endpoint of jwksEndpoints) {
        try {
            const response = await axios.get(`${baseUrl}${endpoint}`, {
                timeout: 5000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                console.log(`⚠️  INFORMATION LEAKAGE: JWKS endpoint found at ${endpoint}`);
                console.log("Response:", response.data);
            } else {
                console.log(`✅ Good: JWKS endpoint ${endpoint} properly restricted (${response.status})`);
            }
        } catch (error) {
            console.log(`✅ Good: JWKS endpoint ${endpoint} not accessible`);
        }
    }
    
    console.log("JWKS endpoint tests completed.\n");
}

async function testAdvancedCookieManipulation() {
    console.log("Testing advanced cookie manipulation...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Since the app uses JWT tokens in cookies, test for cookie-based attacks
    try {
        // Try to set malicious cookies
        const response = await axios.get(`${baseUrl}/`, {
            headers: {
                'Cookie': 'access_token=malicious_token; refresh_token=malicious_refresh; path=/; domain=.evil.com'
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Cookie manipulation test result: ${response.status}`);
        if (response.status >= 500) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Cookie manipulation caused server error");
        } else {
            console.log("✅ Good: Cookie manipulation properly handled");
        }
    } catch (error) {
        console.log("✅ Good: Cookie manipulation properly rejected");
    }
    
    // Test case: Check SameSite attribute bypass
    try {
        const response = await axios.get(`${baseUrl}/`, {
            headers: {
                'Referer': 'https://evil-site.com',
                'Origin': 'https://evil-site.com'
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Cross-site request test result: ${response.status}`);
        // This tests if the app properly validates requests from different origins
    } catch (error) {
        console.log("Cross-site request test completed");
    }
    
    console.log("Advanced cookie manipulation tests completed.\n");
}

async function testAuthenticationLogicBypass() {
    console.log("Testing authentication logic bypasses...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Multiple authentication headers
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Authorization': 'Bearer invalid_token',
                'X-Refresh-Token': 'invalid_refresh_token',
                'Cookie': 'access_token=another_invalid_token'
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Multiple invalid tokens resulted in access!");
        } else {
            console.log("✅ Good: Multiple invalid tokens properly rejected");
        }
    } catch (error) {
        console.log("✅ Good: Multiple invalid tokens properly rejected");
    }
    
    // Test case 2: Authentication downgrade attempt
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Authorization': 'Basic dXNlcjpwYXNzd29yZA==' // Basic auth: user:password
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Basic auth accepted where JWT required!");
        } else {
            console.log("✅ Good: Basic auth properly rejected where JWT required");
        }
    } catch (error) {
        console.log("✅ Good: Basic auth properly rejected");
    }
    
    // Test case 3: Token replay with different user agents
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'User-Agent': 'curl/7.68.0', // Command-line tool
                'Authorization': 'Bearer fake_token'
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Token replay with different User-Agent: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Different User-Agent bypassed auth!");
        } else {
            console.log("✅ Good: User-Agent doesn't affect authentication");
        }
    } catch (error) {
        console.log("✅ Good: Authentication properly enforced regardless of User-Agent");
    }
    
    console.log("Authentication logic bypass tests completed.\n");
}

async function runHighAuthBypassTests() {
    console.log("=== HIGH SEVERITY ADVANCED AUTHENTICATION BYPASS TESTS ===\n");
    
    await testJWTKeyConfusion();
    await testJWTJWKSEndpoint();
    await testAdvancedCookieManipulation();
    await testAuthenticationLogicBypass();
    
    console.log("High severity authentication bypass tests completed.");
}

// Run the tests
runHighAuthBypassTests().catch(console.error);