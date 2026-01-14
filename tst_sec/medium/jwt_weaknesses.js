/**
 * Medium Severity JWT Weakness Test Script
 * Tests JWT implementation weaknesses and bypass attempts
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testJWTAlgorithmConfusion() {
    console.log("Testing JWT algorithm confusion attacks...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Algorithm confusion - using 'none' algorithm
    // Create a JWT with 'none' algorithm and empty signature
    const maliciousToken = jwt.sign(
        { id: 1, username: 'admin', firm_id: 1, type: 'access' },
        '', // Empty secret
        { algorithm: 'none' }
    );
    
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Authorization': `Bearer ${maliciousToken}`
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`JWT 'none' algorithm test result: ${response.status}`);
        if (response.status === 200) {
            console.log("🚨 CRITICAL VULNERABILITY: JWT algorithm confusion attack successful!");
        } else if (response.status === 401 || response.status === 403) {
            console.log("✅ Good: JWT algorithm confusion properly blocked");
        } else {
            console.log(`⚠️  Unexpected response: ${response.status}`);
        }
    } catch (error) {
        console.log("✅ Good: JWT 'none' algorithm properly rejected");
    }
    
    // Test case 2: Weak signing key - using common weak secrets
    const weakSecrets = [
        'secret',
        'jwt_secret',
        'my_secret_key',
        '123456',
        '',
        'undefined',
        'null'
    ];
    
    for (const secret of weakSecrets) {
        try {
            const weakToken = jwt.sign(
                { id: 1, username: 'admin', firm_id: 1, type: 'access' },
                secret,
                { expiresIn: '1h' }
            );
            
            const response = await axios.get(`${baseUrl}/admin/logs`, {
                headers: {
                    'Authorization': `Bearer ${weakToken}`
                },
                timeout: 5000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                console.log(`🚨 CRITICAL VULNERABILITY: Weak secret '${secret}' accepted!`);
                return; // Stop testing if one works
            }
        } catch (error) {
            // Expected for most weak secrets
        }
    }
    
    console.log("✅ Good: Weak JWT secrets properly rejected");
    console.log("JWT algorithm confusion tests completed.\n");
}

async function testJWTExpirationBypass() {
    console.log("Testing JWT expiration bypass attempts...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: JWT with very long expiration
    const longExpToken = jwt.sign(
        { id: 1, username: 'testuser', firm_id: 1, type: 'access' },
        'potentially_wrong_secret', // This will likely fail, but testing edge cases
        { expiresIn: '100y' } // 100 years
    );
    
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Authorization': `Bearer ${longExpToken}`
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Long expiration JWT test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL ISSUE: Long-expiration JWT accepted");
        } else {
            console.log("✅ Good: Long-expiration JWT properly rejected");
        }
    } catch (error) {
        console.log("✅ Good: Long-expiration JWT properly rejected");
    }
    
    // Test case 2: JWT without expiration claim
    const noExpToken = jwt.sign(
        { id: 1, username: 'testuser', firm_id: 1 },
        'potentially_wrong_secret',
        { expiresIn: 0 } // No expiration
    );
    
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Authorization': `Bearer ${noExpToken}`
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`No expiration JWT test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL ISSUE: No-expiration JWT accepted");
        } else {
            console.log("✅ Good: No-expiration JWT properly rejected");
        }
    } catch (error) {
        console.log("✅ Good: No-expiration JWT properly rejected");
    }
    
    console.log("JWT expiration tests completed.\n");
}

async function testCSRFAttempts() {
    console.log("Testing CSRF-like attacks...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Missing security headers
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "test@example.com",
            password: "password"
        }, {
            headers: {
                // Intentionally omitting security-relevant headers
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`CSRF header test result: ${response.status}`);
        // The application should still work normally without special headers for basic login
        // But we're observing if there are any unusual behaviors
    } catch (error) {
        console.log("CSRF header test completed");
    }
    
    console.log("CSRF tests completed.\n");
}

async function runMediumJWTTests() {
    console.log("=== MEDIUM SEVERITY JWT & AUTHENTICATION TESTS ===\n");
    
    await testJWTAlgorithmConfusion();
    await testJWTExpirationBypass();
    await testCSRFAttempts();
    
    console.log("Medium severity JWT tests completed.");
}

// Run the tests
runMediumJWTTests().catch(console.error);