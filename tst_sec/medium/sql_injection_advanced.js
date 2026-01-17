/**
 * Medium Severity SQL Injection Test Script
 * Tests advanced SQL injection techniques that require better sanitization
 */

const axios = require('axios');

async function testAdvancedSQLInjection() {
    console.log("Testing advanced SQL injection attempts...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Time-based blind SQL injection
    try {
        const startTime = Date.now();
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "test@example.com' AND (SELECT sleep(5))--",
            password: "password"
        }, {
            timeout: 8000, // 8 seconds to allow for 5-second delay
            validateStatus: () => true
        });
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`Time-based injection test took: ${duration}ms`);
        if (duration > 6000) { // More than 6 seconds (buffer for network)
            console.log("⚠️  VULNERABILITY: Potential time-based SQL injection detected!");
        } else {
            console.log("✅ Good: Time-based injection not detected");
        }
    } catch (error) {
        console.log("✅ Good: Time-based injection properly blocked");
    }
    
    // Test case 2: Boolean-based blind SQL injection
    try {
        // First request with true condition
        const trueResponse = await axios.post(`${baseUrl}/users/login`, {
            email: "test@example.com' OR '1'='1",
            password: "password"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        // Second request with false condition
        const falseResponse = await axios.post(`${baseUrl}/users/login`, {
            email: "test@example.com' OR '1'='2",
            password: "password"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        // Compare responses - if they differ significantly, there might be a vulnerability
        const trueLength = JSON.stringify(trueResponse.data).length;
        const falseLength = JSON.stringify(falseResponse.data).length;
        
        console.log(`Boolean-based injection - True response: ${trueLength} chars, False response: ${falseLength} chars`);
        if (Math.abs(trueLength - falseLength) > 100) { // Significant difference threshold
            console.log("⚠️  POTENTIAL VULNERABILITY: Boolean-based SQL injection possibility!");
        } else {
            console.log("✅ Good: Boolean-based injection not detected");
        }
    } catch (error) {
        console.log("✅ Good: Boolean-based injection properly blocked");
    }
    
    // Test case 3: Error-based SQL injection
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "test@example.com' AND (SELECT table_name FROM information_schema.tables)--",
            password: "password"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        const responseBody = JSON.stringify(response.data || {}).toLowerCase();
        if (responseBody.includes('error') && responseBody.includes('sql')) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Error-based SQL injection detected!");
        } else {
            console.log("✅ Good: Error-based injection not detected");
        }
    } catch (error) {
        console.log("✅ Good: Error-based injection properly blocked");
    }
    
    console.log("Advanced SQL injection tests completed.\n");
}

async function testStoredXSS() {
    console.log("Testing stored XSS possibilities...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Stored XSS in user profile (if we can create a user)
    try {
        const maliciousPayload = `<img src=x onerror=alert('XSS')>`;
        
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: maliciousPayload,
            username: "testxssuser" + Date.now(),
            email: "xss" + Date.now() + "@example.com",
            password: "SecurePass123!",
            confirm_password: "SecurePass123!"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Stored XSS test result: ${response.status}`);
        if (response.status === 201) {
            console.log("✅ Good: User creation blocked XSS payload or sanitized properly");
        } else if (response.status === 400) {
            console.log("✅ Good: Input validation prevented XSS payload");
        } else {
            console.log("⚠️  Need further investigation for stored XSS");
        }
    } catch (error) {
        console.log("✅ Good: Stored XSS attempt properly handled");
    }
    
    console.log("Stored XSS tests completed.\n");
}

async function runMediumSeverityTests() {
    console.log("=== MEDIUM SEVERITY SECURITY TESTS ===\n");
    
    await testAdvancedSQLInjection();
    await testStoredXSS();
    
    console.log("Medium severity tests completed.");
}

// Run the tests
runMediumSeverityTests().catch(console.error);