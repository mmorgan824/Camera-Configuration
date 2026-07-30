document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // DOM refs
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const excelFileInput = document.getElementById('excelFileInput');
    const browseBtn = document.getElementById('browseBtn');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const logArea = document.getElementById('logArea');
    const progressFill = document.getElementById('progressFill');
    const progressLabel = document.getElementById('progressLabel');
    const progressText = document.getElementById('progressText');
    const statusBadge = document.getElementById('statusBadge');

    // State
    let isRunning = false;
    let stopRequested = false;
    let currentThread = null;

    // Helper: timestamp
    function getTimestamp() {
        const d = new Date();
        return String(d.getHours()).padStart(2,'0') + ':' +
               String(d.getMinutes()).padStart(2,'0') + ':' +
               String(d.getSeconds()).padStart(2,'0');
    }

    // Log message
    function logMessage(message, level = 'INFO') {
        const ts = getTimestamp();
        const line = document.createElement('span');
        line.className = `log-line ${level.toLowerCase()}`;
        line.textContent = `[${ts}] ${level}: ${message}`;
        logArea.appendChild(line);
        logArea.scrollTop = logArea.scrollHeight;
    }

    // Clear log
    function clearLog() {
        logArea.innerHTML = '';
        logMessage('Log cleared', 'INFO');
    }

    // Update status & progress
    function updateStatus(text, progress = null) {
        const dotColor = isRunning ? '#f5b342' : '#4a9e6b';
        statusBadge.innerHTML = `<i class="fas fa-circle" style="color: ${dotColor};"></i> ${text}`;
        if (progress !== null) {
            const p = Math.min(100, Math.max(0, progress));
            progressFill.style.width = p + '%';
            progressLabel.textContent = Math.round(p) + '%';
            progressText.textContent = Math.round(p) + '%';
        }
    }

    // Set running state
    function setRunningState(running) {
        isRunning = running;
        startBtn.disabled = running;
        stopBtn.disabled = !running;
        if (!running) {
            stopRequested = false;
        }
        updateStatus(running ? 'Processing...' : 'Ready', running ? null : 0);
    }

    // ===== ✅ FIXED BROWSE BUTTON =====
    browseBtn.addEventListener('click', function () {
        excelFileInput.click();
    });

    excelFileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            logMessage(`Selected file: ${file.name}`, 'INFO');
        }
    });

    // Clear log
    clearLogBtn.addEventListener('click', clearLog);

    // Stop
    stopBtn.addEventListener('click', function() {
        if (isRunning) {
            stopRequested = true;
            logMessage('Stop requested by user', 'WARNING');
            updateStatus('Stopping...');
            if (currentThread) {
                clearTimeout(currentThread);
                currentThread = null;
            }
        }
    });

    // Start
    startBtn.addEventListener('click', function() {
        if (isRunning) return;

        const file = excelFileInput.files[0];
        if (!file) {
            logMessage('Please select an Excel file', 'ERROR');
            return;
        }

        clearLog();
        logMessage('Starting camera configuration process...', 'INFO');

        const username = usernameInput.value.trim() || 'root';
        const password = passwordInput.value.trim() || 'pass';

        logMessage(`Will set username: ${username}, password: ${'*'.repeat(password.length)}`, 'INFO');

        if (currentThread) {
            clearTimeout(currentThread);
            currentThread = null;
        }

        setRunningState(true);
        stopRequested = false;
        runConfiguration(username, password, file.name);
    });

    // Main configuration simulation
    function runConfiguration(username, password, excelFile) {
        let step = 0;
        const totalSteps = 14;

        function nextStep() {
            if (stopRequested || !isRunning) {
                logMessage('Configuration stopped by user', 'WARNING');
                setRunningState(false);
                updateStatus('Stopped', 0);
                return;
            }

            step++;
            const progress = Math.round((step / totalSteps) * 100);
            updateStatus(`Processing... ${step}/${totalSteps}`, progress);

            logMessage(`Step ${step} running...`, 'INFO');

            if (step === totalSteps) {
                logMessage('Finished processing cameras', 'INFO');
                setRunningState(false);
                updateStatus('Complete', 100);
                return;
            }

            currentThread = setTimeout(nextStep, 600);
        }

        currentThread = setTimeout(nextStep, 300);
    }

    // Initial state
    setRunningState(false);
    logMessage('Ready', 'INFO');
    updateStatus('Ready', 0);
});
