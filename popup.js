/**
 * Popup script for Cookie Extractor Extension
 * Handles user i            if (response.success) {
                          const { domain, total } = response.data;
                this.log(`✅ ${total} resources extracted for ${domain}`, 'success');total, timestamp } = response.data;
                this.log(`✅ Successfully extracted ${total} cookies from all domains`, 'success');
                this.log(`📡 Sent to API server at ${timestamp}`, 'info');
                this.log(`📊 Cookie breakdown:`, 'info');ace interactions and communication with background script
 */

class PopupController {
    constructor() {
        this.logOutput = document.getElementById('logOutput');
        this.loading = document.getElementById('loading');
        
        this.initializeEventListeners();
        this.loadCookieStatistics();
        this.checkDisplayMode();
    }

    initializeEventListeners() {
        // Extract all cookies button
        document.getElementById('extractAll').addEventListener('click', () => {
            this.extractAllCookies();
        });

        // Extract current domain cookies button
        document.getElementById('extractCurrent').addEventListener('click', () => {
            this.extractCurrentDomainCookies();
        });

        // Clear logs button
        document.getElementById('clearLogs').addEventListener('click', () => {
            this.clearLogs();
        });
    }

    /**
     * Load and display cookie statistics
     */
    async loadCookieStatistics() {
        try {
            const response = await this.sendMessage({ action: 'getCookieStats' });
            
            if (response.success) {
                this.updateStatistics(response.data);
            } else {
                this.log(`Error loading stats: ${response.error}`, 'error');
            }
        } catch (error) {
            this.log(`Failed to load statistics: ${error.message}`, 'error');
        }
    }

    /**
     * Update statistics display
     */
    updateStatistics(stats) {
        document.getElementById('totalCookies').textContent = stats.total;
        document.getElementById('httpOnlyCookies').textContent = stats.httpOnly;
        document.getElementById('secureCookies').textContent = stats.secure;
        document.getElementById('sessionCookies').textContent = stats.session;
    }

    /**
     * Extract all cookies from all domains
     */
    async extractAllCookies() {
        this.showLoading(true);
        this.log('🚀 Please wait, great things take time...', 'loading');
        
        try {
            const response = await this.sendMessage({ action: 'extractAllCookies' });
            
            if (response.success) {
                const { total } = response.data;
                this.log(`✅ ${total} resources extracted`, 'success');
                
                // Update statistics
                await this.loadCookieStatistics();
                
            } else {
                this.log(`❌ Failed to extract cookies: ${response.error}`, 'error');
            }
        } catch (error) {
            // Check for specific error types
            if (error.message.includes('Server is not running') || 
                error.message.includes('Cannot connect to server') ||
                error.message.includes('Server timeout')) {
                this.log(`❌ ${error.message}`, 'error');
            } else {
                this.log(`❌ Extraction failed: ${error.message}`, 'error');
            }
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Extract cookies for current domain only
     */
    async extractCurrentDomainCookies() {
        this.showLoading(true);
        
        try {
            // Get current tab URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = tab.url;
            const domain = new URL(url).hostname;
            
            this.log(`🔍 Extracting cookies for domain: ${domain}`, 'info');
            
            const response = await this.sendMessage({ 
                action: 'extractCurrentDomain', 
                url: url 
            });
            
            if (response.success) {
                const { domain, total, timestamp } = response.data;
                this.log(`✅ Successfully extracted ${total} cookies for ${domain}`, 'success');
                this.log(`� Sent to API server at ${timestamp}`, 'info');
                
                // Show cookie types breakdown
                const summary = response.data.cookies.reduce((acc, cookie) => {
                    acc[cookie.cookieType] = (acc[cookie.cookieType] || 0) + 1;
                    return acc;
                }, {});
                
                this.log(`📊 Cookie types for ${domain}:`, 'info');
                Object.entries(summary).forEach(([type, count]) => {
                    this.log(`   ${type}: ${count} cookies`, 'info');
                });
                
            } else {
                this.log(`❌ Failed to extract domain cookies: ${response.error}`, 'error');
            }
        } catch (error) {
            // Check for specific error types
            if (error.message.includes('Server is not running') || 
                error.message.includes('Cannot connect to server') ||
                error.message.includes('Server timeout')) {
                this.log(`❌ ${error.message}`, 'error');
            } else {
                this.log(`❌ Domain extraction failed: ${error.message}`, 'error');
            }
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Send message to background script
     */
    sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
        
        // Disable buttons during loading
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.disabled = show;
        });
    }

    /**
     * Add log entry with timestamp and type styling
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        
        let icon = '';
        let style = '';
        
        switch (type) {
            case 'success':
                icon = '✅';
                style = 'color: #4CAF50;';
                break;
            case 'error':
                icon = '❌';
                style = 'color: #f44336;';
                break;
            case 'warning':
                icon = '⚠️';
                style = 'color: #ff9800;';
                break;
            case 'loading':
                icon = '🚀';
                style = 'color: #FFD700; font-weight: bold; font-size: 16px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);';
                break;
            default:
                icon = 'ℹ️';
                style = 'color: #ffffff;';
        }
        
        logEntry.innerHTML = `
            <span style="opacity: 0.7; font-size: 10px;">[${timestamp}]</span> 
            <span style="${style}">${icon} ${message}</span>
        `;
        
        this.logOutput.appendChild(logEntry);
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
        
        // Limit log entries to prevent memory issues
        if (this.logOutput.children.length > 50) {
            this.logOutput.removeChild(this.logOutput.firstChild);
        }
    }

    /**
     * Clear all log entries
     */
    clearLogs() {
        this.logOutput.innerHTML = 'Logs cleared. Ready to extract cookies...';
    }

    /**
     * Open extension in new tab for better experience
     */
    openInNewTab() {
        // Send message to background script to open tab
        chrome.runtime.sendMessage({action: 'openInTab'}, () => {
            if (window.close) {
                window.close(); // Close the popup
            }
        });
    }

    /**
     * Check if running in tab mode and show indicator
     */
    checkDisplayMode() {
        // If width is greater than 400px, likely running in tab mode
        if (window.outerWidth > 400 || window.location.protocol === 'chrome-extension:') {
            const indicator = document.getElementById('modeIndicator');
            if (indicator) {
                indicator.style.display = 'block';
            }
        }
    }
}

// Initialize popup controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});