/**
 * Low Severity Authentication Bypass Test Script
 * Tests basic authentication bypass attempts
 */

const axios = require('axios');

async function testBasicAuthBypass() {
    console.log("Testing basic authentication bypass attempts...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Attempt to access protected route without token
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Protected route access without token: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  CRITICAL VULNERABILITY: Access to protected route without authentication!");
        } else if (response.status === 401) {
            console.log("✅ Good: Proper authentication required");
        } else {
            console.log(`⚠️  Unexpected response: ${response.status}`);
        }
    } catch (error) {
        console.log("✅ Good: Access denied properly handled");
    }
    
    // Test case 2: Attempt with malformed JWT token
    try {
        const response = await axios.get(`${baseUrl}/admin/logs`, {
            headers: {
                'Authorization': 'Bearer invalid.token.format'
            },
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Malformed JWT test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  VULNERABILITY: Malformed JWT token accepted!");
        } else if (response.status === 401) {
            console.log("✅ Good: Malformed JWT properly rejected");
        } else {
            console.log(`⚠️  Unexpected response: ${response.status}`);
        }
    } catch (error) {
        console.log("✅ Good: Malformed JWT properly handled");
    }
    
    // Test case 3: Null byte injection in authentication
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "\0admin@example.com",
            password: "password"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Null byte injection test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Null byte injection might work!");
        } else {
            console.log("✅ Good: Null byte injection blocked");
        }
    } catch (error) {
        console.log("✅ Good: Null byte injection handled properly");
    }
    
    console.log("Basic authentication bypass tests completed.\n");
}

async function testParameterPollution() {
    console.log("Testing parameter pollution attacks...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Query parameter pollution
    try {
        const response = await axios.get(`${baseUrl}/?param=value&param=another_value`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Query parameter pollution test result: ${response.status}`);
        if (response.status >= 500) {
            console.log("⚠️  POTENTIAL ISSUE: Parameter pollution caused server error");
        } else {
            console.log("✅ Good: Parameter pollution handled properly");
        }
    } catch (error) {
        console.log("✅ Good: Parameter pollution handled properly");
    }
    
    console.log("Parameter pollution tests completed.\n");
}

async function runLowAuthTests() {
    console.log("=== LOW SEVERITY AUTHENTICATION TESTS ===\n");
    
    await testBasicAuthBypass();
    await testParameterPollution();
    
    console.log("Low severity authentication tests completed.");
}

// Run the tests
runLowAuthTests().catch(console.error);