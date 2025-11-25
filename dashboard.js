// dashboard.js
const BACKEND_URL = window.BACKEND_URL;
const showNotification = window.showNotification; // Imported from auth.js

// --- Dashboard DOM Elements ---
const tokenBalanceElement = document.getElementById('token-balance');
const projectForm = document.getElementById('project-form');
const generateBtn = document.getElementById('generate-btn');
const projectsList = document.getElementById('projects-list');
const apiKeysList = document.getElementById('api-keys-list');
const createKeyBtn = document.getElementById('create-key-btn');
const projectModal = document.getElementById('project-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const codeContentElement = document.getElementById('code-content');
const modalTitle = document.getElementById('modal-title');
const modalUsage = document.getElementById('modal-usage');
const downloadZipLink = document.getElementById('download-zip-link');

// --- Global State ---
let currentModalProject = null;

// --- Utility: Format Date ---
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// --- Fetch Data Functions ---

async function fetchData(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('user_token');
    if (!token) {
        showNotification('Authentication required. Please log in.', 'error');
        window.checkAuthAndRoute();
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Using user ID as the Bearer token for user-specific endpoints
    };

    try {
        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }

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

async function updateTokenBalance() {
    const data = await fetchData('/api/tokens');
    if (data && data.success) {
        tokenBalanceElement.textContent = data.tokens.toLocaleString();
        if (data.tokens > 0) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Project';
            createKeyBtn.disabled = false;
        } else {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Insufficient Tokens';
        }
    } else {
        tokenBalanceElement.textContent = 'N/A';
        generateBtn.disabled = true;
        generateBtn.textContent = 'Login to Enable';
        createKeyBtn.disabled = true;
    }
}

async function loadUserProjects() {
    projectsList.innerHTML = '<p class="text-gray-400">Loading projects...</p>';
    const data = await fetchData('/api/projects');
    
    if (data && data.success && data.projects.length > 0) {
        projectsList.innerHTML = data.projects.map(p => {
            const tokensUsed = p.tokensUsed ? (p.tokensUsed.input + p.tokensUsed.output).toLocaleString() : 'N/A';
            return `
                <div class="bg-gray-700 p-4 rounded-lg flex justify-between items-center transition duration-150 hover:bg-gray-600 cursor-pointer" data-project-id="${p.id}">
                    <div>
                        <p class="text-lg font-semibold text-indigo-200">${p.name.toUpperCase()}</p>
                        <p class="text-sm text-gray-400">Type: ${p.type} | Created: ${formatDate(p.createdAt)}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-900 text-yellow-300">
                            Tokens Used: ${tokensUsed}
                        </span>
                        <button class="view-project-btn ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium" data-project-id="${p.id}">View Code</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners for the 'View Code' buttons
        projectsList.querySelectorAll('.view-project-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the parent div's click event
                // In a real application, you would fetch the project details and files here.
                // For this mock, we will show a placeholder.
                showNotification('Project file download not implemented yet. (This would download the ZIP file from R2 based on ID).', 'error');
            });
        });

    } else if (data) {
        projectsList.innerHTML = '<p class="text-gray-400">You have no generated projects yet.</p>';
    }
}

async function loadApiKeys() {
    apiKeysList.innerHTML = '<p class="text-gray-400">Loading API Keys...</p>';
    const data = await fetchData('/api/api-keys');
    
    if (data && data.success && data.apiKeys.length > 0) {
        apiKeysList.innerHTML = data.apiKeys.map(k => {
            const cost = k.totalCost ? `$${k.totalCost.toFixed(3)}` : '$0.000';
            const tokens = k.totalTokens ? k.totalTokens.toLocaleString() : '0';
            return `
                <div class="bg-gray-700 p-4 rounded-lg transition duration-150 hover:bg-gray-600">
                    <div class="flex justify-between items-center">
                        <p class="text-lg font-semibold text-yellow-200">${k.name}</p>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${k.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                            ${k.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <p class="text-sm text-gray-400 mt-2">
                        Created: ${formatDate(k.createdAt)} | Tokens: ${tokens} | Cost: ${cost}
                    </p>
                    <p class="text-xs text-gray-500 mt-1 truncate">
                        Key: ${localStorage.getItem('api_key') === k.key ? k.key : '************ (Hidden)'}
                    </p>
                </div>
            `;
        }).join('');
    } else if (data) {
        apiKeysList.innerHTML = '<p class="text-gray-400">No API keys found.</p>';
    }
}

// --- Project Generation Logic ---

projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Gather form data
    const specs = {
        projectType: document.getElementById('projectType').value,
        complexity: document.getElementById('complexity').value,
        style: document.getElementById('style').value,
        description: document.getElementById('description').value,
        features: Array.from(document.querySelectorAll('#project-form input[type="checkbox"]:checked')).map(cb => cb.value)
    };

    const apiKey = localStorage.getItem('api_key');
    if (!apiKey) {
        showNotification('API Key missing. Please log in again.', 'error');
        return;
    }

    // 2. Disable button and show loading
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating... (This may take a minute or two)';

    try {
        // 3. Send request to backend
        const response = await fetch(`${BACKEND_URL}/api/generate-project`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey // Use X-API-KEY for project generation endpoint
            },
            body: JSON.stringify(specs)
        });

        const data = await response.json();

        // 4. Handle response
        if (response.ok && data.success) {
            showNotification('Project generated successfully!', 'success');
            
            // Show the generated code in the modal
            openProjectModal(data.project, data.usage);
            
            // Reload dashboard data
            await updateTokenBalance();
            await loadUserProjects();

        } else {
            showNotification(`Generation failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showNotification('Network error during project generation.', 'error');
        console.error('Project Generation Error:', error);
    } finally {
        // 5. Re-enable button
        generateBtn.textContent = 'Generate Project';
        await updateTokenBalance(); // Re-check balance in case of refund
    }
});

// --- Project Modal Logic ---

function openProjectModal(project, usage) {
    currentModalProject = project;
    
    modalTitle.textContent = project.name.toUpperCase();
    modalUsage.innerHTML = `Tokens: <span class="text-yellow-300">${usage.totalTokens.toLocaleString()}</span> | Remaining: <span class="text-green-300">${usage.remainingTokens.toLocaleString()}</span>`;

    // A simple way to create a zip file for download
    const zipData = encodeURIComponent(JSON.stringify(project.files));
    downloadZipLink.href = `#`; // Placeholder, a real download needs a server endpoint or client-side zip lib

    // Default to showing index.html
    showFileContent('index.html', project.files);

    // Reset tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-gray-700', 'text-gray-300'));
    document.querySelector('.tab-button').classList.add('bg-indigo-600', 'text-white');
    
    projectModal.classList.remove('hidden');
}

function showFileContent(filename, files) {
    const content = files[filename];
    codeContentElement.textContent = content || `/* File ${filename} was not generated or is empty. */`;
}

// Modal tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const filename = e.target.dataset.file;
        if (!currentModalProject) return;

        // Reset all buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('text-gray-300', 'hover:bg-gray-700');
        });
        
        // Activate current button
        e.target.classList.add('bg-indigo-600', 'text-white');
        e.target.classList.remove('text-gray-300', 'hover:bg-gray-700');

        showFileContent(filename, currentModalProject.files);
    });
});

// Close Modal
closeModalBtn.addEventListener('click', () => {
    projectModal.classList.add('hidden');
    currentModalProject = null;
});

// --- API Key Creation Logic (for demonstration) ---
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

// Global function to be called by auth.js upon successful login/auth check
window.initializeDashboard = function() {
    updateTokenBalance();
    loadUserProjects();
    loadApiKeys();
};
