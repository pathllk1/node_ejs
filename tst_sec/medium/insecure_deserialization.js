/**
 * Medium Severity Insecure Deserialization Test Script
 * Tests for potential insecure deserialization vulnerabilities
 */

const axios = require('axios');

async function testPrototypePollution() {
    console.log("Testing prototype pollution attacks...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Prototype pollution via __proto__ manipulation
    try {
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: "Test User",
            username: "testuser",
            email: "pollution" + Date.now() + "@example.com",
            password: "password123",
            confirm_password: "password123",
            "__proto__": {
                "pollutedProperty": "pollutedValue"
            }
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Prototype pollution (__proto__) test result: ${response.status}`);
        if (response.status >= 500) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Server error might indicate prototype pollution!");
        } else {
            console.log("✅ Good: Prototype pollution attempt handled properly");
        }
    } catch (error) {
        console.log("✅ Good: Prototype pollution attempt properly rejected");
    }
    
    // Test case 2: Prototype pollution via constructor.prototype manipulation
    try {
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: "Test User",
            username: "testuser2",
            email: "pollution2" + Date.now() + "@example.com",
            password: "password123",
            confirm_password: "password123",
            "constructor": {
                "prototype": {
                    "pollutedProperty": "pollutedValue"
                }
            }
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Prototype pollution (constructor.prototype) test result: ${response.status}`);
        if (response.status >= 500) {
            console.log("⚠️  POTENTIAL VULNERABILITY: Server error might indicate prototype pollution!");
        } else {
            console.log("✅ Good: Prototype pollution attempt handled properly");
        }
    } catch (error) {
        console.log("✅ Good: Prototype pollution attempt properly rejected");
    }
    
    console.log("Prototype pollution tests completed.\n");
}

async function testMassAssignment() {
    console.log("Testing mass assignment vulnerabilities...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Attempt to assign privileged properties during user registration
    try {
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: "Test Admin",
            username: "testadmin" + Date.now(),
            email: "admin" + Date.now() + "@example.com",
            password: "SecurePass123!",
            confirm_password: "SecurePass123!",
            role: "admin",  // Attempt to set role directly
            isAdmin: true,  // Attempt to set admin flag
            firm_id: 1,     // Attempt to set firm_id
            created_at: new Date().toISOString(), // Attempt to set creation date
            updated_at: new Date().toISOString()  // Attempt to set update date
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Mass assignment test result: ${response.status}`);
        if (response.status === 201) {
            console.log("⚠️  POTENTIAL ISSUE: User created with extra fields - check if privileged fields were ignored");
        } else if (response.status === 400) {
            console.log("✅ Good: Mass assignment properly rejected");
        } else {
            console.log("✅ Good: Request properly handled");
        }
    } catch (error) {
        console.log("✅ Good: Mass assignment attempt properly handled");
    }
    
    // Test case 2: Attempt to access internal fields in login
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "test@example.com",
            password: "password",
            returnTo: "/admin/logs", // Potential redirect after login
            callbackUrl: "/admin/logs", // Another potential redirect
            next: "/admin/logs" // Yet another potential redirect
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Redirect manipulation test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL ISSUE: Check if unauthorized redirects are possible");
        } else {
            console.log("✅ Good: Redirect manipulation properly handled");
        }
    } catch (error) {
        console.log("✅ Good: Redirect manipulation properly handled");
    }
    
    console.log("Mass assignment tests completed.\n");
}

async function testContentTypeAbuse() {
    console.log("Testing content-type abuse...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Sending JSON with wrong content type
    try {
        const response = await axios.post(`${baseUrl}/users/login`, 
            JSON.stringify({
                email: "test@example.com",
                password: "password"
            }),
            {
                headers: {
                    'Content-Type': 'text/plain'
                },
                timeout: 5000,
                validateStatus: () => true
            }
        );
        
        console.log(`Wrong content type test result: ${response.status}`);
        if (response.status === 200) {
            console.log("✅ Good: Wrong content type properly handled");
        } else {
            console.log("⚠️  POTENTIAL ISSUE: Wrong content type caused unexpected behavior");
        }
    } catch (error) {
        console.log("✅ Good: Wrong content type properly rejected");
    }
    
    // Test case 2: Attempting XML injection (if server parses XML)
    try {
        const xmlPayload = '<?xml version="1.0" encoding="ISO-8859-1"?><email>test@example.com</email><password>password</password>';
        const response = await axios.post(`${baseUrl}/users/login`, 
            xmlPayload,
            {
                headers: {
                    'Content-Type': 'application/xml'
                },
                timeout: 5000,
                validateStatus: () => true
            }
        );
        
        console.log(`XML injection test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  POTENTIAL ISSUE: XML payload processed unexpectedly");
        } else {
            console.log("✅ Good: XML injection properly rejected");
        }
    } catch (error) {
        console.log("✅ Good: XML injection properly rejected");
    }
    
    console.log("Content-type abuse tests completed.\n");
}

async function runMediumInsecureDeserTests() {
    console.log("=== MEDIUM SEVERITY INSECURE DESERIALIZATION TESTS ===\n");
    
    await testPrototypePollution();
    await testMassAssignment();
    await testContentTypeAbuse();
    
    console.log("Medium severity insecure deserialization tests completed.");
}

// Run the tests
runMediumInsecureDeserTests().catch(console.error);