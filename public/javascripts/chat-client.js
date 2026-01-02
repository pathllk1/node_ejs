(function initChatClient() {
    const chatContainer = document.getElementById('chatContainer');
    const userMsgInput = document.getElementById('userMsg');
    const sendBtn = document.getElementById('sendBtn');

    // Store conversation locally
    let chatHistory = []; 

    // Safety check
    if (!chatContainer || !userMsgInput || !sendBtn) return;

    // Ensure chat container has proper hover class for scrollbar
    chatContainer.classList.add('no-scrollbar');

    // ============================================
    // SECURITY: HTML Entity Escaping (XSS Protection)
    // ============================================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // MARKDOWN PARSER (Zero Dependencies)
    // ============================================
    function parseMarkdown(text) {
        // Step 1: Escape HTML
        text = escapeHtml(text);

        // Step 2: Code blocks
        text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
            const language = code.split('\n')[0].trim();
            const codeContent = code.replace(language, '').trim();
            return `<pre class="markdown-code-block"><code class="markdown-code-content">${codeContent}</code></pre>`;
        });

        // Step 3: Inline code
        text = text.replace(/`([^`\n]+?)`/g, '<code class="markdown-inline-code">$1</code>');

        // Step 4: Bold
        text = text.replace(/\*\*([^\*\n]+?)\*\*/g, '<strong class="markdown-bold">$1</strong>');
        text = text.replace(/__([^_\n]+?)__/g, '<strong class="markdown-bold">$1</strong>');

        // Step 5: Italic
        text = text.replace(/\*([^\*\n]+?)\*/g, '<em class="markdown-italic">$1</em>');
        text = text.replace(/_([^_\n]+?)_/g, '<em class="markdown-italic">$1</em>');

        // Step 6: Lists
        text = text.replace(/^\d+\.\s+(.+)$/gm, '<li class="markdown-list-item">$1</li>');
        text = text.replace(/(<li class="markdown-list-item">.*?<\/li>)/s, '<ol class="markdown-ordered-list">$1</ol>');
        text = text.replace(/^[\-\*]\s+(.+)$/gm, '<li class="markdown-list-item">$1</li>');
        text = text.replace(/(<li class="markdown-list-item">.*?<\/li>)/s, '<ul class="markdown-unordered-list">$1</ul>');

        // Step 7: Headers
        text = text.replace(/^###\s+(.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
        text = text.replace(/^##\s+(.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
        text = text.replace(/^#\s+(.+)$/gm, '<h1 class="markdown-h1">$1</h1>');

        // Step 8: Line breaks
        text = text.replace(/\n/g, '<br>');

        return text;
    }

    // ============================================
    // MESSAGE DISPLAY
    // ============================================
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
        
        if (isUser) {
            bubble.textContent = text;
        } else {
            bubble.innerHTML = parseMarkdown(text);
        }

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);

        // Auto scroll
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

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

    // ============================================
    // HANDLE SEND
    // ============================================
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
            // Check API
            if (!window.api) throw new Error("API Interceptor missing");

            // C. Send Request using window.api.post
            const response = await window.api.post('/ai/api/chat', { message: text, history: chatHistory });
            const data = await response.json();

            // D. Remove Thinking Bubble
            typingBubble.remove();

            if (data.reply) {
                appendMessage('assistant', data.reply);
                
                // Update History
                chatHistory.push({ role: 'user', content: text });
                chatHistory.push({ role: 'assistant', content: data.reply });
            } else {
                appendMessage('assistant', 'Received empty response.');
            }

        } catch (error) {
            console.error(error);
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

})();