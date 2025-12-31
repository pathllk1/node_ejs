document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const userMsgInput = document.getElementById('userMsg');
    const sendBtn = document.getElementById('sendBtn');

    // We store the conversation locally to send context to Python
    let chatHistory = []; 

    // 1. Function to create HTML bubbles
    function appendMessage(role, text) {
        const isUser = role === 'user';
        
        const wrapper = document.createElement('div');
        wrapper.className = `flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`;
        
        const avatar = document.createElement('div');
        avatar.className = `w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isUser ? 'bg-slate-700 text-white' : 'bg-indigo-100 text-indigo-600'}`;
        avatar.textContent = isUser ? 'ME' : 'AI';

        const bubble = document.createElement('div');
        bubble.className = `p-3 rounded-2xl shadow-sm border max-w-[80%] leading-relaxed text-sm ${
            isUser 
            ? 'bg-slate-800 text-white rounded-tr-none border-slate-700' 
            : 'bg-white text-slate-700 rounded-tl-none border-slate-100'
        }`;
        bubble.textContent = text;

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);

        // Auto scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // 2. Function to create a "Thinking..." bubble
    function showTypingIndicator() {
        const wrapper = document.createElement('div');
        wrapper.id = 'typingIndicator';
        wrapper.className = 'flex items-start gap-3';
        wrapper.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">AI</div>
            <div class="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                <div class="flex gap-1">
                    <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                    <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                </div>
            </div>
        `;
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return wrapper;
    }

    // 3. Handle Sending
    async function handleSend() {
        const text = userMsgInput.value.trim();
        if (!text) return;

        // A. Clear Input & Show User Bubble
        userMsgInput.value = '';
        appendMessage('user', text);
        userMsgInput.disabled = true;

        // B. Show Thinking Bubble
        const typingBubble = showTypingIndicator();

        try {
           

            const response = await window.api.post('/ai/api/chat', { message: text, history: chatHistory });

            const data = await response.json();

            // D. Remove Thinking Bubble
            typingBubble.remove();

            if (data.reply) {
                appendMessage('assistant', data.reply);
                
                // Update History
                chatHistory.push({ role: 'user', content: text });
                chatHistory.push({ role: 'assistant', content: data.reply });
            }

        } catch (error) {
            typingBubble.remove();
            appendMessage('assistant', 'Sorry, I had a connection error.');
        } finally {
            userMsgInput.disabled = false;
            userMsgInput.focus();
        }
    }

    // Event Listeners
    sendBtn.addEventListener('click', handleSend);
    userMsgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});