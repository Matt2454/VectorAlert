// VectorAlert Alerts Module
// Handles acoustic alerts, visual notifications, and OS notifications

class AlertSystem {
    constructor() {
        this.soundEnabled = true;
        this.osNotificationsEnabled = true;
        this.audioContext = null;
        this.alertSound = null;
        this.notificationPermission = 'default';
        this.activeAlerts = new Set();
        this.alertHistory = [];
        this.maxHistoryItems = 50;
        this.alertCooldown = 5000; // 5 seconds between alerts for same aircraft
        this.lastAlertTimes = new Map();
        
        this.initializeAudio();
        this.requestNotificationPermission();
    }

    // Initialize Web Audio API
    initializeAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.soundEnabled = false;
        }
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                this.notificationPermission = permission;
                this.osNotificationsEnabled = permission === 'granted';
            } else {
                this.notificationPermission = Notification.permission;
                this.osNotificationsEnabled = Notification.permission === 'granted';
            }
        } else {
            console.warn('Notifications not supported');
            this.osNotificationsEnabled = false;
        }
    }

    // Generate alert ping sound
    generateAlertSound(frequency = 800, duration = 200) {
        if (!this.audioContext || !this.soundEnabled) {
            return;
        }

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        } catch (error) {
            console.warn('Failed to generate alert sound:', error);
        }
    }

    // Play multiple pings for urgent alerts
    playUrgentAlert() {
        if (!this.soundEnabled) return;

        const frequencies = [800, 1000, 1200];
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.generateAlertSound(freq, 150);
            }, index * 200);
        });
    }

    // Create OS notification
    createOSNotification(title, options = {}) {
        if (!this.osNotificationsEnabled || this.notificationPermission !== 'granted') {
            return null;
        }

        try {
            const notification = new Notification(title, {
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjJTMjIgMTcuNTIgMjIgMTJTMTcuNTIgMiAxMiAyWk0xMyAxN0gxMVYxMUgxM1YxN1pNMTMgN0gxMVY5SDEzVjdaIiBmaWxsPSIjZmYwMDAwIi8+Cjwvc3ZnPg==',
                badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjAiIGZpbGw9IiMwMGZmMDAiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIxNiIgcj0iNCIgZmlsbD0iIzAwMDAwMCIvPgo8L3N2Zz4=',
                tag: 'vectoralert-interception',
                requireInteraction: true,
                ...options
            });

            // Auto-close after 10 seconds
            setTimeout(() => {
                notification.close();
            }, 10000);

            return notification;
        } catch (error) {
            console.warn('Failed to create OS notification:', error);
            return null;
        }
    }

    // Trigger interception alert
    triggerInterceptionAlert(aircraft) {
        const alertId = `${aircraft.icao24}_${aircraft.callsign}`;
        const now = Date.now();
        const lastAlertTime = this.lastAlertTimes.get(alertId) || 0;

        // Check cooldown
        if (now - lastAlertTime < this.alertCooldown) {
            return false; // Still in cooldown
        }

        this.lastAlertTimes.set(alertId, now);
        this.activeAlerts.add(alertId);

        // Generate acoustic alert
        this.playUrgentAlert();

        // Create OS notification
        const notification = this.createOSNotification(
            '⚠ INTERCEPTION DETECTED',
            {
                body: `${aircraft.callsign} (${aircraft.icao24}) - Distance: ${aircraft.distance}km`,
                data: aircraft
            }
        );

        // Add to alert history
        const alertEntry = {
            id: alertId,
            timestamp: now,
            aircraft: aircraft,
            type: 'interception'
        };
        this.alertHistory.unshift(alertEntry);
        
        // Limit history size
        if (this.alertHistory.length > this.maxHistoryItems) {
            this.alertHistory = this.alertHistory.slice(0, this.maxHistoryItems);
        }

        // Trigger visual alert
        this.triggerVisualAlert();

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('interceptionAlert', {
            detail: { aircraft, alertEntry }
        }));

        return true;
    }

    // Trigger visual alert effects
    triggerVisualAlert() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.add('app-alert');
            
            // Remove after animation
            setTimeout(() => {
                app.classList.remove('app-alert');
            }, 3000);
        }
    }

    // Show alert modal
    showAlertModal(aircraft) {
        const modal = document.getElementById('alert-modal');
        if (!modal) return;

        // Update modal content
        document.getElementById('target-callsign').textContent = aircraft.callsign;
        document.getElementById('target-icao').textContent = aircraft.icao24.toUpperCase();
        document.getElementById('target-altitude').textContent = aircraft.altitudeFormatted;
        document.getElementById('target-velocity').textContent = aircraft.velocityFormatted;
        document.getElementById('target-heading').textContent = aircraft.headingFormatted;
        document.getElementById('target-distance').textContent = `${aircraft.distance}km`;
        document.getElementById('alert-time').textContent = new Date().toLocaleTimeString();

        // Show modal
        modal.classList.remove('hidden');
    }

    // Hide alert modal
    hideAlertModal() {
        const modal = document.getElementById('alert-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Trigger generic alert (non-interception)
    triggerGenericAlert(title, message, type = 'info') {
        const frequencies = {
            info: 600,
            warning: 800,
            error: 400
        };

        this.generateAlertSound(frequencies[type] || 600, 150);

        const notification = this.createOSNotification(title, {
            body: message,
            tag: `vectoralert-${type}`
        });

        // Add to history
        const alertEntry = {
            id: `generic_${Date.now()}`,
            timestamp: Date.now(),
            title,
            message,
            type
        };
        this.alertHistory.unshift(alertEntry);

        if (this.alertHistory.length > this.maxHistoryItems) {
            this.alertHistory = this.alertHistory.slice(0, this.maxHistoryItems);
        }

        return notification;
    }

    // Clear active alert
    clearAlert(alertId) {
        this.activeAlerts.delete(alertId);
        this.lastAlertTimes.delete(alertId);
    }

    // Clear all active alerts
    clearAllAlerts() {
        this.activeAlerts.clear();
        this.lastAlertTimes.clear();
    }

    // Get alert history
    getAlertHistory(limit = 10) {
        return this.alertHistory.slice(0, limit);
    }

    // Get active alerts
    getActiveAlerts() {
        return Array.from(this.activeAlerts);
    }

    // Set sound enabled
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    // Set OS notifications enabled
    setOSNotificationsEnabled(enabled) {
        this.osNotificationsEnabled = enabled && this.notificationPermission === 'granted';
    }

    // Get alert system status
    getStatus() {
        return {
            soundEnabled: this.soundEnabled,
            osNotificationsEnabled: this.osNotificationsEnabled,
            notificationPermission: this.notificationPermission,
            activeAlertsCount: this.activeAlerts.size,
            totalAlerts: this.alertHistory.length,
            audioContextState: this.audioContext?.state || 'unavailable'
        };
    }

    // Test alert system
    async testAlertSystem() {
        const testAircraft = {
            icao24: 'TEST123',
            callsign: 'TEST123',
            distance: 2.5,
            altitudeFormatted: '35000ft',
            velocityFormatted: '450kt',
            headingFormatted: '090°'
        };

        // Test sound
        this.generateAlertSound(1000, 100);
        await new Promise(resolve => setTimeout(resolve, 200));

        // Test urgent alert
        this.playUrgentAlert();
        await new Promise(resolve => setTimeout(resolve, 800));

        // Test OS notification
        const notification = this.createOSNotification(
            'VectorAlert Test',
            {
                body: 'Alert system test successful',
                tag: 'vectoralert-test'
            }
        );

        return {
            sound: this.soundEnabled,
            notifications: !!notification,
            status: this.getStatus()
        };
    }

    // Export alert configuration
    exportConfig() {
        return {
            soundEnabled: this.soundEnabled,
            osNotificationsEnabled: this.osNotificationsEnabled,
            notificationPermission: this.notificationPermission,
            alertCooldown: this.alertCooldown,
            maxHistoryItems: this.maxHistoryItems
        };
    }
}

// Global instance
window.alertSystem = new AlertSystem();
