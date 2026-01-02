(function initAiClient() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const inputField = document.getElementById('aiInput');
    const resultCard = document.getElementById('resultCard');
    const loader = document.getElementById('loader');
    
    // UI Elements for Data
    const sentimentResult = document.getElementById('sentimentResult');
    const confidenceResult = document.getElementById('confidenceResult');
    const scoreBadge = document.getElementById('scoreBadge');

    // Variable to store the timer ID
    let hideTimeout = null;

    // Safety: check if element exists
    if (!analyzeBtn) return;

    analyzeBtn.addEventListener('click', async () => {
        const text = inputField.value.trim();

        if (!text) {
            inputField.classList.add('ring-2', 'ring-red-500');
            setTimeout(() => inputField.classList.remove('ring-2', 'ring-red-500'), 2000);
            return;
        }

        // 1. Reset UI State
        setLoading(true);
        hideResult(); 

        try {
            // Check if API is available
            if (!window.api) throw new Error("API Interceptor missing");

            // USE window.api.post INSTEAD OF FETCH
            const response = await window.api.post('/ai/api/ai-check', { message: text });

            // window.api already handles JSON parsing if it's a wrapper, 
            // but if it returns the raw Fetch response object (which your code implies):
            const result = await response.json();

            if (result.success) {
                showResult(result.data);
            } else {
                alert('Error: ' + (result.error || 'Something went wrong'));
            }

        } catch (error) {
            console.error('AI Request error:', error);
            alert('Failed to connect to AI server.');
        } finally {
            setLoading(false);
        }
    });

    // --- Helper Functions ---

    function setLoading(isLoading) {
        if (isLoading) {
            analyzeBtn.disabled = true;
            analyzeBtn.classList.add('opacity-75', 'cursor-not-allowed');
            analyzeBtn.querySelector('span').textContent = 'Processing...';
            if (loader) loader.classList.remove('hidden');
        } else {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            analyzeBtn.querySelector('span').textContent = 'Analyze Sentiment';
            if (loader) loader.classList.add('hidden');
        }
    }

    function showResult(data) {
        // CANCEL previous hide timer
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        // Populate text
        if (sentimentResult) sentimentResult.textContent = data.analysis_result;
        if (confidenceResult) confidenceResult.textContent = (data.confidence_score * 100).toFixed(1) + '%';
        if (scoreBadge) scoreBadge.textContent = data.analysis_result;

        // Reset classes
        if (scoreBadge) {
            scoreBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide';
            
            if (data.analysis_result === 'Positive') {
                scoreBadge.classList.add('bg-green-100', 'text-green-700');
            } else if (data.analysis_result === 'Negative') {
                scoreBadge.classList.add('bg-red-100', 'text-red-700');
            } else {
                scoreBadge.classList.add('bg-slate-100', 'text-slate-600');
            }
        }

        // Reveal Animation
        if (resultCard) {
            resultCard.classList.remove('hidden');
            requestAnimationFrame(() => {
                resultCard.classList.remove('opacity-0', 'translate-y-4');
            });
        }
    }

    function hideResult() {
        if (!resultCard) return;

        // Clear existing timer
        if (hideTimeout) clearTimeout(hideTimeout);

        resultCard.classList.add('opacity-0', 'translate-y-4');
        
        // Save timer ID
        hideTimeout = setTimeout(() => {
            resultCard.classList.add('hidden');
        }, 300); 
    }
})();