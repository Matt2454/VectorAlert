// VectorAlert Geolocation Module
// Handles user location, bounding box calculation, and Haversine distance

class GeoService {
    constructor() {
        this.currentPosition = null;
        this.watchRadius = 5; // Default 5km radius
        this.accuracy = null;
        this.timestamp = null;
    }

    // Get user's current position
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    this.accuracy = position.coords.accuracy;
                    this.timestamp = position.timestamp;
                    resolve(this.currentPosition);
                },
                (error) => {
                    let errorMessage = 'Unknown geolocation error';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000 // Accept cached position up to 1 minute old
                }
            );
        });
    }

    // Watch position continuously
    watchPosition(callback) {
        if (!navigator.geolocation) {
            throw new Error('Geolocation not supported by this browser');
        }

        return navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                this.accuracy = position.coords.accuracy;
                this.timestamp = position.timestamp;
                callback(this.currentPosition);
            },
            (error) => {
                console.error('Position watch error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }

    // Calculate bounding box for API filtering
    getBoundingBox(lat, lon, radiusKm = this.watchRadius) {
        // Approximate conversion: 1 degree latitude ≈ 111 km
        // 1 degree longitude ≈ 111 km * cos(latitude)
        const latDelta = radiusKm / 111.0;
        const lonDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));

        return {
            lamin: (lat - latDelta).toFixed(4),
            lamax: (lat + latDelta).toFixed(4),
            lomin: (lon - lonDelta).toFixed(4),
            lomax: (lon + lonDelta).toFixed(4)
        };
    }

    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return Math.round(distance * 100) / 100; // Round to 2 decimal places
    }

    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Convert radians to degrees
    toDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    // Calculate bearing from point 1 to point 2
    calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = this.toRadians(lon2 - lon1);
        const lat1Rad = this.toRadians(lat1);
        const lat2Rad = this.toRadians(lat2);

        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

        const bearing = this.toDegrees(Math.atan2(y, x));
        return (bearing + 360) % 360; // Normalize to 0-360
    }

    // Format coordinates for display
    formatCoordinates(lat, lon) {
        return {
            lat: lat.toFixed(6),
            lon: lon.toFixed(6),
            latDir: lat >= 0 ? 'N' : 'S',
            lonDir: lon >= 0 ? 'E' : 'W'
        };
    }

    // Check if a point is within the watch radius
    isWithinRadius(lat, lon, centerLat = this.currentPosition?.lat, centerLon = this.currentPosition?.lon) {
        if (!centerLat || !centerLon) {
            return false;
        }
        
        const distance = this.calculateDistance(centerLat, centerLon, lat, lon);
        return distance <= this.watchRadius;
    }

    // Set watch radius
    setWatchRadius(radiusKm) {
        this.watchRadius = Math.max(1, Math.min(50, radiusKm)); // Clamp between 1-50km
    }

    // Get current position status
    getPositionStatus() {
        if (!this.currentPosition) {
            return 'NO_POSITION';
        }
        
        const age = Date.now() - this.timestamp;
        if (age > 300000) { // 5 minutes
            return 'STALE';
        }
        
        return 'ACTIVE';
    }

    // Export position data
    exportPositionData() {
        if (!this.currentPosition) {
            return null;
        }

        return {
            position: this.currentPosition,
            accuracy: this.accuracy,
            timestamp: this.timestamp,
            watchRadius: this.watchRadius,
            boundingBox: this.getBoundingBox(this.currentPosition.lat, this.currentPosition.lon),
            status: this.getPositionStatus()
        };
    }
}

// Global instance
window.geoService = new GeoService();
