// controllers/aiController.js

exports.getSentiment = async (req, res) => {
    // 1. Get text from the frontend request
    const { message } = req.body; 

    if (!message) {
        return res.status(400).json({ error: "Message field is required" });
    }

    try {
        console.log(`[Node] Sending "${message}" to Python...`);

        // 2. Call the Python Microservice on Port 5200
        const pythonResponse = await fetch('http://127.0.0.1:5200/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }) // 'text' matches the Python Class
        });

        if (!pythonResponse.ok) {
            throw new Error(`Python Microservice failed: ${pythonResponse.statusText}`);
        }

        // 3. Get the data back
        const data = await pythonResponse.json();

        // 4. Send it to your Frontend
        return res.json({
            success: true,
            data: data 
        });

    } catch (error) {
        console.error("AI sentiment analysis error:", error.message);
        // Don't expose internal error details to client
        return res.status(500).json({ error: "AI Service is unavailable" });
    }
};

// controllers/aiController.js

exports.chat = async (req, res) => {
    // Frontend sends: { message: "Hello", history: [...] }
    const { message, history } = req.body; 

    try {
        const pythonResponse = await fetch('http://127.0.0.1:5200/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history: history || [] })
        });

        const data = await pythonResponse.json();
        return res.json(data);

    } catch (error) {
        console.error("AI chat error:", error.message);
        // Don't expose internal error details to client
        return res.status(500).json({ reply: "Service unreachable." });
    }
};