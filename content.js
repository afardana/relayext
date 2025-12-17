// Inject the script into the main page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

let filterTerm = "";

// Load initial filter
chrome.storage.local.get(['filterTerm'], (result) => {
    if (result.filterTerm) filterTerm = result.filterTerm;
});

// Watch for filter changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.filterTerm) {
        filterTerm = changes.filterTerm.newValue || "";
    }
});

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) return;

    if (event.data.type && event.data.type === 'PIONEX_RELAY_DATA') {
        // Check filter
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

        // Relay to background script
        chrome.runtime.sendMessage(event.data);
    }
});
