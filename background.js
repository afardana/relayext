let relaySocket = null;
let targetUrl = null;
let isRunning = false;
let messageQueue = [];

// Load settings on startup
chrome.storage.local.get(['targetUrl', 'isRunning'], (result) => {
    if (result.targetUrl) targetUrl = result.targetUrl;
    if (result.isRunning) {
        isRunning = result.isRunning;
        if (isRunning && targetUrl) connectRelay();
    }
});

// Watch for storage changes (settings updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.targetUrl) {
            targetUrl = changes.targetUrl.newValue;
        }
        if (changes.isRunning) {
            isRunning = changes.isRunning.newValue;
            console.log('RelayExt: State changed to', isRunning ? 'RUNNING' : 'STOPPED');
            if (isRunning) {
                connectRelay();
            } else {
                disconnectRelay();
            }
        }
    }
});

let relayCount = 0;

function updateBadge() {
    if (isRunning) {
        chrome.action.setBadgeText({ text: relayCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

function connectRelay() {
    if (!targetUrl) return;
    if (relaySocket && (relaySocket.readyState === WebSocket.OPEN || relaySocket.readyState === WebSocket.CONNECTING)) return;

    relayCount = 0; // Reset counter on new session
    updateBadge();

    relaySocket = new WebSocket(targetUrl);

    relaySocket.onopen = () => {
        console.log('RelayExt: Connected to target relay', targetUrl);
        // Flush queue
        while (messageQueue.length > 0) {
            const msg = messageQueue.shift();
            relaySocket.send(msg);
            relayCount++;
        }
        updateBadge();
    };

    relaySocket.onclose = () => {
        console.log('RelayExt: Disconnected from target relay');
        relaySocket = null;
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#9E9E9E' });
    };

    relaySocket.onerror = (err) => {
        console.error('RelayExt: Target relay error', err);
        chrome.action.setBadgeText({ text: 'ERR' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    };
}

function disconnectRelay() {
    if (relaySocket) {
        relaySocket.close();
        relaySocket = null;
    }
    updateBadge();
}

// Receive messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isRunning) return;

    if (request.type === 'PIONEX_RELAY_DATA') {
        const payload = JSON.stringify(request);

        if (relaySocket && relaySocket.readyState === WebSocket.OPEN) {
            relaySocket.send(payload);
            relayCount++;
            updateBadge();
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
