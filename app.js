// app.js - Axis Camera Configuration Tool (with Real Backend API)

class CameraConfigApp {
    constructor() {
        // API URL - adjust if backend is on different port
        this.apiUrl = process.env.NODE_ENV === 'production' 
            ? '/api' 
            : 'http://localhost:3001/api';

        // DOM references
        this.usernameInput = document.getElementById('username-input');
        this.passwordInput = document.getElementById('password-input');
        this.fileInput = document.getElementById('file-input');
        this.fileNameDisplay = document.getElementById('file-name-display');
        this.fileStatus = document.getElementById('file-status');
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.progressFill = document.getElementById('progress-fill');
        this.progressLabel = document.getElementById('progress-label');
        this.statusText = document.getElementById('status-text');
        this.statusIndicator = document.getElementById('status-indicator');
        this.logOutput = document.getElementById('log-output');
        this.statsContainer = document.getElementById('stats-container');
        this.processedCount = document.getElementById('processed-count');
        this.totalCount = document.getElementById('total-count');
        this.successCount = document.getElementById('success-count');
        this.failedCount = document.getElementById('failed-count');
        this.browseBtn = document.getElementById('browse-btn');

        // State
        this.isRunning = false;
        this.shouldStop = false;
        this.stats = { processed: 0, total: 0, success: 0, failed: 0 };
        this.selectedFile = null;
        this.cameraData = [];
        this.uploadedFileId = null;

        // Default credentials
        this.USERNAME = 'root';
        this.PASSWORD = 'pass';

        // Check if elements exist
        this.checkElements();

        // Check API connection
        this.checkAPIConnection();

        // Bind events
        this.bindEvents();
        this.logMessage('Ready to start configuration', 'info');
    }

    checkElements() {
        console.log('Checking DOM elements...');
        console.log('fileInput:', this.fileInput);
        console.log('browseBtn:', this.browseBtn);
        console.log('usernameInput:', this.usernameInput);
        console.log('passwordInput:', this.passwordInput);
        
        if (!this.fileInput) {
            console.error('File input element not found!');
        }
        if (!this.browseBtn) {
            console.error('Browse button element not found!');
        }
    }

