const filterInput = document.getElementById('filterTerm');
const urlSelect = document.getElementById('urlSelect');
const statusMsg = document.getElementById('statusMsg');

function updateUI(isRunning) {
    if (isRunning) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        urlInput.disabled = true;
        filterInput.disabled = true;
        urlSelect.disabled = true;
        statusMsg.innerText = "Status: Relaying...";
    } else {
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        urlInput.disabled = false;
        filterInput.disabled = false;
        urlSelect.disabled = false;
        statusMsg.innerText = "Status: Stopped";
    }
}

// Populate URL Dropdown
function populateUrlList(selectedUrl) {
    chrome.storage.local.get(['availableUrls'], (result) => {
        const urls = result.availableUrls || [];
        urlSelect.innerHTML = '<option value="">Select a detected URL...</option>';

        urls.forEach(url => {
            const opt = document.createElement('option');
            opt.value = url;
            // Truncate for display if too long
            opt.text = url.length > 50 ? '...' + url.substring(url.length - 47) : url;
            urlSelect.appendChild(opt);
        });

        if (selectedUrl) {
            // If the current filter matches one of the URLs, select it
            urlSelect.value = selectedUrl;
        }
    });
}

// Load initial state
chrome.storage.local.get(['targetUrl', 'filterTerm', 'isRunning'], (result) => {
    if (result.targetUrl) urlInput.value = result.targetUrl;
    if (result.filterTerm) filterInput.value = result.filterTerm;

    populateUrlList(result.filterTerm);
    updateUI(!!result.isRunning);
});

// Update filter input when dropdown changes
urlSelect.addEventListener('change', () => {
    if (urlSelect.value) {
        filterInput.value = urlSelect.value;
    }
});

startBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    const filter = filterInput.value.trim();

    if (!url) {
        urlInput.focus();
        return;
    }

    // Immediate visual feedback to prevent "freeze" feeling
    startBtn.innerText = "Starting...";
    startBtn.disabled = true;

    chrome.storage.local.set({ targetUrl: url, filterTerm: filter, isRunning: true }, () => {
        // Slight delay to ensure storage write confirms (optional, but feels better)
        setTimeout(() => {
            updateUI(true);
            startBtn.innerText = "Start Relaying"; // Reset text for next time
            startBtn.disabled = false;
        }, 100);
    });
});

stopBtn.addEventListener('click', () => {
    // Immediate visual feedback
    stopBtn.innerText = "Stopping...";
    stopBtn.disabled = true;

    chrome.storage.local.set({ isRunning: false }, () => {
        setTimeout(() => {
            updateUI(false);
            stopBtn.innerText = "Stop Relaying"; // Reset
            stopBtn.disabled = false;
        }, 100);
    });
});

stopBtn.addEventListener('click', () => {
    chrome.storage.local.set({ isRunning: false }, () => {
        updateUI(false);
    });
});
