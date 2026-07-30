
class CameraConfigApp {
    constructor() {
        // Detect environment and set API URL
        this.apiUrl = this.getApiUrl();

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
        this.fileProgressFill = document.getElementById('file-progress-fill');
        this.fileProgressText = document.getElementById('file-progress-text');
        this.fileUploadProgress = document.getElementById('file-upload-progress');
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

        // Log API URL
        console.log('API URL:', this.apiUrl);

        // Check API connection
        this.checkAPIConnection();

        // Bind events
        this.bindEvents();
        this.logMessage('Ready to start configuration', 'info');
    }

    getApiUrl() {
        // If running on Vercel, use the same domain
        if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost')) {
            // Check if we're on the same port or different
            if (window.location.port === '3000') {
                return 'http://localhost:3001/api'; // Local dev with separate backend
            }
            return '/api'; // Vercel or same server
        }
        // Local development
        return 'http://localhost:3001/api';
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
            if (window.location.hostname.includes('vercel.app')) {
                this.logMessage('Make sure the API routes are properly configured in vercel.json', 'error');
            } else {
                this.logMessage('Make sure the backend server is running on port 3001', 'error');
                this.logMessage('Run: npm start in the backend directory', 'error');
            }
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
        
        // Browse button - triggers file input click
        if (this.browseBtn) {
            this.browseBtn.addEventListener('click', () => {
                console.log('Browse button clicked, triggering file input');
                this.fileInput.click();
            });
        }
        
        // File input - handle change event
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input changed', e);
            this.handleFileSelect(e);
        });

        // Credentials change
        this.usernameInput.addEventListener('change', () => {
            this.USERNAME = this.usernameInput.value || 'root';
        });

        this.passwordInput.addEventListener('change', () => {
            this.PASSWORD = this.passwordInput.value || 'pass';
        });

        // Debug: Log when file input is clicked
        this.fileInput.addEventListener('click', () => {
            console.log('File input clicked');
        });
    }

    async handleFileSelect(event) {
        console.log('handleFileSelect called', event);
        
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

        // Show upload progress
        this.fileUploadProgress.style.display = 'block';
        this.fileProgressFill.style.width = '0%';
        this.fileProgressText.textContent = 'Uploading...';

        try {
            // Upload file to backend
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                if (progress <= 90) {
                    this.fileProgressFill.style.width = `${progress}%`;
                    this.fileProgressText.textContent = `Uploading... ${progress}%`;
                }
            }, 100);

            const response = await fetch(`${this.apiUrl}/upload`, {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            this.fileProgressFill.style.width = '100%';

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Upload failed: ${response.status}`);
            }

            const data = await response.json();
            this.cameraData = data.cameras;
            
            this.fileStatus.textContent = `✅ Loaded ${data.count} cameras from ${file.name}`;
            this.fileProgressText.textContent = `✅ Complete! Loaded ${data.count} cameras`;
            this.logMessage(`✅ Successfully loaded ${data.count} cameras from Excel`, 'info');

            // Show preview
            const preview = this.cameraData.slice(0, 5);
            for (const cam of preview) {
                this.logMessage(`  ${cam.mac} → ${cam.ip} (${cam.subnet}, GW: ${cam.gateway})`, 'info');
            }
            if (this.cameraData.length > 5) {
                this.logMessage(`  ... and ${this.cameraData.length - 5} more`, 'info');
            }

            // Enable start button if we have data
            if (this.cameraData.length > 0) {
                this.startBtn.disabled = false;
            }

            // Hide progress after 2 seconds
            setTimeout(() => {
                this.fileUploadProgress.style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Upload error:', error);
            this.fileStatus.textContent = `❌ Error: ${error.message}`;
            this.fileProgressText.textContent = `❌ Error: ${error.message}`;
            this.logMessage(`❌ Failed to upload file: ${error.message}`, 'error');
            
            // Reset file input
            this.fileInput.value = '';
            this.selectedFile = null;
            
            // Show error for a bit longer
            setTimeout(() => {
                this.fileUploadProgress.style.display = 'none';
            }, 5000);
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    const app = new CameraConfigApp();
    
    // Make app available globally for debugging
    window.app = app;
    console.log('App initialized. You can access it via window.app');
});
     
