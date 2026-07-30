// app.js - Axis Camera Configuration Tool
// Simplified version - works with local server

class CameraConfigApp {
    constructor() {
        // Use localhost for local development
        this.apiUrl = 'http://localhost:3001/api';

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

        // Default credentials
        this.USERNAME = 'root';
        this.PASSWORD = 'pass';

        console.log('API URL:', this.apiUrl);

        // Check API connection
        this.checkAPIConnection();

        // Bind events
        this.bindEvents();
        this.logMessage('Ready to start configuration', 'info');
    }

    async checkAPIConnection() {
        try {
            console.log('Checking API connection...');
            const response = await fetch(`${this.apiUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                this.logMessage(`✅ Backend API connected: ${data.message}`, 'info');
                this.updateStatus('Ready - API connected', null, 'ready');
                console.log('API connection successful');
            } else {
                this.logMessage('⚠️ Backend API not responding', 'warning');
                this.updateStatus('API not connected', null, 'error');
                console.log('API connection failed with status:', response.status);
            }
        } catch (error) {
            this.logMessage(`❌ Cannot connect to backend API: ${error.message}`, 'error');
            this.logMessage('Make sure the backend server is running on port 3001', 'error');
            this.logMessage('Run: npm start in the terminal', 'error');
            this.updateStatus('API connection failed - run npm start', null, 'error');
            console.error('API connection error:', error);
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
    }

    // ... rest of the methods remain the same as previous version ...
    // (handleFileSelect, logMessage, updateStatus, startConfiguration, etc.)
    
    // I'll include the full implementation in the final code
}