    async checkAPIConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            if (response.ok) {
                this.logMessage('✅ Backend API connected', 'info');
                this.updateStatus('Ready - API connected', null, 'ready');
            } else {
                this.logMessage('⚠️ Backend API not responding', 'warning');
                this.updateStatus('API not connected', null, 'error');
            }
        } catch (error) {
            this.logMessage(`❌ Cannot connect to backend API: ${error.message}`, 'error');
            this.logMessage('Make sure the backend server is running on port 3001', 'error');
            this.updateStatus('API connection failed', null, 'error');
        }
    }

    bindEvents() {
        // Start button
        this.startBtn.addEventListener('click', () => this.startConfiguration());
        
        // Stop button
        this.stopBtn.addEventListener('click', () => this.stopConfiguration());
        
        // Clear log button
        this.clearBtn.addEventListener('click', () => this.clearLog());
        
        // File input - handle change event
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                console.log('File input change event triggered', e);
                this.handleFileSelect(e);
            });
            
            // Debug: Log when file input is clicked
            this.fileInput.addEventListener('click', () => {
                console.log('File input clicked');
            });
        } else {
            console.error('File input element not found!');
        }

        // Browse button - triggers file input click
        if (this.browseBtn) {
            this.browseBtn.addEventListener('click', (e) => {
                console.log('Browse button clicked');
                e.preventDefault();
                if (this.fileInput) {
                    this.fileInput.click();
                    console.log('File input click triggered');
                } else {
                    console.error('File input is null!');
                }
            });
        } else {
            console.error('Browse button element not found!');
        }

        // Credentials change
        if (this.usernameInput) {
            this.usernameInput.addEventListener('change', () => {
                this.USERNAME = this.usernameInput.value || 'root';
            });
        }

        if (this.passwordInput) {
            this.passwordInput.addEventListener('change', () => {
                this.PASSWORD = this.passwordInput.value || 'pass';
            });
        }
    }

    async handleFileSelect(event) {
        console.log('handleFileSelect called', event);
        
        // Get the file from the event
        const file = event.target.files && event.target.files[0];
        console.log('Selected file:', file);
        
        if (!file) {
            console.log('No file selected');
            this.fileNameDisplay.textContent = 'No file selected';
            this.fileStatus.textContent = 'Select an Excel file with MAC, IP, SUBNET, GATEWAY columns';
            this.selectedFile = null;
            return;
        }

        // Validate file type
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(ext)) {
            this.logMessage(`❌ Invalid file type: ${ext}. Please select an Excel file (.xlsx or .xls)`, 'error');
            this.fileStatus.textContent = `❌ Invalid file type: ${ext}`;
            this.fileInput.value = ''; // Clear the input
            return;
        }

        this.fileNameDisplay.textContent = file.name;
        this.fileStatus.textContent = `Uploading: ${file.name}...`;
        this.selectedFile = file;

        try {
            // Upload file to backend
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiUrl}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Upload failed: ${response.status}`);
            }

            const data = await response.json();
            this.cameraData = data.cameras;
            this.fileStatus.textContent = `✅ Loaded ${data.count} cameras from ${file.name}`;
            this.logMessage(`✅ Successfully loaded ${data.count} cameras from Excel`, 'info');

            // Show preview
            const preview = this.cameraData.slice(0, 5);
            for (const cam of preview) {
                this.logMessage(`  ${cam.mac} → ${cam.ip} (${cam.subnet}, GW: ${cam.gateway})`, 'info');
            }
            if (this.cameraData.length > 5) {
                this.logMessage(`  ... and ${this.cameraData.length - 5} more`, 'info');
            }

            // Enable start button
            this.startBtn.disabled = false;

        } catch (error) {
            console.error('Upload error:', error);
            this.fileStatus.textContent = `❌ Error: ${error.message}`;
            this.logMessage(`❌ Failed to upload file: ${error.message}`, 'error');
            
            // Reset file input
            this.fileInput.value = '';
            this.selectedFile = null;
        }
    }

    logMessage(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const levelMap = {
            'info': 'log-info',
            'warning': 'log-warning',
            'error': 'log-error',
            'separator': 'log-separator'
        };
        const levelClass = levelMap[level] || 'log-info';

        const entry = document.createElement('span');
        entry.innerHTML = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
        entry.className = levelClass;
        this.logOutput.appendChild(entry);
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }

    clearLog() {
        this.logOutput.innerHTML = '';
        this.logMessage('Log cleared', 'info');
    }

    updateStatus(message, progress = null, statusType = 'ready') {
        this.statusText.textContent = message;
        this.statusIndicator.className = `status-indicator ${statusType}`;

        if (progress !== null) {
            const clamped = Math.min(100, Math.max(0, progress));
            this.progressFill.style.width = `${clamped}%`;
            this.progressLabel.textContent = `${Math.round(clamped)}% - ${message}`;
        } else {
            this.progressLabel.textContent = message;
        }
    }

    updateStats() {
        this.processedCount.textContent = this.stats.processed;
        this.totalCount.textContent = this.stats.total;
        this.successCount.textContent = this.stats.success;
        this.failedCount.textContent = this.stats.failed;
    }

    setButtonsEnabled(start, stop) {
        this.startBtn.disabled = !start;
        this.stopBtn.disabled = !stop;
    }

    async startConfiguration() {
        if (this.isRunning) return;

        if (this.cameraData.length === 0) {
            this.logMessage('Please upload an Excel file first', 'error');
            this.updateStatus('No camera data loaded', null, 'error');
            return;
        }

        this.USERNAME = this.usernameInput.value || 'root';
        this.PASSWORD = this.passwordInput.value || 'pass';

        this.isRunning = true;
        this.shouldStop = false;
        this.stats = { processed: 0, total: this.cameraData.length, success: 0, failed: 0 };
        this.statsContainer.style.display = 'flex';
        this.updateStats();

        this.setButtonsEnabled(false, true);
        this.updateStatus('Processing cameras...', 0, 'running');
        this.logMessage('='.repeat(40), 'separator');
        this.logMessage(`Starting camera configuration process...`, 'info');
        this.logMessage(`Credentials: ${this.USERNAME} / ${'*'.repeat(this.PASSWORD.length)}`, 'info');
        this.logMessage(`Total cameras: ${this.cameraData.length}`, 'info');

        try {
            let processed = 0;
            for (const camera of this.cameraData) {
                if (this.shouldStop) {
                    this.logMessage('Configuration stopped by user', 'warning');
                    break;
                }

                const progress = 10 + (processed / this.cameraData.length) * 80;
                this.updateStatus(
                    `Configuring ${camera.mac}... (${processed + 1}/${this.cameraData.length})`,
                    progress,
                    'running'
                );
                this.logMessage('-'.repeat(40), 'separator');

                const result = await this.configureCamera(camera);

                if (result.success) {
                    this.stats.success++;
                    this.logMessage(`✅ SUCCESS: ${camera.mac} configured to ${camera.ip}`, 'info');
                } else {
                    this.stats.failed++;
                    this.logMessage(`❌ FAILED: ${camera.mac} - ${result.error || 'Unknown error'}`, 'error');
                }

                this.stats.processed = ++processed;
                this.updateStats();
                await this.sleep(500);
            }

            this.updateStatus('Configuration complete', 100, 'ready');
            this.logMessage('='.repeat(40), 'separator');
            this.logMessage(`✅ Completed: ${this.stats.success} succeeded, ${this.stats.failed} failed`, 'info');

        } catch (error) {
            this.logMessage(`Error: ${error.message}`, 'error');
            this.updateStatus(`Error: ${error.message}`, null, 'error');
        } finally {
            this.isRunning = false;
            this.setButtonsEnabled(true, false);
        }
    }

    async configureCamera(camera) {
        try {
            this.logMessage(`Camera: ${camera.mac}`, 'info');
            this.logMessage(`  Current IP: ${camera.ip}`, 'info');
            this.logMessage(`  New IP: ${camera.ip}`, 'info');
            this.logMessage(`  Subnet: ${camera.subnet}`, 'info');
            this.logMessage(`  Gateway: ${camera.gateway}`, 'info');

            // First, test if camera is accessible
            this.logMessage('Testing camera connection...', 'info');
            const testResult = await this.testCameraConnection(camera.ip);
            if (!testResult.success) {
                return { success: false, error: 'Camera not accessible' };
            }
            this.logMessage('✅ Camera is accessible', 'info');

            // Configure camera
            const response = await fetch(`${this.apiUrl}/configure-camera`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip: camera.ip,
                    username: this.USERNAME,
                    password: this.PASSWORD,
                    newIp: camera.ip,
                    subnet: camera.subnet,
                    gateway: camera.gateway,
                    setCredentials: true,
                    rotateImage: true
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            // Log detailed results
            if (result.results) {
                const r = result.results;
                this.logMessage(`  Credentials: ${r.credentials ? '✅' : '❌'}`, 'info');
                this.logMessage(`  DHCP Release: ${r.dhcpRelease ? '✅' : '❌'}`, 'info');
                this.logMessage(`  Network Config: ${r.network ? '✅' : '❌'}`, 'info');
                this.logMessage(`  Rotation: ${r.rotation ? '✅' : '❌'}`, 'info');
                this.logMessage(`  Verification: ${r.verification ? '✅' : '❌'}`, 'info');
            }

            return {
                success: result.success,
                error: result.error,
                details: result.results
            };

        } catch (error) {
            this.logMessage(`Error: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    async testCameraConnection(ip) {
        try {
            const response = await fetch(`${this.apiUrl}/test-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip: ip,
                    username: this.USERNAME,
                    password: this.PASSWORD
                })
            });

            if (!response.ok) {
                return { success: false };
            }

            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    stopConfiguration() {
        if (this.isRunning) {
            this.shouldStop = true;
            this.logMessage('Stop requested by user', 'warning');
            this.updateStatus('Stopping...', null, 'error');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    const app = new CameraConfigApp();
    
    // Make app available globally for debugging
    window.app = app;
    console.log('App initialized. Access via window.app');
});

// Also initialize if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, initializing app...');
    // Check if app already exists
    if (!window.app) {
        const app = new CameraConfigApp();
        window.app = app;
    }
}
