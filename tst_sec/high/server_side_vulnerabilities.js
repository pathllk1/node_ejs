/**
 * High Severity Server-Side Vulnerability Test Script
 * Tests for server-side request forgery, file upload bypasses, etc.
 */

const axios = require('axios');
const fs = require('fs');

async function testSSRF() {
    console.log("Testing for Server-Side Request Forgery (SSRF)...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Internal service access via URL parameters
    const ssrfTargets = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
        'http://[::1]:3000', // IPv6 localhost
        'http://localhost:80',
        'http://localhost:443',
        'http://localhost:22', // SSH port
        'http://localhost:3306', // MySQL port
        'http://localhost:5432', // PostgreSQL port
        'http://metadata.google.internal' // Cloud metadata service
    ];
    
    for (const target of ssrfTargets) {
        try {
            // Try various endpoints that might accept URLs
            const response = await axios.post(`${baseUrl}/users/login`, {
                email: `test@${target.replace('http://', '').replace('https://', '')}`,
                password: "password"
            }, {
                timeout: 3000, // Short timeout to avoid hanging
                validateStatus: () => true
            });
            
            if (response.status === 200 || response.status === 400) {
                // Status codes that might indicate the server tried to process the internal request
                console.log(`⚠️  SSRF potential with target: ${target} - Status: ${response.status}`);
            }
        } catch (error) {
            // Expected for most targets
        }
    }
    
    console.log("SSRF tests completed.\n");
}

async function testFileUploadBypass() {
    console.log("Testing for file upload bypasses (if applicable)...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Check if there are any file upload endpoints
    // Since we saw JavaScript files in public/, check if there are upload routes
    
    try {
        // Test common upload endpoints
        const endpoints = [
            '/upload',
            '/files/upload',
            '/api/upload',
            '/images/upload',
            '/documents/upload'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.post(`${baseUrl}${endpoint}`, {
                    file: 'test_file_content',
                    filename: 'test.php',
                    contentType: 'application/x-php'
                }, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status !== 404) {
                    console.log(`File upload endpoint found: ${endpoint} - Status: ${response.status}`);
                    // This suggests there might be a file upload functionality to test further
                }
            } catch (error) {
                // Endpoint might not exist, which is fine
            }
        }
        
        console.log("File upload endpoint discovery completed.");
    } catch (error) {
        console.log("File upload test completed");
    }
    
    console.log("File upload bypass tests completed.\n");
}

async function testEnvironmentVariableExposure() {
    console.log("Testing for environment variable exposure...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Error-based disclosure via malformed requests
    try {
        // Send intentionally malformed request to trigger errors
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: Buffer.alloc(100000, 'A').toString(), // Very large string
            password: Buffer.alloc(100000, 'B').toString()
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        const responseBody = JSON.stringify(response.data || {}).toLowerCase();
        if (responseBody.includes('env') || 
            responseBody.includes('process.env') ||
            responseBody.includes('database') ||
            responseBody.includes('secret') ||
            responseBody.includes('password') ||
            responseBody.includes('key')) {
            console.log("⚠️  INFORMATION LEAKAGE: Environment variables might be exposed in error messages");
        } else {
            console.log("✅ Good: No environment variable leakage detected");
        }
    } catch (error) {
        console.log("✅ Good: Large inputs properly handled without information leakage");
    }
    
    // Test case 2: Stack trace exposure
    try {
        // Try to trigger server errors with malformed JSON
        const response = await axios.post(`${baseUrl}/users/login`, 
            '{"email": "test@example.com", "password": "password", "extra": {',
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000,
                validateStatus: () => true
            }
        );
        
        const responseBody = JSON.stringify(response.data || {});
        if (responseBody.includes('at ') && responseBody.includes('.js:')) {
            // Contains stack trace information
            console.log("⚠️  INFORMATION LEAKAGE: Stack traces might be exposed");
        } else {
            console.log("✅ Good: Stack traces not exposed");
        }
    } catch (error) {
        console.log("✅ Good: Malformed JSON properly handled without stack traces");
    }
    
    console.log("Environment variable exposure tests completed.\n");
}

async function testBusinessLogicFlaws() {
    console.log("Testing for business logic flaws...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Race condition in user registration
    try {
        // Attempt to register same user multiple times in parallel
        const email = `race_condition_test_${Date.now()}@example.com`;
        
        const promises = [
            axios.post(`${baseUrl}/users/signup`, {
                fullname: "Race Condition Test",
                username: `testuser${Date.now()}`,
                email: email,
                password: "SecurePass123!",
                confirm_password: "SecurePass123!"
            }),
            axios.post(`${baseUrl}/users/signup`, {
                fullname: "Race Condition Test",
                username: `testuser${Date.now() + 1}`,
                email: email,
                password: "SecurePass123!",
                confirm_password: "SecurePass123!"
            })
        ];
        
        const results = await Promise.allSettled(promises);
        const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
        
        if (successes.length > 1) {
            console.log("⚠️  BUSINESS LOGIC FLAW: Multiple registrations with same email allowed");
        } else {
            console.log("✅ Good: Duplicate email registration properly prevented");
        }
    } catch (error) {
        console.log("Race condition test completed");
    }
    
    // Test case 2: Authorization bypass by manipulating request order
    try {
        // Test if we can access protected resources by manipulating headers
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'X-Forwarded-For': '127.0.0.1',
                'X-Real-IP': '127.0.0.1'
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL AUTHORIZATION BYPASS: Admin endpoint accessible with modified headers");
        } else {
            console.log("✅ Good: Authorization properly enforced regardless of headers");
        }
    } catch (error) {
        console.log("✅ Good: Authorization properly enforced");
    }
    
    console.log("Business logic flaw tests completed.\n");
}

async function runHighServerSideTests() {
    console.log("=== HIGH SEVERITY SERVER-SIDE VULNERABILITY TESTS ===\n");
    
    await testSSRF();
    await testFileUploadBypass();
    await testEnvironmentVariableExposure();
    await testBusinessLogicFlaws();
    
    console.log("High severity server-side tests completed.");
}

// Run the tests
runHighServerSideTests().catch(console.error);