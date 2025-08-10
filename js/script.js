class UNESCOExplorer {
    constructor() {
        this.map = null;
        this.sites = [];
        this.visitedSites = new Set(JSON.parse(localStorage.getItem('visitedUNESCOSites') || '[]'));
        this.markers = new L.MarkerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        
        this.initMap();
        this.loadUNESCOSites();
    }

    initMap() {
        this.map = L.map('map', {
            worldCopyJump: true,
            maxBounds: [[-90, -Infinity], [90, Infinity]]
        }).setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            noWrap: false
        }).addTo(this.map);

        this.map.addLayer(this.markers);
    }

    async loadUNESCOSites() {
        try {
            // Using a comprehensive list of UNESCO World Heritage Sites
            const sites = await this.getUNESCOSitesData();
            this.sites = sites;
            this.createMarkers();
            this.updateStats();
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('Error loading UNESCO sites:', error);
            document.getElementById('loading').innerHTML = '<div>Error loading sites. Please refresh the page.</div>';
        }
    }

    async getUNESCOSitesData() {
        const response = await fetch('https://ihp-wins.unesco.org/dataset/88c8eff6-b94d-4826-bb13-7107ac4c02a9/resource/2f46f6b2-45f9-402b-ace9-1e02c9c97a3d/download/whc-sites-2025.csv');
        const csvText = await response.text();
        
        return this.parseCSV(csvText);
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const sites = [];

        // Find the indices of the columns we need
        const nameIndex = headers.indexOf('name_en');
        const countryIndex = headers.indexOf('states_name_en');
        const latIndex = headers.indexOf('latitude');
        const lngIndex = headers.indexOf('longitude');
        const yearIndex = headers.indexOf('date_inscribed');
        const categoryIndex = headers.indexOf('category_short');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Parse CSV line handling quoted fields
            const fields = this.parseCSVLine(line);
            
            if (fields.length > Math.max(nameIndex, countryIndex, latIndex, lngIndex, yearIndex, categoryIndex)) {
                const lat = parseFloat(fields[latIndex]);
                const lng = parseFloat(fields[lngIndex]);
                
                // Skip entries with invalid coordinates
                if (isNaN(lat) || isNaN(lng)) continue;

                sites.push({
                    name: fields[nameIndex] || 'Unknown Site',
                    country: fields[countryIndex] || 'Unknown Country',
                    lat: lat,
                    lng: lng,
                    year: parseInt(fields[yearIndex]) || 'Unknown',
                    criteria: fields[categoryIndex] || 'Unknown'
                });
            }
        }

        return sites;
    }

    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        fields.push(current.trim());
        return fields;
    }

    createMarkers() {
        this.sites.forEach(site => {
            const isVisited = this.visitedSites.has(site.name);
            
            // Create markers at original position and duplicates at ±360° longitude
            // This creates the illusion of world wrapping without new API calls
            [-360, 0, 360].forEach(lngOffset => {
                const marker = L.circleMarker([site.lat, site.lng + lngOffset], {
                    radius: 8,
                    fillColor: isVisited ? '#27ae60' : '#e74c3c',
                    color: isVisited ? '#2ecc71' : '#c0392b',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                const popupContent = this.createPopupContent(site, isVisited);
                marker.bindPopup(popupContent);
                
                this.markers.addLayer(marker);
            });
        });
    }

    createPopupContent(site, isVisited) {
        return `
            <div class="custom-popup">
                <div class="popup-title">${site.name}</div>
                <div class="popup-info">
                    <strong>Country:</strong> ${site.country}<br>
                    <strong>Year Inscribed:</strong> ${site.year}<br>
                    <strong>Criteria:</strong> ${site.criteria}
                </div>
                <button class="popup-button ${isVisited ? 'visited' : ''}" 
                        onclick="unescoExplorer.toggleVisited('${site.name}')">
                    ${isVisited ? '✓ Visited' : 'Mark as Visited'}
                </button>
            </div>
        `;
    }

    toggleVisited(siteName) {
        if (this.visitedSites.has(siteName)) {
            this.visitedSites.delete(siteName);
        } else {
            this.visitedSites.add(siteName);
        }
        
        localStorage.setItem('visitedUNESCOSites', JSON.stringify([...this.visitedSites]));
        this.updateMarkers();
        this.updateStats();
    }

    updateMarkers() {
        this.markers.clearLayers();
        this.createMarkers();
    }

    updateStats() {
        const totalSites = this.sites.length;
        const visitedCount = this.visitedSites.size;
        const remainingCount = totalSites - visitedCount;

        document.getElementById('total-sites').textContent = totalSites;
        document.getElementById('visited-count').textContent = visitedCount;
        document.getElementById('remaining-count').textContent = remainingCount;
    }
}

// Initialize the app when the page loads
let unescoExplorer;
document.addEventListener('DOMContentLoaded', function() {
    unescoExplorer = new UNESCOExplorer();
});
