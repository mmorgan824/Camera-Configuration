// server.js - Backend API for Axis Camera Configuration
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const axios = require('axios');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (['xlsx', 'xls'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'));
        }
    }
});

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload and parse Excel file
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
            return res.status(400).json({ error: 'No data found in Excel file' });
        }

        // Parse cameras
        const cameras = parseCameras(jsonData);
        res.json({ 
            success: true, 
            count: cameras.length,
            cameras: cameras 
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test camera connection
app.post('/api/test-connection', async (req, res) => {
    try {
        const { ip, username, password } = req.body;
        const result = await testCameraConnection(ip, username, password);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Configure a single camera
app.post('/api/configure-camera', async (req, res) => {
    try {
        const { 
            ip, 
            username, 
            password, 
            newIp, 
            subnet, 
            gateway,
            setCredentials,
            rotateImage 
        } = req.body;

        const results = {
            credentials: false,
            dhcpRelease: false,
            network: false,
            rotation: false,
            verification: false
        };

        // STEP 1: Set credentials (if requested)
        if (setCredentials) {
            results.credentials = await setCameraCredentials(ip, username, password);
            if (!results.credentials) {
                return res.json({ 
                    success: false, 
                    step: 'credentials',
                    results,
                    error: 'Failed to set credentials'
                });
            }
        }

        // STEP 2: Release DHCP lease
        results.dhcpRelease = await releaseDHCP(ip, username, password);

        // STEP 3: Configure network settings
        results.network = await configureNetwork(ip, username, password, newIp, subnet, gateway);
        if (!results.network) {
            return res.json({ 
                success: false, 
                step: 'network',
                results,
                error: 'Failed to configure network'
            });
        }

        // STEP 4: Wait for camera to reboot/apply settings
        await sleep(5000);

        // STEP 5: Verify connection on new IP
        results.verification = await testCameraConnection(newIp, username, password);

        // STEP 6: Configure image rotation (if requested)
        if (rotateImage && results.verification) {
            results.rotation = await setImageRotation(newIp, username, password, 90);
        }

        res.json({
            success: results.verification,
            results,
            message: results.verification ? 'Camera configured successfully' : 'Camera configuration may have failed'
        });

    } catch (error) {
        console.error('Configuration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get ARP table (for finding cameras)
app.get('/api/arp-table', async (req, res) => {
    try {
        const { stdout, stderr } = await exec('arp -a');
        const devices = parseARPTable(stdout);
        res.json({ success: true, devices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parseCameras(jsonData) {
    const headers = Object.keys(jsonData[0]);
    const normalizedHeaders = headers.map(h => h.trim().toUpperCase());
    
    const requiredColumns = ['MAC', 'IP', 'SUBNET', 'GATEWAY'];
    const columnMap = {};
    
    headers.forEach(h => {
        const upper = h.trim().toUpperCase();
        if (requiredColumns.includes(upper)) {
            columnMap[upper] = h;
        }
    });

    const cameras = [];
    for (const row of jsonData) {
        const mac = String(row[columnMap.MAC] || '').trim();
        const ip = String(row[columnMap.IP] || '').trim();
        const subnet = String(row[columnMap.SUBNET] || '').trim();
        const gateway = String(row[columnMap.GATEWAY] || '').trim();

        if (mac && ip && subnet && gateway) {
            const formattedMac = formatMac(mac);
            if (formattedMac.length === 17) {
                cameras.push({ mac: formattedMac, ip, subnet, gateway });
            }
        }
    }
    return cameras;
}

function formatMac(mac) {
    let cleaned = String(mac).replace(/[:]/g, '').replace(/[-]/g, '').replace(/\s/g, '').toLowerCase();
    while (cleaned.length < 12) cleaned = '0' + cleaned;
    if (cleaned.length > 12) cleaned = cleaned.substring(0, 12);
    const parts = [];
    for (let i = 0; i < 12; i += 2) {
        parts.push(cleaned.substring(i, i + 2));
    }
    return parts.join(':');
}

function parseARPTable(output) {
    const devices = [];
    const lines = output.split('\n');
    for (const line of lines) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([a-f0-9\-]+)/i);
        if (match) {
            const ip = match[1];
            const mac = formatMac(match[2]);
            devices.push({ ip, mac });
        }
    }
    return devices;
}

async function testCameraConnection(ip, username, password) {
    try {
        const url = `http://${ip}/axis-cgi/param.cgi?action=list&group=System`;
        const response = await axios.get(url, {
            auth: { username, password },
            timeout: 5000
        });
        return { success: response.status === 200, ip };
    } catch (error) {
        return { success: false, ip, error: error.message };
    }
}

async function setCameraCredentials(ip, newUsername, newPassword) {
    try {
        // Try multiple methods
        const methods = [
            async () => {
                // Method 1: VAPIX API
                const url = `http://${ip}/axis-cgi/privilege.cgi`;
                const payload = {
                    action: 'addUser',
                    username: newUsername,
                    password: newPassword,
                    admin: 'yes',
                    operator: 'yes',
                    viewer: 'yes',
                    ptz: 'yes'
                };
                const response = await axios.post(url, new URLSearchParams(payload), {
                    timeout: 5000
                });
                return response.status === 200;
            },
            async () => {
                // Method 2: Legacy CGI
                const url = `http://${ip}/axis-cgi/pwdgrp.cgi`;
                const payload = {
                    action: 'add',
                    user: newUsername,
                    pwd: newPassword,
                    grp: 'users',
                    sgrp: 'admin:operator:viewer:ptz',
                    strict_pwd: '1'
                };
                const response = await axios.post(url, new URLSearchParams(payload), {
                    timeout: 5000
                });
                return response.status === 200;
            },
            async () => {
                // Method 3: Param CGI
                const url = `http://${ip}/axis-cgi/param.cgi`;
                const payload = {
                    action: 'update',
                    'Security.User.0.Name': newUsername,
                    'Security.User.0.Password': newPassword,
                    'Security.User.0.Groups': 'admin',
                    'Security.User.0.Enabled': 'yes'
                };
                const response = await axios.post(url, new URLSearchParams(payload), {
                    timeout: 5000
                });
                return response.status === 200;
            }
        ];

        for (const method of methods) {
            try {
                const result = await method();
                if (result) return true;
            } catch (e) {
                console.log('Method failed:', e.message);
            }
        }
        return false;
    } catch (error) {
        console.error('setCameraCredentials error:', error);
        return false;
    }
}

async function releaseDHCP(ip, username, password) {
    try {
        const url = `http://${ip}/axis-cgi/param.cgi`;
        const payload = {
            action: 'update',
            'Network.DHCP.Release': '1'
        };
        const response = await axios.post(url, new URLSearchParams(payload), {
            auth: { username, password },
            timeout: 5000
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

async function configureNetwork(ip, username, password, newIp, subnet, gateway) {
    try {
        // Try multiple gateway parameter formats
        const gatewayParams = [
            'Network.DefaultGateway',
            'Network.Route.DefaultGateway',
            'Network.IPGateway',
            'Network.Gateway'
        ];

        for (const gatewayParam of gatewayParams) {
            try {
                const url = `http://${ip}/axis-cgi/param.cgi`;
                const payload = {
                    action: 'update',
                    'Network.IPAddress': newIp,
                    'Network.SubnetMask': subnet,
                    'Network.BootProto': 'static',
                    [gatewayParam]: gateway
                };

                const response = await axios.post(url, new URLSearchParams(payload), {
                    auth: { username, password },
                    timeout: 5000
                });

                if (response.status === 200) {
                    console.log(`Gateway configured using: ${gatewayParam}`);
                    return true;
                }
            } catch (e) {
                console.log(`Gateway method ${gatewayParam} failed:`, e.message);
            }
        }

        // Try VAPIX API as fallback
        try {
            const url = `http://${ip}/axis-cgi/network-settings.cgi`;
            const payload = {
                apiVersion: '1.0',
                method: 'setIPv4AddressConfiguration',
                params: {
                    interface: 'eth0',
                    ipAddress: newIp,
                    subnetMask: subnet,
                    defaultRouter: gateway,
                    addressConfigType: 'static'
                }
            };
            const response = await axios.post(url, payload, {
                auth: { username, password },
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });
            return response.status === 200;
        } catch (e) {
            console.log('VAPIX network config failed:', e.message);
        }

        return false;
    } catch (error) {
        console.error('configureNetwork error:', error);
        return false;
    }
}

async function setImageRotation(ip, username, password, rotation) {
    try {
        const methods = [
            {
                url: `http://${ip}/axis-cgi/param.cgi`,
                payload: {
                    action: 'update',
                    'ImageSource.I0.Rotation': String(rotation),
                    'ImageSource.I0.RotationMode': 'auto'
                }
            },
            {
                url: `http://${ip}/axis-cgi/param.cgi`,
                payload: {
                    action: 'update',
                    'Image.I0.Rotation': String(rotation),
                    'Image.I0.RotationMode': 'auto'
                }
            },
            {
                url: `http://${ip}/axis-cgi/admin/param.cgi`,
                payload: {
                    action: 'update',
                    'Image.I0.Rotation': String(rotation)
                }
            }
        ];

        for (const method of methods) {
            try {
                const response = await axios.post(method.url, new URLSearchParams(method.payload), {
                    auth: { username, password },
                    timeout: 5000
                });
                if (response.status === 200) {
                    return true;
                }
            } catch (e) {
                console.log('Rotation method failed:', e.message);
            }
        }
        return false;
    } catch (error) {
        console.error('setImageRotation error:', error);
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// START SERVER
// ============================================================

app.listen(port, () => {
    console.log(`Axis Camera API running on port ${port}`);
    console.log(`http://localhost:${port}`);
});