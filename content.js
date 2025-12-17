// Inject the script into the main page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

let filterTerm = "";
let isRunning = false;

// Load initial settings
chrome.storage.local.get(['filterTerm', 'isRunning'], (result) => {
    if (result.filterTerm) filterTerm = result.filterTerm;
    isRunning = !!result.isRunning;
});

// Watch for changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.filterTerm) {
            filterTerm = changes.filterTerm.newValue || "";
        }
        if (changes.isRunning) {
            isRunning = !!changes.isRunning.newValue;
        }
    }
});

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) return;

    if (event.data.type && event.data.type === 'PIONEX_RELAY_DATA') {

        // 0. STOP HERE if not running.
        // This prevents flooding the background script when stopped.
        if (!isRunning) return;

        // 1. Capture and store unique URLs (Discovery phase) - Do this BEFORE filtering
        if (event.data.url) {
            const urlStr = event.data.url;
            // Optimization: Debounce or throttle could be added here if traffic is crazy high.
            // For now, we'll read-check-write logic which is safer than blind writes.
            chrome.storage.local.get(['availableUrls'], (res) => {
                let urls = res.availableUrls || [];
                // We want to store paths or full URLs? Full URLs for now.
                // Avoid duplicates
                if (!urls.includes(urlStr)) {
                    urls.unshift(urlStr); // Add to top
                    if (urls.length > 50) urls.pop(); // Keep last 50
                    chrome.storage.local.set({ availableUrls: urls });
                }
            });
        }

        // 2. Check filter
        if (filterTerm) {
            const msgUrl = event.data.url || "";
            const msgPayload = event.data.payload || "";

            // Simple case-insensitive inclusion check
            // You could upgrade this to Regex if needed
            const term = filterTerm.toLowerCase();
            if (!msgUrl.toLowerCase().includes(term) && !msgPayload.toLowerCase().includes(term)) {
                return; // Skip if no match
            }
        }

        // 3. Relay to background script
        chrome.runtime.sendMessage(event.data);
    }
});
