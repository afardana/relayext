const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const urlInput = document.getElementById('targetUrl');
const filterInput = document.getElementById('filterTerm');
const statusMsg = document.getElementById('statusMsg');

function updateUI(isRunning) {
    if (isRunning) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        urlInput.disabled = true;
        filterInput.disabled = true;
        statusMsg.innerText = "Status: Relaying...";
    } else {
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        urlInput.disabled = false;
        filterInput.disabled = false;
        statusMsg.innerText = "Status: Stopped";
    }
}

// Load initial state
chrome.storage.local.get(['targetUrl', 'filterTerm', 'isRunning'], (result) => {
    if (result.targetUrl) urlInput.value = result.targetUrl;
    if (result.filterTerm) filterInput.value = result.filterTerm;
    updateUI(!!result.isRunning);
});

startBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    const filter = filterInput.value.trim();
    if (!url) return;

    chrome.storage.local.set({ targetUrl: url, filterTerm: filter, isRunning: true }, () => {
        updateUI(true);
    });
});

stopBtn.addEventListener('click', () => {
    chrome.storage.local.set({ isRunning: false }, () => {
        updateUI(false);
    });
});
