
class CameraConfigApp {
    constructor() {
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

        // State
        this.isRunning = false;
        this.shouldStop = false;
        this.credentialsCache = {};
        this.stats = { processed: 0, total: 0, success: 0, failed: 0 };
        this.selectedFile = null;
        this.cameraData = [];

        // Default credentials
        this.USERNAME = 'root';
        this.PASSWORD = 'pass';

        // Bind events
        this.bindEvents();

        // Log initial message
        this.logMessage('Ready to start configuration', 'info');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startConfiguration());
        this.stopBtn.addEventListener('click', () => this.stopConfiguration());
        this.clearBtn.addEventListener('click', () => this.clearLog());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        document.getElementById('browse-btn').addEventListener('click', () => {
            this.fileInput.click();
        });

        this.usernameInput.addEventListener('change', () => {
            this.USERNAME = this.usernameInput.value || 'root';
        });

        this.passwordInput.addEventListener('change', () => {
            this.PASSWORD = this.passwordInput.value || 'pass';
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.fileNameDisplay.textContent = file.name;
            this.fileStatus.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            this.selectedFile = file;
        } else {
            this.fileNameDisplay.textContent = 'No file selected';
            this.fileStatus.textContent = 'Default: Axis.xlsx';
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

        // Check if file is selected
        if (!this.selectedFile) {
            this.logMessage('Please select an Excel file first', 'error');
            this.updateStatus('No file selected', null, 'error');
            return;
        }

        // Get credentials
        this.USERNAME = this.usernameInput.value || 'root';
        this.PASSWORD = this.passwordInput.value || 'pass';

        this.isRunning = true;
        this.shouldStop = false;
        this.stats = { processed: 0, total: 0, success: 0, failed: 0 };
        this.statsContainer.style.display = 'flex';
        this.updateStats();

        this.setButtonsEnabled(false, true);
        this.updateStatus('Processing cameras...', 0, 'running');
        this.logMessage('='.repeat(40), 'separator');
        this.logMessage(`Starting camera configuration process...`, 'info');
        this.logMessage(`Will set username: ${this.USERNAME}, password: ${'*'.repeat(this.PASSWORD.length)}`, 'info');

        try {
            // Read the Excel file
            this.cameraData = await this.readExcelFile(this.selectedFile);
            this.logMessage(`Found ${this.cameraData.length} cameras in Excel file`, 'info');

            if (this.cameraData.length === 0) {
                this.logMessage('No cameras found in Excel file', 'error');
                this.updateStatus('No cameras found', 100, 'error');
                return;
            }

            this.stats.total = this.cameraData.length;
            this.updateStats();

            // Process each camera
            let processed = 0;
            for (const camera of this.cameraData) {
                if (this.shouldStop) {
                    this.logMessage('Configuration stopped by user', 'warning');
                    break;
                }

                const progress = 10 + (processed / this.cameraData.length) * 80;
                this.updateStatus(
                    `Processing camera ${processed + 1}/${this.cameraData.length}...`,
                    progress,
                    'running'
                );
                this.logMessage('-'.repeat(40), 'separator');

                // Process the camera
                const result = await this.processCamera(camera, processed + 1, this.cameraData.length);

                if (result.success) {
                    this.stats.success++;
                    this.logMessage(`✅ Successfully configured camera ${camera.mac}`, 'info');
                } else {
                    this.stats.failed++;
                    this.logMessage(`❌ Failed to configure camera ${camera.mac}: ${result.error}`, 'error');
                }

                this.stats.processed++;
                processed++;
                this.updateStats();

                // Small delay for UI update
                await this.sleep(300);
            }

            // Final status
            this.updateStatus('Configuration complete', 100, 'ready');
            this.logMessage('='.repeat(40), 'separator');
            this.logMessage(
                `Process finished. Success: ${this.stats.success}, Failed: ${this.stats.failed}`,
                'info'
            );

        } catch (error) {
            this.logMessage(`Error: ${error.message}`, 'error');
            this.updateStatus(`Error: ${error.message}`, null, 'error');
        } finally {
            this.isRunning = false;
            this.setButtonsEnabled(true, false);
            if (!this.shouldStop) {
                this.updateStatus('Configuration complete', 100, 'ready');
            }
        }
    }

    stopConfiguration() {
        if (this.isRunning) {
            this.shouldStop = true;
            this.logMessage('Stop requested by user', 'warning');
            this.updateStatus('Stopping...', null, 'error');
        }
    }

    // Read Excel file (simulated)
    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            this.logMessage('Reading Excel file...', 'info');

            // In a real implementation, you would parse the actual Excel file here
            // For demo, we return sample data
            const sampleData = [
                { mac: '00:11:22:33:44:55', ip: '192.168.1.100', subnet: '255.255.255.0', gateway: '192.168.1.1' },
                { mac: '00:11:22:33:44:56', ip: '192.168.1.101', subnet: '255.255.255.0', gateway: '192.168.1.1' },
                { mac: '00:11:22:33:44:57', ip: '192.168.1.102', subnet: '255.255.255.0', gateway: '192.168.1.1' },
                { mac: '00:11:22:33:44:58', ip: '192.168.1.103', subnet: '255.255.255.0', gateway: '192.168.1.1' },
                { mac: '00:11:22:33:44:59', ip: '192.168.1.104', subnet: '255.255.255.0', gateway: '192.168.1.1' },
            ];

            setTimeout(() => {
                resolve(sampleData);
            }, 500);
        });
    }

    // Process a single camera (simulated)
    async processCamera(camera, index, total) {
        const mac = this.formatMac(camera.mac);
        this.logMessage(`Camera Found - MAC: ${mac}`, 'info');
        this.logMessage(`Current IP: ${camera.ip}`, 'info');
        this.logMessage(`New IP: ${camera.ip}`, 'info');
        this.logMessage(`Subnet: ${camera.subnet}`, 'info');
        this.logMessage(`Gateway: ${camera.gateway}`, 'info');

        // STEP 1: Set credentials
        this.logMessage('STEP 1: Setting credentials on camera...', 'info');
        const authSuccess = await this.autoSetCredentials(camera.ip);
        if (!authSuccess) {
            return { success: false, error: 'Failed to set credentials' };
        }
        this.logMessage('Credentials successfully set', 'info');

        // STEP 2: Release DHCP
        this.logMessage('STEP 2: Releasing DHCP lease...', 'info');
        await this.sleep(500);

        // STEP 3: Configure network
        this.logMessage('STEP 3: Configuring network settings...', 'info');
        const networkSuccess = await this.configureNetwork(camera.ip, camera.ip, camera.subnet, camera.gateway);
        if (!networkSuccess) {
            return { success: false, error: 'Failed to configure network' };
        }
        this.logMessage(`SUCCESS: Configuration sent to ${mac}`, 'info');

        // STEP 4: Configure image rotation
        this.logMessage('STEP 4: Configuring image rotation...', 'info');
        await this.configureImageRotation(camera.ip);

        return { success: true };
    }

    // Simulate setting credentials
    async autoSetCredentials(ip) {
        this.logMessage(`Attempting to automatically set credentials on ${ip}`, 'info');

        const methods = ['VAPIX API (Modern)', 'Legacy CGI', 'Param CGI'];

        for (const method of methods) {
            this.logMessage(`  Trying ${method}...`, 'info');
            await this.sleep(400);

            // Simulate success (90% chance for demo)
            if (Math.random() < 0.9) {
                this.logMessage(`  ${method} succeeded`, 'info');
                await this.sleep(300);

                // Verify credentials
                const verified = await this.testCameraConnection(ip);
                if (verified) {
                    this.logMessage(`  Credentials verified on ${ip}`, 'info');
                    this.credentialsCache[ip] = { username: this.USERNAME, password: this.PASSWORD };
                    return true;
                } else {
                    this.logMessage(`  Credentials set but verification failed`, 'warning');
                    return false;
                }
            } else {
                this.logMessage(`  ${method} failed`, 'warning');
            }
        }

        this.logMessage(`All credential setting methods failed for ${ip}`, 'error');
        return false;
    }

    // Simulate network configuration
    async configureNetwork(ip, newIp, subnet, gateway) {
        this.logMessage(`Configuring network settings for ${ip}`, 'info');

        // Try multiple methods
        const methods = ['Direct parameter setting', 'VAPIX API', 'Legacy CGI'];

        for (const method of methods) {
            this.logMessage(`  Method: ${method}...`, 'info');
            await this.sleep(400);

            // Simulate success (95% chance)
            if (Math.random() < 0.95) {
                this.logMessage(`  ${method} succeeded`, 'info');
                return true;
            } else {
                this.logMessage(`  ${method} failed`, 'warning');
            }
        }

        return false;
    }

    async testCameraConnection(ip) {
        await this.sleep(300);
        // Simulate 90% success rate
        return Math.random() < 0.9;
    }

    async configureImageRotation(ip) {
        this.logMessage('Setting image rotation to 90 degrees...', 'info');
        await this.sleep(400);

        const success = Math.random() < 0.95;
        if (success) {
            this.logMessage('Image rotated 90 degrees', 'info');
        } else {
            this.logMessage('Failed to rotate image', 'warning');
        }
        return success;
    }

    formatMac(mac) {
        let cleaned = mac.replace(/[:]/g, '').replace(/[-]/g, '').toLowerCase();
        // Ensure 12 characters
        while (cleaned.length < 12) cleaned = '0' + cleaned;
        const parts = [];
        for (let i = 0; i < 12; i += 2) {
            parts.push(cleaned.substring(i, i + 2));
        }
        return parts.join(':');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new CameraConfigApp();
});