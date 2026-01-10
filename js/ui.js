/**
 * AFC UI Utilities Module
 * Common UI functions, loading states, confirmations, and accessibility
 * @module ui
 */

const AFC_UI = (function() {
    'use strict';
    
    /**
     * Escape HTML to prevent XSS when inserting text
     * @param {string} text - Raw text
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Create element with safe text content
     * @param {string} tag - HTML tag
     * @param {Object} options - Element options
     * @returns {HTMLElement} Created element
     */
    function createElement(tag, options = {}) {
        const el = document.createElement(tag);
        
        if (options.text) {
            el.textContent = options.text;
        }
        if (options.html) {
            // Only use for trusted content
            el.innerHTML = options.html;
        }
        if (options.className) {
            el.className = options.className;
        }
        if (options.id) {
            el.id = options.id;
        }
        if (options.attributes) {
            for (const [key, value] of Object.entries(options.attributes)) {
                el.setAttribute(key, value);
            }
        }
        if (options.children) {
            options.children.forEach(child => el.appendChild(child));
        }
        if (options.onClick) {
            el.addEventListener('click', options.onClick);
        }
        
        return el;
    }
    
    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - 'success', 'error', 'info', 'warning'
     * @param {number} duration - Duration in ms
     */
    function showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toastContainer') || createToastContainer();
        
        const toast = createElement('div', {
            className: `toast toast-${type}`,
            attributes: {
                'role': 'alert',
                'aria-live': 'polite'
            }
        });
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas fa-${icons[type] || icons.info}" aria-hidden="true"></i>
            <span>${escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toast.querySelector('.toast-close').onclick = () => removeToast(toast);
        
        container.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => removeToast(toast), duration);
    }
    
    function removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
    
    function createToastContainer() {
        const container = createElement('div', {
            id: 'toastContainer',
            className: 'toast-container',
            attributes: {
                'aria-label': 'Notifications'
            }
        });
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>} User confirmation
     */
    function showConfirm(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm',
                message = 'Are you sure?',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                type = 'warning' // warning, danger, info
            } = options;
            
            const overlay = createElement('div', {
                className: 'confirm-overlay',
                attributes: {
                    'role': 'dialog',
                    'aria-modal': 'true',
                    'aria-labelledby': 'confirm-title'
                }
            });
            
            const typeIcons = {
                warning: 'exclamation-triangle',
                danger: 'trash-alt',
                info: 'info-circle'
            };
            
            const typeColors = {
                warning: '#F59E0B',
                danger: '#EF4444',
                info: '#3B82F6'
            };
            
            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-icon" style="color: ${typeColors[type]}">
                        <i class="fas fa-${typeIcons[type]}"></i>
                    </div>
                    <h3 id="confirm-title" class="confirm-title">${escapeHtml(title)}</h3>
                    <p class="confirm-message">${escapeHtml(message)}</p>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-btn-cancel" data-action="cancel">
                            ${escapeHtml(cancelText)}
                        </button>
                        <button class="confirm-btn confirm-btn-confirm confirm-btn-${type}" data-action="confirm">
                            ${escapeHtml(confirmText)}
                        </button>
                    </div>
                </div>
            `;
            
            const handleAction = (confirmed) => {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 300);
                resolve(confirmed);
            };
            
            overlay.querySelector('[data-action="cancel"]').onclick = () => handleAction(false);
            overlay.querySelector('[data-action="confirm"]').onclick = () => handleAction(true);
            overlay.onclick = (e) => {
                if (e.target === overlay) handleAction(false);
            };
            
            // Handle escape key
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    handleAction(false);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
            
            document.body.appendChild(overlay);
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                overlay.querySelector('.confirm-btn-confirm').focus();
            });
        });
    }
    
    /**
     * Show loading state on button
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Loading state
     * @param {string} loadingText - Text to show while loading
     */
    function setButtonLoading(button, loading, loadingText = 'Loading...') {
        if (!button) return;
        
        if (loading) {
            button.dataset.originalHtml = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>${escapeHtml(loadingText)}</span>`;
            button.setAttribute('aria-busy', 'true');
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalHtml || button.innerHTML;
            button.removeAttribute('aria-busy');
        }
    }
    
    /**
     * Create skeleton loading placeholder
     * @param {string} type - 'card', 'row', 'text'
     * @param {number} count - Number of skeletons
     * @returns {string} Skeleton HTML
     */
    function createSkeleton(type = 'card', count = 1) {
        const skeletons = {
            card: `
                <div class="skeleton-card" aria-hidden="true">
                    <div class="skeleton skeleton-image"></div>
                    <div class="skeleton-content">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short"></div>
                    </div>
                </div>
            `,
            row: `
                <tr class="skeleton-row" aria-hidden="true">
                    <td><div class="skeleton skeleton-cell"></div></td>
                    <td><div class="skeleton skeleton-cell"></div></td>
                    <td><div class="skeleton skeleton-cell"></div></td>
                    <td><div class="skeleton skeleton-cell"></div></td>
                </tr>
            `,
            text: `<div class="skeleton skeleton-text" aria-hidden="true"></div>`
        };
        
        return Array(count).fill(skeletons[type] || skeletons.text).join('');
    }
    
    /**
     * Show loading skeletons in container
     * @param {HTMLElement} container - Container element
     * @param {string} type - Skeleton type
     * @param {number} count - Number of skeletons
     */
    function showSkeletonLoading(container, type = 'card', count = 6) {
        if (!container) return;
        container.innerHTML = createSkeleton(type, count);
        container.setAttribute('aria-busy', 'true');
    }
    
    /**
     * Clear skeleton loading
     * @param {HTMLElement} container - Container element
     */
    function clearSkeletonLoading(container) {
        if (!container) return;
        container.removeAttribute('aria-busy');
    }
    
    /**
     * Theme management
     */
    const theme = {
        init() {
            const savedTheme = localStorage.getItem(AFC_CONFIG?.STORAGE_KEYS?.THEME) || 'light';
            this.apply(savedTheme);
        },
        
        toggle() {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = current === 'light' ? 'dark' : 'light';
            this.apply(newTheme);
            return newTheme;
        },
        
        apply(themeName) {
            document.documentElement.setAttribute('data-theme', themeName);
            localStorage.setItem(AFC_CONFIG?.STORAGE_KEYS?.THEME || 'userTheme', themeName);
            
            // Update theme toggle button if exists
            const toggleBtn = document.getElementById('themeToggle');
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = themeName === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
            }
        },
        
        getCurrent() {
            return document.documentElement.getAttribute('data-theme') || 'light';
        }
    };
    
    /**
     * Accessibility helpers
     */
    const a11y = {
        // Announce message to screen readers
        announce(message, priority = 'polite') {
            const announcer = document.getElementById('sr-announcer') || this.createAnnouncer();
            announcer.setAttribute('aria-live', priority);
            announcer.textContent = message;
        },
        
        createAnnouncer() {
            const announcer = createElement('div', {
                id: 'sr-announcer',
                className: 'sr-only',
                attributes: {
                    'aria-live': 'polite',
                    'aria-atomic': 'true'
                }
            });
            document.body.appendChild(announcer);
            return announcer;
        },
        
        // Trap focus within modal
        trapFocus(element) {
            const focusable = element.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusable = focusable[0];
            const lastFocusable = focusable[focusable.length - 1];
            
            const handleTab = (e) => {
                if (e.key !== 'Tab') return;
                
                if (e.shiftKey && document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            };
            
            element.addEventListener('keydown', handleTab);
            firstFocusable?.focus();
            
            return () => element.removeEventListener('keydown', handleTab);
        }
    };
    
    /**
     * Format currency
     * @param {number} amount - Amount
     * @param {string} currency - Currency symbol
     * @returns {string} Formatted currency
     */
    function formatCurrency(amount, currency = '₹') {
        return `${currency}${parseFloat(amount || 0).toLocaleString('en-IN')}`;
    }
    
    /**
     * Format date
     * @param {Date|string} date - Date to format
     * @param {Object} options - Intl options
     * @returns {string} Formatted date
     */
    function formatDate(date, options = {}) {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        });
    }
    
    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public API
    return {
        escapeHtml,
        createElement,
        showToast,
        showConfirm,
        setButtonLoading,
        createSkeleton,
        showSkeletonLoading,
        clearSkeletonLoading,
        theme,
        a11y,
        formatCurrency,
        formatDate,
        debounce
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AFC_UI;
}
