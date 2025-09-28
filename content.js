/**
 * Content script to access document.cookie and provide additional context
 * This runs in the context of web pages to gather supplementary cookie data
 */

class ContentCookieCollector {
    constructor() {
        this.setupMessageListener();
        console.log('Cookie Extractor content script loaded');
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'getDocumentCookies') {
                const cookieData = this.getDocumentCookies();
                sendResponse({ success: true, data: cookieData });
            }
            return true;
        });
    }

    /**
     * Get cookies accessible via document.cookie
     * Note: This cannot access HttpOnly cookies, but provides additional context
     */
    getDocumentCookies() {
        try {
            const cookieString = document.cookie;
            const cookies = [];
            
            if (cookieString) {
                const cookiePairs = cookieString.split(';');
                
                cookiePairs.forEach(pair => {
                    const [name, value] = pair.trim().split('=');
                    if (name && value !== undefined) {
                        cookies.push({
                            name: name.trim(),
                            value: decodeURIComponent(value),
                            accessible: true,
                            source: 'document.cookie'
                        });
                    }
                });
            }
            
            return {
                url: window.location.href,
                domain: window.location.hostname,
                protocol: window.location.protocol,
                cookies: cookies,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                cookieEnabled: navigator.cookieEnabled,
                thirdPartyContext: this.isThirdPartyContext()
            };
            
        } catch (error) {
            console.error('Error collecting document cookies:', error);
            return {
                error: error.message,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Detect if we're in a third-party context (iframe, etc.)
     */
    isThirdPartyContext() {
        try {
            return window !== window.top;
        } catch (e) {
            // Cross-origin iframe access denied
            return true;
        }
    }

    /**
     * Analyze cookie security practices on current page
     */
    analyzeCookieSecurity() {
        const analysis = {
            hasSecureContext: window.isSecureContext,
            protocol: window.location.protocol,
            domain: window.location.hostname,
            cookiesAccessible: !!document.cookie,
            recommendations: []
        };

        // Security recommendations
        if (!window.isSecureContext) {
            analysis.recommendations.push({
                type: 'security',
                message: 'Page is not served over HTTPS - cookies may be vulnerable to interception'
            });
        }

        if (document.cookie) {
            analysis.recommendations.push({
                type: 'info',
                message: 'Some cookies are accessible via JavaScript - ensure sensitive cookies use HttpOnly flag'
            });
        }

        return analysis;
    }

    /**
     * Monitor cookie changes (for debugging/analysis purposes)
     */
    startCookieMonitoring() {
        let lastCookieString = document.cookie;
        
        const checkCookieChanges = () => {
            const currentCookieString = document.cookie;
            if (currentCookieString !== lastCookieString) {
                console.log('Cookie change detected:', {
                    previous: lastCookieString,
                    current: currentCookieString,
                    timestamp: new Date().toISOString()
                });
                lastCookieString = currentCookieString;
            }
        };

        // Check for cookie changes every second
        setInterval(checkCookieChanges, 1000);
    }
}

// Initialize content script
new ContentCookieCollector();

// Expose utility functions for debugging
window.cookieExtractorUtils = {
    getCurrentCookies: () => document.cookie,
    analyzeCookies: () => {
        const cookies = document.cookie.split(';').map(c => {
            const [name, value] = c.trim().split('=');
            return { name: name?.trim(), value: value?.trim() };
        }).filter(c => c.name);
        
        return {
            count: cookies.length,
            cookies: cookies,
            totalSize: document.cookie.length,
            domain: window.location.hostname
        };
    }
};