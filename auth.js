// auth.js
const BACKEND_URL = window.BACKEND_URL;

// --- DOM Elements ---
const loginPage = document.getElementById('login-page');
const registerPage = document.getElementById('register-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegisterBtn = document.getElementById('switch-to-register');
const switchToLoginBtn = document.getElementById('switch-to-login');
const logoutButton = document.getElementById('logout-button');
const notificationArea = document.getElementById('notification-area');

// --- Utility Functions ---

/**
 * Shows a notification toast.
 * @param {string} message The message to display.
 * @param {'success'|'error'} type The type of notification.
 */
function showNotification(message, type) {
    const color = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const notification = document.createElement('div');
    notification.className = `p-4 rounded-lg shadow-xl text-white font-semibold mb-3 ${color} transform transition-all duration-300 ease-out translate-x-0 opacity-100`;
    notification.textContent = message;
    
    notificationArea.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.classList.add('opacity-0', 'translate-x-full');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 4000);
}

// --- View Switching ---
function showView(viewId) {
    loginPage.classList.add('hidden');
    registerPage.classList.add('hidden');
    dashboardPage.classList.add('hidden');

    const view = document.getElementById(viewId);
    if (view) {
        view.classList.remove('hidden');
    }
}

function checkAuthAndRoute() {
    const token = localStorage.getItem('user_token');
    if (token) {
        // User is logged in, show dashboard
        showView('dashboard-page');
        // Call dashboard initialization from dashboard.js
        window.initializeDashboard();
    } else {
        // User is not logged in, show login page
        showView('login-page');
    }
}

// --- Event Handlers ---

// Switch to Register page
switchToRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView('register-page');
});

// Switch to Login page
switchToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView('login-page');
});

// Handle Registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const username = document.getElementById('register-username').value;
    const button = e.submitter;

    button.disabled = true;
    button.textContent = 'Registering...';

    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Registration successful! Logging in...', 'success');
            // Auto-login after successful registration
            localStorage.setItem('user_token', data.user.id); // The backend uses the ID as the token
            localStorage.setItem('api_key', data.apiKey);
            checkAuthAndRoute();
        } else {
            showNotification(`Registration failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showNotification('Network error during registration.', 'error');
        console.error('Registration Error:', error);
    } finally {
        button.disabled = false;
        button.textContent = 'Register';
    }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const key = document.getElementById('login-key').value;
    const button = e.submitter;

    button.disabled = true;
    button.textContent = 'Logging in...';

    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, key })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('user_token', data.user.id);
            localStorage.setItem('api_key', data.apiKey);
            showNotification('Login successful!', 'success');
            checkAuthAndRoute();
        } else {
            showNotification(`Login failed: ${data.error || 'Invalid username or API key'}`, 'error');
        }
    } catch (error) {
        showNotification('Network error during login.', 'error');
        console.error('Login Error:', error);
    } finally {
        button.disabled = false;
        button.textContent = 'Login';
    }
});

// Handle Logout
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('api_key');
    showNotification('Logged out successfully.', 'success');
    checkAuthAndRoute();
});


// Export showNotification and checkAuthAndRoute for use in dashboard.js
window.showNotification = showNotification;
window.checkAuthAndRoute = checkAuthAndRoute;

// Initial check on page load
document.addEventListener('DOMContentLoaded', checkAuthAndRoute);
