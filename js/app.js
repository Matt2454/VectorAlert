// VectorAlert Main Application Controller
// Coordinates all modules and handles application lifecycle

class VectorAlert {
    constructor() {
        this.isInitialized = false;
        this.isScanning = false;
        this.settings = {
            watchRadius: 5,
            targetAircraft: '',
            scanInterval: 20,
            soundEnabled: true,
            osNotificationsEnabled: true
        };
        
        this.initializeApp();
    }

    // Initialize application
    async initializeApp() {
        try {
            console.log('Initializing VectorAlert...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Load settings
            this.loadSettings();
            
            // Initialize modules
            await this.initializeModules();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update initial UI state
            this.updateInitialState();
            
            this.isInitialized = true;
            console.log('VectorAlert initialized successfully');
            
            // Show ready notification
            this.showReadyNotification();
            
        } catch (error) {
            console.error('Failed to initialize VectorAlert:', error);
            this.showErrorNotification(error.message);
        }
    }

    // Initialize all modules
    async initializeModules() {
        // Test geolocation
        try {
            await window.geoService.getCurrentPosition();
            window.uiManager.updateLocationStatus('ACTIVE', window.geoService.currentPosition);
        } catch (error) {
            console.warn('Geolocation not available:', error);
            window.uiManager.updateLocationStatus('NO_POSITION');
        }

        // Test API connection
        try {
            const apiTest = await window.openSkyAPI.testConnection();
            if (apiTest.success) {
                window.uiManager.updateAPIStatus('ONLINE');
            } else {
                window.uiManager.updateAPIStatus('ERROR');
            }
        } catch (error) {
            console.warn('API test failed:', error);
            window.uiManager.updateAPIStatus('OFFLINE');
        }

        // Test alert system
        try {
            await window.alertSystem.testAlertSystem();
        } catch (error) {
            console.warn('Alert system test failed:', error);
        }
    }

    // Set up event listeners
    setupEventListeners() {
        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, can reduce update frequency
                console.log('Page hidden, reducing update frequency');
            } else {
                // Page is visible, resume normal updates
                console.log('Page visible, resuming normal updates');
            }
        });

        // Geolocation watch
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => {
                    window.geoService.currentPosition = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    window.geoService.accuracy = position.coords.accuracy;
                    window.geoService.timestamp = position.timestamp;
                    window.uiManager.updateLocationStatus('ACTIVE', window.geoService.currentPosition);
                },
                (error) => {
                    console.warn('Geolocation watch error:', error);
                    window.uiManager.updateLocationStatus('STALE');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                }
            );
        }
    }

    // Update initial UI state
    updateInitialState() {
        // Apply loaded settings
        window.geoService.setWatchRadius(this.settings.watchRadius);
        window.alertSystem.setSoundEnabled(this.settings.soundEnabled);
        window.alertSystem.setOSNotificationsEnabled(this.settings.osNotificationsEnabled);
        
        if (window.uiManager.elements.targetAircraft) {
            window.uiManager.elements.targetAircraft.value = this.settings.targetAircraft;
        }
        if (window.uiManager.elements.scanInterval) {
            window.uiManager.elements.scanInterval.value = this.settings.scanInterval;
        }
        if (window.uiManager.elements.soundEnabled) {
            window.uiManager.elements.soundEnabled.checked = this.settings.soundEnabled;
        }
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('vectoralert_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('vectoralert_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    // Handle online status
    handleOnline() {
        console.log('Application online');
        window.uiManager.updateAPIStatus('ONLINE');
        
        // Resume scanning if it was active
        if (this.isScanning && !window.uiManager.isScanning) {
            window.uiManager.startScanning();
        }
    }

    // Handle offline status
    handleOffline() {
        console.log('Application offline');
        window.uiManager.updateAPIStatus('OFFLINE');
        
        // Pause scanning
        if (window.uiManager.isScanning) {
            window.uiManager.stopScanning();
        }
    }

    // Show ready notification
    showReadyNotification() {
        window.alertSystem.triggerGenericAlert(
            'VectorAlert Ready',
            'System initialized and ready for monitoring',
            'info'
        );
    }

    // Show error notification
    showErrorNotification(message) {
        window.alertSystem.triggerGenericAlert(
            'VectorAlert Error',
            message,
            'error'
        );
    }

    // Get application status
    getStatus() {
        return {
            initialized: this.isInitialized,
            scanning: window.uiManager?.isScanning || false,
            position: window.geoService?.exportPositionData(),
            api: window.openSkyAPI?.getAPIStatus(),
            alerts: window.alertSystem?.getStatus(),
            ui: window.uiManager?.getStatus(),
            settings: this.settings
        };
    }

    // Export application data
    exportData() {
        return {
            settings: this.settings,
            status: this.getStatus(),
            timestamp: new Date().toISOString()
        };
    }

    // Cleanup resources
    cleanup() {
        console.log('Cleaning up VectorAlert...');
        
        // Stop scanning
        if (window.uiManager?.isScanning) {
            window.uiManager.stopScanning();
        }
        
        // Clear alerts
        window.alertSystem?.clearAllAlerts();
        
        // Save settings
        this.saveSettings();
        
        console.log('VectorAlert cleanup complete');
    }

    // Restart application
    async restart() {
        console.log('Restarting VectorAlert...');
        
        // Cleanup first
        this.cleanup();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reinitialize
        await this.initializeApp();
    }

    // Get system diagnostics
    getDiagnostics() {
        const diagnostics = {
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                onLine: navigator.onLine,
                cookieEnabled: navigator.cookieEnabled
            },
            capabilities: {
                geolocation: !!navigator.geolocation,
                notifications: 'Notification' in window,
                audioContext: !!(window.AudioContext || window.webkitAudioContext),
                localStorage: !!window.localStorage
            },
            modules: {
                geoService: !!window.geoService,
                openSkyAPI: !!window.openSkyAPI,
                alertSystem: !!window.alertSystem,
                uiManager: !!window.uiManager
            },
            performance: {
                memory: performance.memory ? {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                } : null,
                timing: performance.timing
            }
        };
        
        return diagnostics;
    }

    // Debug method to test all systems
    async runDiagnostics() {
        console.log('Running VectorAlert diagnostics...');
        
        const diagnostics = this.getDiagnostics();
        console.log('System Diagnostics:', diagnostics);
        
        // Test each module
        const tests = {
            geolocation: async () => {
                try {
                    const pos = await window.geoService.getCurrentPosition();
                    return { success: true, position: pos };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            api: async () => {
                try {
                    const result = await window.openSkyAPI.testConnection();
                    return result;
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            alerts: async () => {
                try {
                    const result = await window.alertSystem.testAlertSystem();
                    return { success: true, ...result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        };
        
        const results = {};
        for (const [name, test] of Object.entries(tests)) {
            try {
                results[name] = await test();
            } catch (error) {
                results[name] = { success: false, error: error.message };
            }
        }
        
        console.log('Diagnostic Results:', results);
        return { diagnostics, tests: results };
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.vectorAlert = new VectorAlert();
        
        // Make app available globally for debugging
        window.app = window.vectorAlert;
        
        // Add debug method to console
        window.debugVectorAlert = () => {
            console.log('VectorAlert Status:', window.vectorAlert.getStatus());
            console.log('VectorAlert Diagnostics:', window.vectorAlert.getDiagnostics());
        };
        
    } catch (error) {
        console.error('Failed to start VectorAlert:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.vectorAlert) {
        window.vectorAlert.cleanup();
    }
});
