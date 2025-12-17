let relaySocket = null;
let targetUrl = null;
let isRunning = false;
let messageQueue = [];

// Badge counter - track messages per second
let messageTimestamps = [];
const RATE_WINDOW_MS = 2000; // 2-second rolling window

function updateBadge() {
    const now = Date.now();
    // Remove timestamps older than the window
    messageTimestamps = messageTimestamps.filter(ts => now - ts < RATE_WINDOW_MS);

    // Calculate rate (messages per second)
    const rate = messageTimestamps.length / (RATE_WINDOW_MS / 1000);
    const displayRate = rate < 10 ? rate.toFixed(1) : Math.round(rate).toString();

    if (isRunning && messageTimestamps.length > 0) {
        chrome.action.setBadgeText({ text: displayRate });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else if (isRunning) {
        chrome.action.setBadgeText({ text: '0' });
        chrome.action.setBadgeBackgroundColor({ color: '#9E9E9E' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Update badge every second
setInterval(updateBadge, 1000);

// Load settings on startup
chrome.storage.local.get(['targetUrl', 'isRunning'], (result) => {
    if (result.targetUrl) targetUrl = result.targetUrl;
    if (result.isRunning) {
        isRunning = result.isRunning;
        if (isRunning && targetUrl) connectRelay();
    }
    updateBadge();
});

// Watch for storage changes (settings updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.targetUrl) {
            targetUrl = changes.targetUrl.newValue;
        }
        if (changes.isRunning) {
            isRunning = changes.isRunning.newValue;
            if (isRunning) {
                connectRelay();
            } else {
                disconnectRelay();
                messageTimestamps = [];
            }
            updateBadge();
        }
    }
});

function connectRelay() {
    if (!targetUrl) return;
    if (relaySocket && (relaySocket.readyState === WebSocket.OPEN || relaySocket.readyState === WebSocket.CONNECTING)) return;

    relaySocket = new WebSocket(targetUrl);

    relaySocket.onopen = () => {
        console.log('RelayExt: Connected to target relay', targetUrl);
        // Flush queue
        while (messageQueue.length > 0) {
            const msg = messageQueue.shift();
            relaySocket.send(msg);
            messageTimestamps.push(Date.now());
        }
    };

    relaySocket.onclose = () => {
        console.log('RelayExt: Disconnected from target relay');
        relaySocket = null;
        // Optional: Auto-reconnect logic could go here
    };

    relaySocket.onerror = (err) => {
        console.error('RelayExt: Target relay error', err);
    };
}

function disconnectRelay() {
    if (relaySocket) {
        relaySocket.close();
        relaySocket = null;
    }
}

// Receive messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isRunning) return;

    if (request.type === 'PIONEX_RELAY_DATA') {
        const payload = JSON.stringify(request);

        if (relaySocket && relaySocket.readyState === WebSocket.OPEN) {
            relaySocket.send(payload);
            messageTimestamps.push(Date.now());
        } else {
            // Optionally buffer or drop. For now, let's buffer a few.
            if (messageQueue.length < 100) {
                messageQueue.push(payload);
            }
            // If disconnected, try to reconnect if supposed to be running
            if (isRunning) connectRelay();
        }
    }
});
