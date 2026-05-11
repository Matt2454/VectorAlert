// VectorAlert UI Module
// Handles all UI updates, animations, and user interactions

class UIManager {
    constructor() {
        this.scanInterval = null;
        this.radarAnimation = null;
        this.nextScanTime = null;
        this.aircraftData = [];
        this.targetAircraft = null;
        this.isScanning = false;
        
        this.initializeElements();
        this.bindEvents();
        this.startClock();
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            // Status indicators
            locationStatus: document.getElementById('location-status'),
            apiStatus: document.getElementById('api-status'),
            scanStatus: document.getElementById('scan-status'),
            
            // Controls
            startScanBtn: document.getElementById('start-scan'),
            settingsBtn: document.getElementById('settings-btn'),
            
            // Radar
            radarDisplay: document.getElementById('radar-display'),
            radarSweep: document.getElementById('radar-sweep'),
            aircraftMarkers: document.getElementById('aircraft-markers'),
            radarRange: document.getElementById('radar-range'),
            aircraftCount: document.getElementById('aircraft-count'),
            
            // Data table
            aircraftTable: document.getElementById('aircraft-table'),
            aircraftTbody: document.getElementById('aircraft-tbody'),
            
            // Modal
            alertModal: document.getElementById('alert-modal'),
            closeAlertBtn: document.getElementById('close-alert'),
            
            // Settings
            settingsPanel: document.getElementById('settings-panel'),
            saveSettingsBtn: document.getElementById('save-settings'),
            cancelSettingsBtn: document.getElementById('cancel-settings'),
            
            // Form inputs
            watchRadius: document.getElementById('watch-radius'),
            targetAircraft: document.getElementById('target-aircraft'),
            scanInterval: document.getElementById('scan-interval'),
            soundEnabled: document.getElementById('sound-enabled'),
            
            // Status bar
            nextScan: document.getElementById('next-scan'),
            apiCalls: document.getElementById('api-calls'),
            systemTime: document.getElementById('system-time'),
            coordinates: document.getElementById('coordinates')
        };
    }

    // Bind event listeners
    bindEvents() {
        // Scan control
        this.elements.startScanBtn?.addEventListener('click', () => this.toggleScan());
        
        // Settings
        this.elements.settingsBtn?.addEventListener('click', () => this.showSettings());
        this.elements.saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
        this.elements.cancelSettingsBtn?.addEventListener('click', () => this.hideSettings());
        
        // Modal
        this.elements.closeAlertBtn?.addEventListener('click', () => {
            window.alertSystem.hideAlertModal();
        });
        
        // Custom events
        window.addEventListener('interceptionAlert', (event) => {
            this.handleInterceptionAlert(event.detail.aircraft);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideSettings();
                window.alertSystem.hideAlertModal();
            }
            if (event.key === ' ' && event.target.tagName !== 'INPUT') {
                event.preventDefault();
                this.toggleScan();
            }
        });
    }

    // Update location status
    updateLocationStatus(status, coordinates = null) {
        if (this.elements.locationStatus) {
            const statusMap = {
                'ACTIVE': 'LOC: ONLINE',
                'STALE': 'LOC: STALE',
                'NO_POSITION': 'LOC: OFFLINE'
            };
            
            this.elements.locationStatus.textContent = statusMap[status] || 'LOC: UNKNOWN';
            this.elements.locationStatus.className = 'status-indicator';
            
            if (status === 'ACTIVE') {
                this.elements.locationStatus.classList.add('status-online');
            } else if (status === 'STALE') {
                this.elements.locationStatus.classList.add('status-warning');
            } else {
                this.elements.locationStatus.classList.add('status-offline');
            }
        }
        
        if (coordinates && this.elements.coordinates) {
            const formatted = window.geoService.formatCoordinates(coordinates.lat, coordinates.lon);
            this.elements.coordinates.textContent = 
                `LAT: ${formatted.lat}${formatted.latDir} LON: ${formatted.lon}${formatted.lonDir}`;
        }
    }

    // Update API status
    updateAPIStatus(status, details = null) {
        if (this.elements.apiStatus) {
            const statusMap = {
                'ONLINE': 'API: ONLINE',
                'OFFLINE': 'API: OFFLINE',
                'RATE_LIMITED': 'API: LIMITED',
                'ERROR': 'API: ERROR'
            };
            
            this.elements.apiStatus.textContent = statusMap[status] || 'API: UNKNOWN';
            this.elements.apiStatus.className = 'status-indicator';
            
            if (status === 'ONLINE') {
                this.elements.apiStatus.classList.add('status-online');
            } else if (status === 'RATE_LIMITED') {
                this.elements.apiStatus.classList.add('status-warning');
            } else {
                this.elements.apiStatus.classList.add('status-offline');
            }
        }
        
        if (this.elements.apiCalls) {
            const apiStatus = window.openSkyAPI.getAPIStatus();
            this.elements.apiCalls.textContent = `API CALLS: ${apiStatus.apiCallCount}`;
        }
    }

    // Update scan status
    updateScanStatus(status) {
        if (this.elements.scanStatus) {
            const statusMap = {
                'SCANNING': 'SCAN: ACTIVE',
                'IDLE': 'SCAN: IDLE',
                'PAUSED': 'SCAN: PAUSED',
                'ERROR': 'SCAN: ERROR'
            };
            
            this.elements.scanStatus.textContent = statusMap[status] || 'SCAN: UNKNOWN';
            this.elements.scanStatus.className = 'status-indicator';
            
            if (status === 'SCANNING') {
                this.elements.scanStatus.classList.add('status-online');
            } else if (status === 'ERROR') {
                this.elements.scanStatus.classList.add('status-offline');
            } else {
                this.elements.scanStatus.classList.remove('status-online', 'status-offline');
            }
        }
        
        if (this.elements.startScanBtn) {
            if (status === 'SCANNING') {
                this.elements.startScanBtn.textContent = 'STOP SCAN';
                this.elements.startScanBtn.classList.add('btn-scanning');
            } else {
                this.elements.startScanBtn.textContent = 'START SCAN';
                this.elements.startScanBtn.classList.remove('btn-scanning');
            }
        }
    }

    // Toggle scanning
    async toggleScan() {
        if (this.isScanning) {
            this.stopScanning();
        } else {
            await this.startScanning();
        }
    }

    // Start scanning
    async startScanning() {
        try {
            // Get user position
            const position = await window.geoService.getCurrentPosition();
            this.updateLocationStatus('ACTIVE', position);
            
            this.isScanning = true;
            this.updateScanStatus('SCANNING');
            
            // Start radar animation
            this.startRadarAnimation();
            
            // Start data polling
            const interval = parseInt(this.elements.scanInterval?.value || '20') * 1000;
            this.scanInterval = setInterval(() => this.performScan(), interval);
            
            // Perform initial scan
            await this.performScan();
            
        } catch (error) {
            console.error('Failed to start scanning:', error);
            this.updateScanStatus('ERROR');
            this.isScanning = false;
        }
    }

    // Stop scanning
    stopScanning() {
        this.isScanning = false;
        this.updateScanStatus('IDLE');
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        this.stopRadarAnimation();
        this.updateNextScanTime(null);
    }

    // Start radar animation
    startRadarAnimation() {
        if (this.elements.radarSweep) {
            this.elements.radarSweep.classList.add('radar-sweep-active');
        }
    }

    // Stop radar animation
    stopRadarAnimation() {
        if (this.elements.radarSweep) {
            this.elements.radarSweep.classList.remove('radar-sweep-active');
        }
    }

    // Perform scan
    async performScan() {
        try {
            const position = window.geoService.currentPosition;
            if (!position) {
                throw new Error('No position available');
            }
            
            // Get bounding box
            const boundingBox = window.geoService.getBoundingBox(
                position.lat, 
                position.lon, 
                window.geoService.watchRadius
            );
            
            // Fetch aircraft data
            const apiResponse = await window.openSkyAPI.getStatesAll(boundingBox);
            const aircraft = window.openSkyAPI.processAircraftData(apiResponse);
            
            // Enrich with distance and bearing
            const enrichedAircraft = window.openSkyAPI.enrichAircraftData(aircraft, position);
            
            // Sort by distance
            enrichedAircraft.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
            
            // Update UI
            this.aircraftData = enrichedAircraft;
            this.updateAircraftTable(enrichedAircraft);
            this.updateRadarDisplay(enrichedAircraft, position);
            this.updateAPIStatus('ONLINE');
            
            // Check for target aircraft
            this.checkForTargetAircraft(enrichedAircraft);
            
            // Update next scan time
            this.updateNextScanTime();
            
        } catch (error) {
            console.error('Scan failed:', error);
            this.updateAPIStatus('ERROR');
            
            if (error.message.includes('Rate limited')) {
                this.updateAPIStatus('RATE_LIMITED');
            }
        }
    }

    // Update aircraft table
    updateAircraftTable(aircraft) {
        if (!this.elements.aircraftTbody) return;
        
        // Clear existing rows
        this.elements.aircraftTbody.innerHTML = '';
        
        if (aircraft.length === 0) {
            const row = document.createElement('tr');
            row.className = 'no-data';
            row.innerHTML = '<td colspan="7">NO AIRCRAFT DETECTED</td>';
            this.elements.aircraftTbody.appendChild(row);
        } else {
            aircraft.forEach((ac, index) => {
                const row = document.createElement('tr');
                row.className = 'aircraft-row';
                
                if (ac.withinRadius) {
                    row.classList.add('target-aircraft');
                }
                
                if (index === 0) {
                    row.classList.add('new');
                }
                
                row.innerHTML = `
                    <td>${ac.callsign}</td>
                    <td>${ac.icao24.toUpperCase()}</td>
                    <td>${ac.altitudeFormatted}</td>
                    <td>${ac.velocityFormatted}</td>
                    <td>${ac.headingFormatted}</td>
                    <td>${ac.distance}km</td>
                    <td>${this.getAircraftType(ac.icao24)}</td>
                `;
                
                this.elements.aircraftTbody.appendChild(row);
            });
        }
        
        // Update aircraft count
        if (this.elements.aircraftCount) {
            this.elements.aircraftCount.textContent = `AIRCRAFT: ${aircraft.length}`;
        }
    }

    // Update radar display
    updateRadarDisplay(aircraft, userPosition) {
        if (!this.elements.aircraftMarkers || !userPosition) return;
        
        // Clear existing markers
        this.elements.aircraftMarkers.innerHTML = '';
        
        const radarSize = 400;
        const center = radarSize / 2;
        const maxRange = window.geoService.watchRadius;
        
        aircraft.forEach(ac => {
            if (ac.distance > maxRange) return;
            
            // Calculate position on radar
            const scale = (center - 20) / maxRange; // Leave margin
            const x = center + (ac.distance * scale) * Math.sin(ac.bearing * Math.PI / 180);
            const y = center - (ac.distance * scale) * Math.cos(ac.bearing * Math.PI / 180);
            
            // Create marker
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            marker.setAttribute('cx', x);
            marker.setAttribute('cy', y);
            marker.setAttribute('r', ac.withinRadius ? '4' : '2');
            marker.classList.add('aircraft-marker');
            
            if (ac.withinRadius) {
                marker.classList.add('target');
            }
            
            // Add tooltip
            marker.setAttribute('data-tooltip', `${ac.callsign} - ${ac.distance}km`);
            
            this.elements.aircraftMarkers.appendChild(marker);
        });
        
        // Update radar range display
        if (this.elements.radarRange) {
            this.elements.radarRange.textContent = `RANGE: ${maxRange}km`;
        }
    }

    // Check for target aircraft
    checkForTargetAircraft(aircraft) {
        const targetType = this.elements.targetAircraft?.value?.toUpperCase();
        if (!targetType) return;
        
        const targetAircraft = aircraft.filter(ac => {
            const aircraftType = this.getAircraftType(ac.icao24).toUpperCase();
            return aircraftType.includes(targetType) && ac.withinRadius;
        });
        
        targetAircraft.forEach(ac => {
            window.alertSystem.triggerInterceptionAlert(ac);
        });
    }

    // Get aircraft type from ICAO24
    getAircraftType(icao24) {
        // This would normally use a database or API
        // For now, return a simplified mapping
        const typeMap = {
            'a1e83b': 'B777',
            'a80897': 'B737',
            'a4d0b4': 'A320',
            'ab6e36': 'B787',
            'abc041': 'A350'
        };
        
        return typeMap[icao24.toLowerCase()] || 'UNKNOWN';
    }

    // Handle interception alert
    handleInterceptionAlert(aircraft) {
        window.alertSystem.showAlertModal(aircraft);
    }

    // Update next scan time
    updateNextScanTime(scanTime = null) {
        if (!this.elements.nextScan) return;
        
        if (scanTime) {
            this.nextScanTime = scanTime;
        } else if (this.isScanning) {
            const interval = parseInt(this.elements.scanInterval?.value || '20');
            this.nextScanTime = Date.now() + (interval * 1000);
        } else {
            this.nextScanTime = null;
        }
        
        if (this.nextScanTime) {
            const updateCountdown = () => {
                const now = Date.now();
                const remaining = Math.max(0, this.nextScanTime - now);
                const seconds = Math.ceil(remaining / 1000);
                
                if (this.elements.nextScan) {
                    this.elements.nextScan.textContent = `NEXT SCAN: ${seconds}s`;
                    this.elements.nextScan.className = seconds <= 5 ? 'countdown urgent' : 'countdown';
                }
                
                if (remaining > 0) {
                    requestAnimationFrame(updateCountdown);
                }
            };
            
            updateCountdown();
        } else {
            this.elements.nextScan.textContent = 'NEXT SCAN: --';
        }
    }

    // Start system clock
    startClock() {
        const updateClock = () => {
            if (this.elements.systemTime) {
                this.elements.systemTime.textContent = new Date().toLocaleTimeString();
            }
            requestAnimationFrame(updateClock);
        };
        updateClock();
    }

    // Show settings panel
    showSettings() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.remove('hidden');
            
            // Load current settings
            this.elements.watchRadius.value = window.geoService.watchRadius;
            this.elements.scanInterval.value = (this.elements.scanInterval?.value || '20');
            this.elements.soundEnabled.checked = window.alertSystem.soundEnabled;
        }
    }

    // Hide settings panel
    hideSettings() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.add('hidden');
        }
    }

    // Save settings
    saveSettings() {
        // Update watch radius
        const radius = parseInt(this.elements.watchRadius?.value) || 5;
        window.geoService.setWatchRadius(radius);
        
        // Update scan interval
        if (this.scanInterval) {
            const interval = parseInt(this.elements.scanInterval?.value) || 20;
            clearInterval(this.scanInterval);
            this.scanInterval = setInterval(() => this.performScan(), interval * 1000);
        }
        
        // Update sound settings
        window.alertSystem.setSoundEnabled(this.elements.soundEnabled?.checked);
        
        this.hideSettings();
    }

    // Get UI status
    getStatus() {
        return {
            isScanning: this.isScanning,
            aircraftCount: this.aircraftData.length,
            nextScanTime: this.nextScanTime,
            targetAircraft: this.elements.targetAircraft?.value
        };
    }
}

// Global instance
window.uiManager = new UIManager();
