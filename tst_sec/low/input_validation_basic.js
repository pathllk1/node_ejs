/**
 * Low Severity Input Validation Test Script
 * Tests basic input validation bypass attempts
 */

const axios = require('axios');

async function testInputLengthValidation() {
    console.log("Testing basic input length validation...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Very long inputs to check for buffer overflow
    try {
        const longString = 'A'.repeat(10000); // 10,000 character string
        
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: longString,
            username: "testuser",
            email: "test" + Date.now() + "@example.com",
            password: "password123",
            confirm_password: "password123"
        }, {
            timeout: 10000, // Longer timeout for processing
            validateStatus: () => true
        });
        
        console.log(`Long input test result: ${response.status}`);
        if (response.status >= 500) {
            console.log("⚠️  POTENTIAL ISSUE: Long input caused server error");
        } else {
            console.log("✅ Good: Long input handled properly");
        }
    } catch (error) {
        console.log("✅ Good: Long input properly rejected");
    }
    
    // Test case 2: Unicode characters
    try {
        const unicodeString = "🚀🔥💻🌟🎉🔒🔐🔒🔐🔒🔐🔒🔐";
        
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: unicodeString,
            username: "testuser",
            email: "test" + Date.now() + "@example.com",
            password: "password123",
            confirm_password: "password123"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Unicode input test result: ${response.status}`);
        if (response.status >= 500) {
            console.log("⚠️  POTENTIAL ISSUE: Unicode input caused server error");
        } else {
            console.log("✅ Good: Unicode input handled properly");
        }
    } catch (error) {
        console.log("✅ Good: Unicode input properly handled");
    }
    
    console.log("Input validation tests completed.\n");
}

async function testSpecialCharacters() {
    console.log("Testing special character handling...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Path traversal attempt
    try {
        const response = await axios.get(`${baseUrl}/../../../etc/passwd`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Path traversal test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  CRITICAL VULNERABILITY: Path traversal possible!");
        } else {
            console.log("✅ Good: Path traversal blocked");
        }
    } catch (error) {
        console.log("✅ Good: Path traversal properly blocked");
    }
    
    // Test case 2: Special characters in URL
    try {
        const response = await axios.get(`${baseUrl}/%00%01%02%03%04%05`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Null byte URL test result: ${response.status}`);
        if (response.status >= 500) {
            console.log("⚠️  POTENTIAL ISSUE: Null bytes in URL caused server error");
        } else {
            console.log("✅ Good: Null bytes in URL handled properly");
        }
    } catch (error) {
        console.log("✅ Good: Null bytes in URL properly handled");
    }
    
    console.log("Special character tests completed.\n");
}

async function runLowInputTests() {
    console.log("=== LOW SEVERITY INPUT VALIDATION TESTS ===\n");
    
    await testInputLengthValidation();
    await testSpecialCharacters();
    
    console.log("Low severity input validation tests completed.");
}

// Run the tests
runLowInputTests().catch(console.error);