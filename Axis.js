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
    let cameraData = []; // Store parsed camera data

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

    // Parse Excel file and extract camera data
    function parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first worksheet
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    
                    // Map the data - adjust column names as needed
                    cameraData = jsonData.map(row => ({
                        mac: row['MAC Address'] || row['MAC'] || row['Mac'] || 'N/A',
                        ip: row['New IP'] || row['IP Address'] || row['IP'] || 'N/A',
                        subnet: row['Subnet'] || row['Subnet Mask'] || '255.255.255.0',
                        gateway: row['Gateway'] || row['Default Gateway'] || '192.168.1.1'
                    }));
                    
                    resolve(cameraData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Browse button
    browseBtn.addEventListener('click', function () {
        excelFileInput.click();
    });

    excelFileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            logMessage(`Selected file: ${file.name}`, 'INFO');
            
            // Parse and show preview of camera data
            parseExcelFile(file)
                .then(data => {
                    logMessage(`Found ${data.length} cameras in spreadsheet`, 'INFO');
                    data.forEach((camera, index) => {
                        logMessage(
                            `Camera ${index + 1}: MAC: ${camera.mac}, IP: ${camera.ip}, Subnet: ${camera.subnet}, Gateway: ${camera.gateway}`,
                            'INFO'
                        );
                    });
                })
                .catch(error => {
                    logMessage(`Error parsing Excel: ${error.message}`, 'ERROR');
                });
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

        logMessage(
            `Will set username: ${username}, password: ${'*'.repeat(password.length)}`,
            'INFO'
        );

        // Parse the Excel file first
        parseExcelFile(file)
            .then(data => {
                if (data.length === 0) {
                    logMessage('No camera data found in spreadsheet', 'ERROR');
                    setRunningState(false);
                    return;
                }
                
                logMessage(`Loaded ${data.length} cameras for configuration`, 'INFO');
                
                if (currentThread) {
                    clearTimeout(currentThread);
                    currentThread = null;
                }

                setRunningState(true);
                stopRequested = false;

                runConfiguration(username, password, data);
            })
            .catch(error => {
                logMessage(`Error loading Excel file: ${error.message}`, 'ERROR');
                setRunningState(false);
            });
    });

    // Main configuration with actual camera data
    function runConfiguration(username, password, cameras) {
        let currentIndex = 0;
        const totalCameras = cameras.length;
        const totalSteps = totalCameras; // One step per camera

        function nextStep() {
            if (stopRequested || !isRunning) {
                logMessage('Configuration stopped by user', 'WARNING');
                setRunningState(false);
                updateStatus('Stopped', 0);
                return;
            }

            if (currentIndex >= totalCameras) {
                logMessage('🎉 All cameras configured successfully!', 'INFO');
                setRunningState(false);
                updateStatus('Complete', 100);
                return;
            }

            const camera = cameras[currentIndex];
            const progress = Math.round(((currentIndex + 1) / totalCameras) * 100);

            // Log detailed information about the current camera
            logMessage(`📷 Processing Camera ${currentIndex + 1}/${totalCameras}`, 'INFO');
            logMessage(`   MAC Address: ${camera.mac}`, 'INFO');
            logMessage(`   Setting IP: ${camera.ip}`, 'INFO');
            logMessage(`   Setting Subnet: ${camera.subnet}`, 'INFO');
            logMessage(`   Setting Gateway: ${camera.gateway}`, 'INFO');
            logMessage(`   Applying credentials: ${username}/****`, 'INFO');

            // Simulate configuration process
            const configDelay = Math.floor(Math.random() * 800) + 600; // 600-1400ms

            updateStatus(`Configuring ${camera.mac} (${currentIndex + 1}/${totalCameras})`, progress);

            currentIndex++;

            // Simulate variable processing time
            currentThread = setTimeout(nextStep, configDelay);
        }

        // Start the first step with a slight delay
        currentThread = setTimeout(nextStep, 500);
    }

    // Initial state
    setRunningState(false);
    logMessage('Ready - Please load an Excel file with camera data', 'INFO');
    updateStatus('Ready', 0);
});
