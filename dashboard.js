// dashboard.js
const BACKEND_URL = window.BACKEND_URL;
const showNotification = window.showNotification;

// --- Dashboard DOM Elements ---
const tokenBalanceElement = document.getElementById('token-balance');
const userUsernameElement = document.getElementById('user-username');
const userEmailElement = document.getElementById('user-email');
const userTokenBalanceSummaryElement = document.getElementById('user-token-balance-summary');
const usageHistoryList = document.getElementById('usage-history-list');
const apiKeysList = document.getElementById('api-keys-list');
const createKeyBtn = document.getElementById('create-key-btn');

// --- Utility: Format Date ---
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// --- Fetch Data Core ---
async function fetchData(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('user_token');
    if (!token) {
        showNotification('Authentication required. Please log in.', 'error');
        window.checkAuthAndRoute();
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    try {
        const options = { method, headers };
        if (body) { options.body = JSON.stringify(body); }

        const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok || data.error) {
            if (response.status === 401) {
                showNotification('Session expired or unauthorized.', 'error');
                localStorage.removeItem('user_token');
                localStorage.removeItem('api_key');
                window.checkAuthAndRoute();
            }
            console.error(`API Error on ${endpoint}:`, data.error || data.message);
            return null;
        }
        return data;
    } catch (error) {
        showNotification('Network error. Check console for details.', 'error');
        console.error('Fetch Error:', error);
        return null;
    }
}


// --- Data Loading Functions ---

function loadUserProfile() {
    // Data diambil dari localStorage setelah login/register
    const username = localStorage.getItem('user_username') || 'N/A';
    const email = localStorage.getItem('user_email') || 'N/A';
    
    userUsernameElement.textContent = username;
    userEmailElement.textContent = email;
}

async function updateTokenBalance() {
    const data = await fetchData('/api/tokens');
    if (data && data.success) {
        const tokens = data.tokens.toLocaleString();
        tokenBalanceElement.textContent = tokens;
        userTokenBalanceSummaryElement.textContent = tokens;
        createKeyBtn.disabled = (data.tokens <= 0);
    } else {
        tokenBalanceElement.textContent = 'N/A';
        userTokenBalanceSummaryElement.textContent = 'N/A';
        createKeyBtn.disabled = true;
    }
}


async function loadTokenUsageHistory() {
    usageHistoryList.innerHTML = '<p class="text-gray-400">Loading usage history...</p>';
    // Menggunakan endpoint /api/projects yang berisi log penggunaan token
    const data = await fetchData('/api/projects'); 
    
    if (data && data.success && data.projects.length > 0) {
        usageHistoryList.innerHTML = data.projects.map(p => {
            const inputTokens = p.tokensUsed?.input || 0;
            const outputTokens = p.tokensUsed?.output || 0;
            const totalTokens = (inputTokens + outputTokens).toLocaleString();
            const name = p.name || `Usage Record ${p.id.substring(0, 8)}`; // Nama proyek dijadikan nama record

            return `
                <div class="bg-gray-700 p-4 rounded-lg flex justify-between items-center transition duration-150 hover:bg-gray-600">
                    <div>
                        <p class="text-lg font-semibold text-green-200">${name}</p>
                        <p class="text-sm text-gray-400">Type: ${p.type} | Date: ${formatDate(p.createdAt)}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-red-900 text-red-300">
                            - ${totalTokens} Tokens
                        </span>
                        <p class="text-xs text-gray-400">Input: ${inputTokens.toLocaleString()} | Output: ${outputTokens.toLocaleString()}</p>
                    </div>
                </div>
            `;
        }).join('');
    } else if (data) {
        usageHistoryList.innerHTML = '<p class="text-gray-400">No token usage history found.</p>';
    }
}

async function loadApiKeys() {
    apiKeysList.innerHTML = '<p class="text-gray-400">Loading API Keys...</p>';
    const data = await fetchData('/api/api-keys');
    
    if (data && data.success && data.apiKeys.length > 0) {
        const currentApiKey = localStorage.getItem('api_key');
        apiKeysList.innerHTML = data.apiKeys.map(k => {
            const cost = k.totalCost ? `$${k.totalCost.toFixed(3)}` : '$0.000';
            const tokens = k.totalTokens ? k.totalTokens.toLocaleString() : '0';
            const keyText = currentApiKey === k.key ? k.key : '************ (Hidden)';

            return `
                <div class="bg-gray-700 p-4 rounded-lg transition duration-150 hover:bg-gray-600">
                    <div class="flex justify-between items-center">
                        <p class="text-lg font-semibold text-yellow-200">${k.name}</p>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${k.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                            ${k.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <p class="text-sm text-gray-400 mt-2">
                        Created: ${formatDate(k.createdAt)} | Tokens Used: ${tokens} | Est. Cost: ${cost}
                    </p>
                    <p class="text-xs text-gray-500 mt-1 truncate select-all">
                        Key: <span class="font-mono text-gray-300">${keyText}</span>
                    </p>
                </div>
            `;
        }).join('');
    } else if (data) {
        apiKeysList.innerHTML = '<p class="text-gray-400">No API keys found.</p>';
    }
}

// --- API Key Creation Logic ---
createKeyBtn.addEventListener('click', async () => {
    const keyName = prompt('Enter a name for the new API key:');
    if (!keyName) return;

    const data = await fetchData('/api/api-keys', 'POST', { name: keyName });

    if (data && data.success) {
        showNotification(`API Key '${keyName}' created successfully!`, 'success');
        loadApiKeys();
    } else if (data) {
        showNotification(`Failed to create API key: ${data.error}`, 'error');
    }
});


// --- Initialization ---
window.initializeDashboard = function() {
    loadUserProfile();
    updateTokenBalance();
    loadTokenUsageHistory();
    loadApiKeys();
};
