// controllers/aiController.js

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const getOpenRouterApiKey = () => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
        throw new Error('OPENROUTER_API_KEY is not set');
    }
    return key;
};

const stripCodeFences = (text) => {
    if (typeof text !== 'string') return '';
    const trimmed = text.trim();
    if (!trimmed.startsWith('```')) return trimmed;

    // Remove leading/trailing fences and optional language tag
    return trimmed
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
};

const openRouterChatCompletion = async ({ model, messages }) => {
    const apiKey = getOpenRouterApiKey();
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages
        })
    });

    if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(`OpenRouter failed: ${response.status} ${response.statusText}${bodyText ? ` - ${bodyText}` : ''}`);
    }

    return response.json();
};

exports.getSentiment = async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message field is required' });
    }

    const system_prompt = `
    You are an API that analyzes sentiment.
    You MUST respond with valid JSON only. No markdown, no explanations.
    Format:
    {
        "analysis_result": "Positive" | "Negative" | "Neutral",
        "confidence_score": 0.0 to 1.0,
        "summary": "A 5-word summary of the text"
    }
    `;

    try {
        const aiResponse = await openRouterChatCompletion({
            model: 'kwaipilot/kat-coder-pro:free',
            messages: [
                { role: 'system', content: system_prompt },
                { role: 'user', content: `Analyze this text: ${message}` }
            ]
        });

        const rawContent = aiResponse?.choices?.[0]?.message?.content || '';
        const cleaned = stripCodeFences(rawContent);

        let aiData;
        try {
            aiData = JSON.parse(cleaned);
        } catch (e) {
            aiData = null;
        }

        const data = {
            analysis_result: aiData?.analysis_result || 'Neutral',
            confidence_score: typeof aiData?.confidence_score === 'number' ? aiData.confidence_score : 0.5,
            original_text: message
        };

        return res.json({ success: true, data });
    } catch (error) {
        console.error('AI sentiment analysis error:', error.message);
        return res.status(500).json({ error: 'AI Service is unavailable' });
    }
};

exports.chat = async (req, res) => {
    const { message, history } = req.body;

    try {
        const messages = [
            { role: 'system', content: "You are a helpful, witty, and concise AI assistant named 'Imagination'." }
        ];

        if (Array.isArray(history)) {
            for (const msg of history) {
                if (!msg || typeof msg !== 'object') continue;
                if (msg.role && msg.content) {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: message });

        const aiResponse = await openRouterChatCompletion({
            model: 'mistralai/devstral-2512:free',
            messages
        });

        const botReply = aiResponse?.choices?.[0]?.message?.content;

        return res.json({
            reply: botReply || '',
            success: true
        });
    } catch (error) {
        console.error('AI chat error:', error.message);
        return res.status(500).json({ reply: 'Service unreachable.' });
    }
};