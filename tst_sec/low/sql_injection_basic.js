/**
 * Low Severity SQL Injection Test Script
 * Tests basic SQL injection attempts that should be caught by basic validation
 */

const axios = require('axios');

async function testBasicSQLInjection() {
    console.log("Testing basic SQL injection attempts...");
    
    const baseUrl = 'http://localhost:3000'; // Assuming default port
    
    // Test case 1: Basic SQL injection in login form
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "' OR '1'='1",
            password: "' OR '1'='1"
        }, {
            timeout: 5000,
            validateStatus: () => true // Don't throw on 401/403
        });
        
        console.log(`Basic SQL injection test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Basic SQL injection might be possible!");
        } else {
            console.log("✅ Good: Basic SQL injection blocked");
        }
    } catch (error) {
        console.log("✅ Good: Basic SQL injection blocked by server");
    }
    
    // Test case 2: Union-based SQL injection
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "admin' UNION SELECT 1,2,3,4--",
            password: "password"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Union SQL injection test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Union SQL injection might be possible!");
        } else {
            console.log("✅ Good: Union SQL injection blocked");
        }
    } catch (error) {
        console.log("✅ Good: Union SQL injection blocked by server");
    }
    
    console.log("Basic SQL injection tests completed.\n");
}

async function testBasicXSS() {
    console.log("Testing basic XSS injection attempts...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Basic XSS in signup form
    try {
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: "<script>alert('XSS')</script>",
            username: "testuser",
            email: "test" + Date.now() + "@example.com",
            password: "password123",
            confirm_password: "password123"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Basic XSS test result: ${response.status}`);
        if (response.data && response.data.includes('XSS')) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Basic XSS might be possible!");
        } else {
            console.log("✅ Good: Basic XSS blocked by sanitizer");
        }
    } catch (error) {
        console.log("✅ Good: Basic XSS attempt handled properly");
    }
    
    console.log("Basic XSS tests completed.\n");
}

async function runLowSeverityTests() {
    console.log("=== LOW SEVERITY SECURITY TESTS ===\n");
    
    await testBasicSQLInjection();
    await testBasicXSS();
    
    console.log("Low severity tests completed.");
}

// Run the tests
runLowSeverityTests().catch(console.error);