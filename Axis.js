// script.js
(function() {
    "use strict";

    // ----- DOM refs -----
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

    // ----- state -----
    let isRunning = false;
    let stopRequested = false;
    let currentThread = null;

    // ----- helpers -----
    function getTimestamp() {
        const d = new Date();
        return String(d.getHours()).padStart(2,'0') + ':' +
               String(d.getMinutes()).padStart(2,'0') + ':' +
               String(d.getSeconds()).padStart(2,'0');
    }

    function logMessage(message, level = 'INFO') {
        const ts = getTimestamp();
        const line = document.createElement('span');
        line.className = `log-line ${level.toLowerCase()}`;
        line.textContent = `[${ts}] ${level}: ${message}`;
        logArea.appendChild(line);
        logArea.scrollTop = logArea.scrollHeight;
    }

    function clearLog() {
        logArea.innerHTML = '';
        logMessage('Log cleared', 'INFO');
    }

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

    function setRunningState(running) {
        isRunning = running;
        startBtn.disabled = running;
        stopBtn.disabled = !running;
        if (!running) {
            stopRequested = false;
        }
        updateStatus(running ? 'Processing...' : 'Ready', running ? null : 0);
    }

    // ----- browse file (hidden input) -----
    browseBtn.addEventListener('click', function() {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'file';
        hiddenInput.accept = '.xlsx,.xls';
        hiddenInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                excelFileInput.value = file.name;
                logMessage(`Selected file: ${file.name}`, 'INFO');
            }
            document.body.removeChild(hiddenInput);
        };
        document.body.appendChild(hiddenInput);
        hiddenInput.click();
    });

    // ----- clear log -----
    clearLogBtn.addEventListener('click', clearLog);

    // ----- stop -----
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

    // ----- START configuration (simulated) -----
    startBtn.addEventListener('click', function() {
        if (isRunning) return;

        const file = excelFileInput.value.trim();
        if (!file) {
            logMessage('Please specify an Excel file', 'ERROR');
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
        runConfiguration(username, password, file);
    });

    // ----- main configuration simulation -----
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
            const progress = Math.min(100, Math.round((step / totalSteps) * 100));
            updateStatus(`Processing... ${step}/${totalSteps}`, progress);

            // Simulate steps (mirroring Axis.py behavior)
            if (step === 1) {
                logMessage('Scanning ARP table for cameras...', 'INFO');
                logMessage('Found 3 devices on network', 'INFO');
            } else if (step === 2) {
                logMessage('----------------------------------------', 'INFO');
                logMessage('Camera Found - MAC: aa:bb:cc:dd:ee:01', 'INFO');
                logMessage('Current IP: 192.168.0.101', 'INFO');
                logMessage('New IP: 192.168.1.10', 'INFO');
                logMessage('Subnet: 255.255.255.0', 'INFO');
                logMessage('Gateway: 192.168.1.1', 'INFO');
            } else if (step === 3) {
                logMessage('========================================', 'INFO');
                logMessage('STEP 1: Setting credentials on camera...', 'INFO');
                logMessage('  Trying VAPIX API (Modern)...', 'INFO');
                logMessage('  VAPIX: User added successfully (no auth required)', 'INFO');
                logMessage('Credentials successfully set on camera aa:bb:cc:dd:ee:01', 'INFO');
            } else if (step === 4) {
                logMessage('STEP 2: Releasing DHCP lease...', 'INFO');
                logMessage('DHCP lease released successfully', 'INFO');
            } else if (step === 5) {
                logMessage('STEP 3: Configuring network settings...', 'INFO');
                logMessage('  Method 1: Direct parameter setting...', 'INFO');
                logMessage('SUCCESS: Configuration sent to aa:bb:cc:dd:ee:01', 'INFO');
            } else if (step === 6) {
                logMessage('Waiting for network configuration to apply...', 'INFO');
            } else if (step === 7) {
                logMessage('Verifying IP change...', 'INFO');
                logMessage('Camera successfully changed to 192.168.1.10', 'INFO');
                logMessage('Gateway should be: 192.168.1.1', 'INFO');
            } else if (step === 8) {
                logMessage('STEP 4: Configuring image rotation...', 'INFO');
                logMessage('Setting image rotation to 90 degrees...', 'INFO');
                logMessage('Image rotated 90 degrees', 'INFO');
            } else if (step === 9) {
                logMessage('----------------------------------------', 'INFO');
                logMessage('Camera Found - MAC: bb:cc:dd:ee:ff:02', 'INFO');
                logMessage('Current IP: 192.168.0.102', 'INFO');
                logMessage('New IP: 192.168.1.11', 'INFO');
                logMessage('Subnet: 255.255.255.0', 'INFO');
                logMessage('Gateway: 192.168.1.1', 'INFO');
            } else if (step === 10) {
                logMessage('STEP 1: Setting credentials on camera...', 'INFO');
                logMessage('  Trying Legacy CGI...', 'INFO');
                logMessage('  Legacy: Credentials set with root/pass', 'INFO');
                logMessage('Credentials verified on bb:cc:dd:ee:ff:02', 'INFO');
            } else if (step === 11) {
                logMessage('STEP 2: Releasing DHCP lease...', 'INFO');
                logMessage('DHCP lease released successfully', 'INFO');
            } else if (step === 12) {
                logMessage('STEP 3: Configuring network settings...', 'INFO');
                logMessage('  Method 2: VAPIX API...', 'INFO');
                logMessage('SUCCESS: Configuration sent to bb:cc:dd:ee:ff:02', 'INFO');
                logMessage('Waiting for network configuration to apply...', 'INFO');
            } else if (step === 13) {
                logMessage('Verifying IP change...', 'INFO');
                logMessage('Camera successfully changed to 192.168.1.11', 'INFO');
                logMessage('STEP 4: Configuring image rotation...', 'INFO');
                logMessage('Image rotated 90 degrees (alternative method)', 'INFO');
            } else if (step === 14) {
                logMessage('========================================', 'INFO');
                logMessage('Finished processing cameras', 'INFO');
                logMessage(`All cameras configured with username: ${username}`, 'INFO');
                logMessage('Process finished', 'INFO');
                setRunningState(false);
                updateStatus('Configuration complete', 100);
                return;
            }

            if (isRunning && !stopRequested && step < totalSteps) {
                currentThread = setTimeout(nextStep, 600 + Math.random() * 400);
            } else if (stopRequested) {
                logMessage('Configuration stopped by user', 'WARNING');
                setRunningState(false);
                updateStatus('Stopped', progress);
            } else {
                setRunningState(false);
                updateStatus('Ready', 100);
            }
        }

        currentThread = setTimeout(nextStep, 300);
    }

    // ----- initial state -----
    setRunningState(false);
    logMessage('Ready', 'INFO');
    updateStatus('Ready', 0);
})();