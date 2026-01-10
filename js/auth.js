/**
 * AFC Authentication Module
 * Secure token-based authentication with rate limiting
 * @module auth
 */

const AFC_AUTH = (function() {
    'use strict';
    
    /**
     * Simple SHA-256 hash function (for client-side only)
     * In production, use backend authentication with bcrypt
     * @param {string} message - String to hash
     * @returns {Promise<string>} Hash
     */
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Generate secure random token
     * @returns {string} Random token
     */
    function generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Get login attempt info
     * @returns {Object} Attempt info
     */
    function getLoginAttempts() {
        try {
            const stored = sessionStorage.getItem(AFC_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS);
            if (!stored) return { count: 0, lastAttempt: 0, lockedUntil: 0 };
            return JSON.parse(stored);
        } catch {
            return { count: 0, lastAttempt: 0, lockedUntil: 0 };
        }
    }
    
    /**
     * Record login attempt
     * @param {boolean} success - Was attempt successful
     */
    function recordLoginAttempt(success) {
        const attempts = getLoginAttempts();
        const now = Date.now();
        
        if (success) {
            // Clear attempts on success
            sessionStorage.removeItem(AFC_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS);
        } else {
            attempts.count++;
            attempts.lastAttempt = now;
            
            // Lock out if too many attempts
            if (attempts.count >= AFC_CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS) {
                attempts.lockedUntil = now + AFC_CONFIG.SECURITY.LOCKOUT_DURATION;
            }
            
            sessionStorage.setItem(AFC_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(attempts));
        }
    }
    
    /**
     * Check if account is locked
     * @returns {Object} Lock status
     */
    function isLocked() {
        const attempts = getLoginAttempts();
        const now = Date.now();
        
        if (attempts.lockedUntil > now) {
            const remainingMs = attempts.lockedUntil - now;
            const remainingMin = Math.ceil(remainingMs / 60000);
            return { locked: true, remainingMinutes: remainingMin };
        }
        
        // Reset if lockout expired
        if (attempts.lockedUntil > 0 && attempts.lockedUntil <= now) {
            sessionStorage.removeItem(AFC_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS);
        }
        
        return { locked: false, remainingMinutes: 0 };
    }
    
    /**
     * Validate password and create session
     * @param {string} password - User password
     * @returns {Promise<Object>} Result with success status
     */
    async function login(password) {
        // Check lockout
        const lockStatus = isLocked();
        if (lockStatus.locked) {
            return {
                success: false,
                error: `Account locked. Try again in ${lockStatus.remainingMinutes} minute(s).`
            };
        }
        
        if (!password || typeof password !== 'string') {
            recordLoginAttempt(false);
            return { success: false, error: 'Password is required' };
        }
        
        try {
            // Hash the input password
            const hashedPassword = await sha256(password);
            
            // Compare with stored hash
            if (hashedPassword !== AFC_CONFIG.SECURITY.PASSWORD_HASH) {
                recordLoginAttempt(false);
                const attempts = getLoginAttempts();
                const remaining = AFC_CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS - attempts.count;
                
                return {
                    success: false,
                    error: remaining > 0 
                        ? `Invalid password. ${remaining} attempt(s) remaining.`
                        : 'Account locked due to too many attempts.'
                };
            }
            
            // Success - create session token
            const token = generateToken();
            const expiry = Date.now() + AFC_CONFIG.SECURITY.TOKEN_EXPIRY;
            
            sessionStorage.setItem(AFC_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
            sessionStorage.setItem(AFC_CONFIG.STORAGE_KEYS.AUTH_EXPIRY, expiry.toString());
            
            recordLoginAttempt(true);
            
            return { success: true, token };
            
        } catch (error) {
            console.error('[AFC Auth] Login error:', error);
            return { success: false, error: 'Authentication error. Please try again.' };
        }
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} Is authenticated
     */
    function isAuthenticated() {
        const token = sessionStorage.getItem(AFC_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const expiry = parseInt(sessionStorage.getItem(AFC_CONFIG.STORAGE_KEYS.AUTH_EXPIRY) || '0');
        
        if (!token) return false;
        
        // Check if token expired
        if (Date.now() > expiry) {
            logout();
            return false;
        }
        
        return true;
    }
    
    /**
     * Refresh session expiry (call on activity)
     */
    function refreshSession() {
        if (!isAuthenticated()) return;
        
        const newExpiry = Date.now() + AFC_CONFIG.SECURITY.TOKEN_EXPIRY;
        sessionStorage.setItem(AFC_CONFIG.STORAGE_KEYS.AUTH_EXPIRY, newExpiry.toString());
    }
    
    /**
     * Get remaining session time
     * @returns {number} Remaining time in milliseconds
     */
    function getSessionTimeRemaining() {
        const expiry = parseInt(sessionStorage.getItem(AFC_CONFIG.STORAGE_KEYS.AUTH_EXPIRY) || '0');
        const remaining = expiry - Date.now();
        return remaining > 0 ? remaining : 0;
    }
    
    /**
     * Logout and clear session
     */
    function logout() {
        sessionStorage.removeItem(AFC_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        sessionStorage.removeItem(AFC_CONFIG.STORAGE_KEYS.AUTH_EXPIRY);
    }
    
    /**
     * Show login modal
     * @returns {Promise<boolean>} Login success
     */
    function showLoginModal() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'login-modal-overlay';
            overlay.innerHTML = `
                <div class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
                    <div class="login-header">
                        <div class="login-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h2 id="login-title">Admin Login</h2>
                        <p>Enter your admin password to continue</p>
                    </div>
                    <form class="login-form" id="adminLoginForm">
                        <div class="login-field">
                            <label for="adminPassword" class="sr-only">Password</label>
                            <div class="password-input-wrapper">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="adminPassword" 
                                       placeholder="Enter admin password" 
                                       autocomplete="current-password"
                                       required>
                                <button type="button" class="toggle-password" aria-label="Toggle password visibility">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="login-error" id="loginError" aria-live="polite"></div>
                        <button type="submit" class="login-submit-btn">
                            <i class="fas fa-sign-in-alt"></i>
                            <span>Login</span>
                        </button>
                    </form>
                    <div class="login-footer">
                        <a href="index.html" class="back-link">
                            <i class="fas fa-arrow-left"></i>
                            Back to Menu
                        </a>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            const form = overlay.querySelector('#adminLoginForm');
            const passwordInput = overlay.querySelector('#adminPassword');
            const errorDiv = overlay.querySelector('#loginError');
            const toggleBtn = overlay.querySelector('.toggle-password');
            
            // Toggle password visibility
            toggleBtn.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                toggleBtn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
            
            // Handle form submit
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = form.querySelector('.login-submit-btn');
                const originalHtml = submitBtn.innerHTML;
                
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verifying...</span>';
                errorDiv.textContent = '';
                
                const result = await login(passwordInput.value);
                
                if (result.success) {
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> <span>Success!</span>';
                    submitBtn.classList.add('success');
                    
                    setTimeout(() => {
                        overlay.remove();
                        resolve(true);
                    }, 500);
                } else {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHtml;
                    errorDiv.textContent = result.error;
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            });
            
            // Focus password input
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                passwordInput.focus();
            });
        });
    }
    
    /**
     * Check admin access (show login if needed)
     * @returns {Promise<boolean>} Access granted
     */
    async function checkAdminAccess() {
        if (isAuthenticated()) {
            refreshSession();
            return true;
        }
        
        return await showLoginModal();
    }
    
    /**
     * Setup session timeout warning
     * @param {Function} onExpiringSoon - Callback when session expiring soon (5 min)
     * @param {Function} onExpired - Callback when session expired
     */
    function setupSessionMonitor(onExpiringSoon, onExpired) {
        const checkInterval = 30000; // Check every 30 seconds
        const warningThreshold = 5 * 60 * 1000; // 5 minutes
        
        let warned = false;
        
        setInterval(() => {
            if (!isAuthenticated()) {
                if (onExpired) onExpired();
                return;
            }
            
            const remaining = getSessionTimeRemaining();
            
            if (remaining < warningThreshold && remaining > 0 && !warned) {
                warned = true;
                if (onExpiringSoon) onExpiringSoon(Math.ceil(remaining / 60000));
            }
            
            if (remaining <= 0) {
                logout();
                if (onExpired) onExpired();
            }
        }, checkInterval);
        
        // Refresh session on user activity
        ['click', 'keypress', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                refreshSession();
                warned = false;
            }, { passive: true });
        });
    }
    
    // Public API
    return {
        login,
        logout,
        isAuthenticated,
        refreshSession,
        getSessionTimeRemaining,
        checkAdminAccess,
        setupSessionMonitor,
        isLocked
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AFC_AUTH;
}
