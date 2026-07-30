
class CameraConfigApp {
    constructor() {
        // API URL - adjust if backend is on different port
        this.apiUrl = process.env.NODE_ENV === 'production' 
            ? '/api' 
            : 'http://localhost:3001/api';

        // DOM references - using querySelector for better reliability
        this.usernameInput = document.querySelector('#username-input');
        this.passwordInput = document.querySelector('#password-input');
        this.fileInput = document.querySelector('#file-input');
        this.fileNameDisplay = document.querySelector('#file-name-display');
        this.fileStatus = document.querySelector('#file-status');
        this.startBtn = document.querySelector('#start-btn');
        this.stopBtn = document.querySelector('#stop-btn');
        this.clearBtn = document.querySelector('#clear-btn');
        this.progressFill = document.querySelector('#progress-fill');
        this.progressLabel = document.querySelector('#progress-label');
        this.statusText = document.querySelector('#status-text');
        this.statusIndicator = document.querySelector('#status-indicator');
        this.logOutput = document.querySelector('#log-output');
        this.statsContainer = document.querySelector('#stats-container');
        this.processedCount = document.querySelector('#processed-count');
        this.totalCount = document.querySelector('#total-count');
        this.successCount = document.querySelector('#success-count');
        this.failedCount = document.querySelector('#failed-count');
        this.browseBtn = document.querySelector('#browse-btn');

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
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startConfiguration());
        }
        
        // Stop button
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopConfiguration());
        }
        
        // Clear log button
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearLog());
        }
        
        // File input - handle change event
        if (this.fileInput) {
            // Remove any existing listeners to prevent duplicates
            this.fileInput.removeEventListener('change', this.handleFileSelect);
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
            // Remove any existing listeners to prevent duplicates
            this.browseBtn.removeEventListener('click', this.handleBrowseClick);
            
            // Use an arrow function to maintain context
            this.browseBtn.addEventListener('click', (e) => {
                console.log('Browse button clicked');
                e.preventDefault();
                e.stopPropagation();
                
                if (this.fileInput) {
                    console.log('Triggering file input click');
                    // Try multiple methods to trigger the file dialog
                    try {
                        this.fileInput.click();
                        console.log('File input click triggered successfully');
                    } catch (error) {
                        console.error('Error triggering file input click:', error);
                        // Fallback: create and trigger a new file input
                        this.createFallbackFileInput();
                    }
                } else {
                    console.error('File input is null!');
                    // Try to find the file input again
                    this.fileInput = document.querySelector('#file-input');
                    if (this.fileInput) {
                        console.log('Re-found file input, triggering click');
                        this.fileInput.click();
                    } else {
                        console.error('File input still not found after retry');
                        this.createFallbackFileInput();
                    }
                }
            });
            
            console.log('Browse button listener attached');
        } else {
            console.error('Browse button element not found!');
        }

        // Credentials change
        if (this.usernameInput) {
            this.usernameInput.addEventListener('change', () => {
                this.USERNAME = this.usernameInput.value || 'root';
            });
            // Also update on input for real-time changes
            this.usernameInput.addEventListener('input', () => {
                this.USERNAME = this.usernameInput.value || 'root';
            });
        }

        if (this.passwordInput) {
            this.passwordInput.addEventListener('change', () => {
                this.PASSWORD = this.passwordInput.value || 'pass';
            });
            // Also update on input for real-time changes
            this.passwordInput.addEventListener('input', () => {
                this.PASSWORD = this.passwordInput.value || 'pass';
            });
        }
    }

    // Fallback method if the file input click doesn't work
    createFallbackFileInput() {
        console.log('Creating fallback file input');
        const fallbackInput = document.createElement('input');
        fallbackInput.type = 'file';
        fallbackInput.accept = '.xlsx,.xls';
        fallbackInput.style.display = 'none';
        document.body.appendChild(fallbackInput);
        
        fallbackInput.addEventListener('change', (e) => {
            console.log('Fallback file input changed');
            this.handleFileSelect(e);
            document.body.removeChild(fallbackInput);
        });
        
        fallbackInput.click();
    }

    async handleFileSelect(event) {
        console.log('handleFileSelect called', event);
        
        // Get the file from the event
        const file = event.target.files && event.target.files[0];
        console.log('Selected file:', file);
        
        if (!file) {
            console.log('No file selected');
            if (this.fileNameDisplay) {
                this.fileNameDisplay.textContent = 'No file selected';
            }
            if (this.fileStatus) {
                this.fileStatus.textContent = 'Select an Excel file with MAC, IP, SUBNET, GATEWAY columns';
            }
            this.selectedFile = null;
            return;
        }

        // Validate file type
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(ext)) {
            this.logMessage(`❌ Invalid file type: ${ext}. Please select an Excel file (.xlsx or .xls)`, 'error');
            if (this.fileStatus) {
                this.fileStatus.textContent = `❌ Invalid file type: ${ext}`;
            }
            if (this.fileInput) {
                this.fileInput.value = ''; // Clear the input
            }
            return;
        }

        if (this.fileNameDisplay) {
            this.fileNameDisplay.textContent = file.name;
        }
        if (this.fileStatus) {
            this.fileStatus.textContent = `Uploading: ${file.name}...`;
        }
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
            if (this.fileStatus) {
                this.fileStatus.textContent = `✅ Loaded ${data.count} cameras from ${file.name}`;
            }
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
            if (this.startBtn) {
                this.startBtn.disabled = false;
            }

        } catch (error) {
            console.error('Upload error:', error);
            if (this.fileStatus) {
                this.fileStatus.textContent = `❌ Error: ${error.message}`;
            }
            this.logMessage(`❌ Failed to upload file: ${error.message}`, 'error');
            
            // Reset file input
            if (this.fileInput) {
                this.fileInput.value = '';
            }
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
        
        if (this.logOutput) {
            this.logOutput.appendChild(entry);
            this.logOutput.scrollTop = this.logOutput.scrollHeight;
        }
    }

    clearLog() {
        if (this.logOutput) {
            this.logOutput.innerHTML = '';
        }
        this.logMessage('Log cleared', 'info');
    }

    updateStatus(message, progress = null, statusType = 'ready') {
        if (this.statusText) {
            this.statusText.textContent = message;
        }
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator ${statusType}`;
        }

        if (progress !== null && this.progressFill && this.progressLabel) {
            const clamped = Math.min(100, Math.max(0, progress));
            this.progressFill.style.width = `${clamped}%`;
            this.progressLabel.textContent = `${Math.round(clamped)}% - ${message}`;
        } else if (this.progressLabel) {
            this.progressLabel.textContent = message;
        }
    }

    updateStats() {
        if (this.processedCount) this.processedCount.textContent = this.stats.processed;
        if (this.totalCount) this.totalCount.textContent = this.stats.total;
        if (this.successCount) this.successCount.textContent = this.stats.success;
        if (this.failedCount) this.failedCount.textContent = this.stats.failed;
    }

    setButtonsEnabled(start, stop) {
        if (this.startBtn) this.startBtn.disabled = !start;
        if (this.stopBtn) this.stopBtn.disabled = !stop;
    }

    async startConfiguration() {
        if (this.isRunning) return;

        if (this.cameraData.length === 0) {
            this.logMessage('Please upload an Excel file first', 'error');
            this.updateStatus('No camera data loaded', null, 'error');
            return;
        }

        this.USERNAME = this.usernameInput ? this.usernameInput.value || 'root' : 'root';
        this.PASSWORD = this.passwordInput ? this.passwordInput.value || 'pass' : 'pass';

        this.isRunning = true;
        this.shouldStop = false;
        this.stats = { processed: 0, total: this.cameraData.length, success: 0, failed: 0 };
        if (this.statsContainer) {
            this.statsContainer.style.display = 'flex';
        }
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
    // Check if app already exists
    if (!window.app) {
        const app = new CameraConfigApp();
        window.app = app;
        console.log('App initialized. Access via window.app');
    }
});

// Also initialize if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, initializing app...');
    if (!window.app) {
        const app = new CameraConfigApp();
        window.app = app;
    }
}
