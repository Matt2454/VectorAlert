// VectorAlert OpenSky API Module
// Handles API communication, authentication, and data processing

class OpenSkyAPI {
    constructor() {
        this.baseURL = 'https://opensky-network.org/api';
        this.authToken = null;
        this.username = 'matt_11-api-client';
        this.password = 'AzyPub0ak4QdbK16bSbi9fGwwXC1w1wa';
        this.rateLimitRemaining = 0;
        this.lastCallTime = 0;
        this.apiCallCount = 0;
        this.minCallInterval = 10000; // Minimum 10 seconds between calls
    }

    // Set authentication credentials
    setCredentials(username, password) {
        this.username = username;
        this.password = password;
    }

    // Make authenticated API request
    async makeRequest(endpoint, params = {}) {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        
        // Rate limiting protection
        if (timeSinceLastCall < this.minCallInterval) {
            const waitTime = this.minCallInterval - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const url = new URL(`${this.baseURL}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'VectorAlert/1.0'
        };

        // Add authentication if credentials are available
        if (this.username && this.password) {
            const credentials = btoa(`${this.username}:${this.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
        }

        try {
            this.lastCallTime = Date.now();
            this.apiCallCount++;

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: headers
            });

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 60;
                throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Update rate limit info if available
            const remaining = response.headers.get('X-Rate-Limit-Remaining');
            if (remaining) {
                this.rateLimitRemaining = parseInt(remaining);
            }

            return data;

        } catch (error) {
            console.error('OpenSky API request failed:', error);
            throw error;
        }
    }

    // Get all aircraft states within bounding box
    async getStatesAll(boundingBox = null) {
        const params = {};
        
        if (boundingBox) {
            params.lamin = boundingBox.lamin;
            params.lamax = boundingBox.lamax;
            params.lomin = boundingBox.lomin;
            params.lomax = boundingBox.lomax;
        }

        return this.makeRequest('/states/all', params);
    }

    // Get aircraft states for specific time
    async getStates(time = 0, icao24 = null) {
        const params = { time };
        
        if (icao24) {
            params.icao24 = icao24;
        }

        return this.makeRequest('/states/all', params);
    }

    // Get own aircraft states (requires authentication)
    async getOwnStates() {
        if (!this.username || !this.password) {
            throw new Error('Authentication required for own states');
        }
        
        return this.makeRequest('/states/own');
    }

    // Get aircraft metadata
    async getAircraftMetadata(icao24) {
        return this.makeRequest(`/aircraft/${icao24}`);
    }

    // Process aircraft data from API response
    processAircraftData(apiResponse) {
        if (!apiResponse.states || !Array.isArray(apiResponse.states)) {
            return [];
        }

        const aircraft = apiResponse.states.map(state => {
            return {
                icao24: state[0],
                callsign: state[1]?.trim() || 'UNKNOWN',
                originCountry: state[2],
                timePosition: state[3],
                lastContact: state[4],
                longitude: state[5],
                latitude: state[6],
                baroAltitude: state[7],
                onGround: state[8],
                velocity: state[9],
                trueTrack: state[10],
                verticalRate: state[11],
                sensors: state[12],
                geoAltitude: state[13],
                squawk: state[14],
                spi: state[15],
                positionSource: state[16]
            };
        });

        // Filter out aircraft without valid positions
        return aircraft.filter(ac => 
            ac.latitude !== null && 
            ac.longitude !== null && 
            ac.latitude !== undefined && 
            ac.longitude !== undefined
        );
    }

    // Calculate additional data for aircraft
    enrichAircraftData(aircraft, userPosition) {
        if (!userPosition) {
            return aircraft;
        }

        return aircraft.map(ac => {
            const enriched = { ...ac };
            
            // Calculate distance from user
            enriched.distance = window.geoService.calculateDistance(
                userPosition.lat,
                userPosition.lon,
                ac.latitude,
                ac.longitude
            );

            // Calculate bearing
            enriched.bearing = window.geoService.calculateBearing(
                userPosition.lat,
                userPosition.lon,
                ac.latitude,
                ac.longitude
            );

            // Format altitude
            enriched.altitudeFormatted = this.formatAltitude(ac.baroAltitude);
            
            // Format velocity
            enriched.velocityFormatted = this.formatVelocity(ac.velocity);
            
            // Format heading
            enriched.headingFormatted = this.formatHeading(ac.trueTrack);

            // Determine if within watch radius
            enriched.withinRadius = enriched.distance <= window.geoService.watchRadius;

            return enriched;
        });
    }

    // Format altitude for display
    formatAltitude(altitude) {
        if (altitude === null || altitude === undefined) {
            return '--';
        }
        return `${Math.round(altitude / 0.3048)}ft`; // Convert meters to feet
    }

    // Format velocity for display
    formatVelocity(velocity) {
        if (velocity === null || velocity === undefined) {
            return '--';
        }
        return `${Math.round(velocity * 1.94384)}kt`; // Convert m/s to knots
    }

    // Format heading for display
    formatHeading(heading) {
        if (heading === null || heading === undefined) {
            return '--';
        }
        return `${Math.round(heading)}°`;
    }

    // Get API status
    getAPIStatus() {
        const timeSinceLastCall = Date.now() - this.lastCallTime;
        
        return {
            isAuthenticated: !!(this.username && this.password),
            rateLimitRemaining: this.rateLimitRemaining,
            apiCallCount: this.apiCallCount,
            lastCallTime: this.lastCallTime,
            timeSinceLastCall: timeSinceLastCall,
            canMakeCall: timeSinceLastCall >= this.minCallInterval
        };
    }

    // Test API connection
    async testConnection() {
        try {
            const response = await this.makeRequest('/states/all');
            return {
                success: true,
                message: 'API connection successful',
                aircraftCount: response.states?.length || 0
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Reset API call counter
    resetCallCounter() {
        this.apiCallCount = 0;
    }

    // Export API configuration
    exportConfig() {
        return {
            baseURL: this.baseURL,
            isAuthenticated: !!(this.username && this.password),
            rateLimitRemaining: this.rateLimitRemaining,
            apiCallCount: this.apiCallCount,
            minCallInterval: this.minCallInterval
        };
    }
}

// Global instance
window.openSkyAPI = new OpenSkyAPI();
