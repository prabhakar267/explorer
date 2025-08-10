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
        this.map = L.map('map').setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
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
        try {
            // Try to fetch from UNESCO's official API first
            console.log('Attempting to load data from UNESCO API...');
            const response = await fetch('https://ihp-wins.unesco.org/dataset/88c8eff6-b94d-4826-bb13-7107ac4c02a9/resource/2f46f6b2-45f9-402b-ace9-1e02c9c97a3d/download/whc-sites-2025.csv');
            const csvText = await response.text();
            console.log('Successfully loaded data from UNESCO API');
            
            return this.parseCSV(csvText);
        } catch (error) {
            console.warn('Failed to load from UNESCO API, trying local CSV file...', error);
            
            try {
                // Fallback to local CSV file
                const response = await fetch('assets/whc-sites-2025.csv');
                const csvText = await response.text();
                console.log('Successfully loaded data from local CSV file');
                
                return this.parseCSV(csvText);
            } catch (localError) {
                console.error('Failed to load local CSV file, using fallback data...', localError);
                
                // Final fallback to hardcoded data
                return this.getFallbackData();
            }
        }
    }

    getFallbackData() {
        // Fallback dataset with major UNESCO sites if both remote and local CSV loading fails
        console.log('Using fallback hardcoded data');
        return [
            // Africa
            { name: "Pyramids of Giza", country: "Egypt", lat: 29.9792, lng: 31.1342, year: 1979, criteria: "Cultural" },
            { name: "Abu Mena", country: "Egypt", lat: 30.8419, lng: 29.6581, year: 1979, criteria: "Cultural" },
            { name: "Historic Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, year: 1979, criteria: "Cultural" },
            { name: "Robben Island", country: "South Africa", lat: -33.8067, lng: 18.3669, year: 1999, criteria: "Cultural" },
            { name: "Cradle of Humankind", country: "South Africa", lat: -25.9317, lng: 27.7167, year: 1999, criteria: "Cultural" },
            
            // Asia
            { name: "Great Wall of China", country: "China", lat: 40.4319, lng: 116.5704, year: 1987, criteria: "Cultural" },
            { name: "Forbidden City", country: "China", lat: 39.9163, lng: 116.3972, year: 1987, criteria: "Cultural" },
            { name: "Terracotta Army", country: "China", lat: 34.3848, lng: 109.2734, year: 1987, criteria: "Cultural" },
            { name: "Taj Mahal", country: "India", lat: 27.1751, lng: 78.0421, year: 1983, criteria: "Cultural" },
            { name: "Agra Fort", country: "India", lat: 27.1795, lng: 78.0211, year: 1983, criteria: "Cultural" },
            { name: "Ajanta Caves", country: "India", lat: 20.5519, lng: 75.7033, year: 1983, criteria: "Cultural" },
            { name: "Ellora Caves", country: "India", lat: 20.0269, lng: 75.1791, year: 1983, criteria: "Cultural" },
            { name: "Angkor", country: "Cambodia", lat: 13.4125, lng: 103.8670, year: 1992, criteria: "Cultural" },
            { name: "Borobudur", country: "Indonesia", lat: -7.6079, lng: 110.2038, year: 1991, criteria: "Cultural" },
            { name: "Mount Fuji", country: "Japan", lat: 35.3606, lng: 138.7274, year: 2013, criteria: "Cultural" },
            
            // Europe
            { name: "Acropolis of Athens", country: "Greece", lat: 37.9715, lng: 23.7267, year: 1987, criteria: "Cultural" },
            { name: "Colosseum", country: "Italy", lat: 41.8902, lng: 12.4922, year: 1980, criteria: "Cultural" },
            { name: "Venice", country: "Italy", lat: 45.4408, lng: 12.3155, year: 1987, criteria: "Cultural" },
            { name: "Florence Historic Centre", country: "Italy", lat: 43.7696, lng: 11.2558, year: 1982, criteria: "Cultural" },
            { name: "Vatican City", country: "Vatican", lat: 41.9029, lng: 12.4534, year: 1984, criteria: "Cultural" },
            { name: "Sagrada Familia", country: "Spain", lat: 41.4036, lng: 2.1744, year: 1984, criteria: "Cultural" },
            { name: "Alhambra", country: "Spain", lat: 37.1773, lng: -3.5986, year: 1984, criteria: "Cultural" },
            { name: "Stonehenge", country: "United Kingdom", lat: 51.1789, lng: -1.8262, year: 1986, criteria: "Cultural" },
            { name: "Tower of London", country: "United Kingdom", lat: 51.5081, lng: -0.0759, year: 1988, criteria: "Cultural" },
            { name: "Palace of Versailles", country: "France", lat: 48.8049, lng: 2.1204, year: 1979, criteria: "Cultural" },
            { name: "Mont-Saint-Michel", country: "France", lat: 48.6361, lng: -1.5115, year: 1979, criteria: "Cultural" },
            
            // Americas
            { name: "Machu Picchu", country: "Peru", lat: -13.1631, lng: -72.5450, year: 1983, criteria: "Mixed" },
            { name: "Chichen Itza", country: "Mexico", lat: 20.6843, lng: -88.5678, year: 1988, criteria: "Cultural" },
            { name: "Teotihuacan", country: "Mexico", lat: 19.6925, lng: -98.8438, year: 1987, criteria: "Cultural" },
            { name: "Statue of Liberty", country: "USA", lat: 40.6892, lng: -74.0445, year: 1984, criteria: "Cultural" },
            { name: "Yellowstone", country: "USA", lat: 44.4280, lng: -110.5885, year: 1978, criteria: "Natural" },
            { name: "Grand Canyon", country: "USA", lat: 36.1069, lng: -112.1129, year: 1979, criteria: "Natural" },
            { name: "Yosemite", country: "USA", lat: 37.8651, lng: -119.5383, year: 1984, criteria: "Natural" },
            
            // Oceania
            { name: "Great Barrier Reef", country: "Australia", lat: -18.2871, lng: 147.6992, year: 1981, criteria: "Natural" },
            { name: "Uluru", country: "Australia", lat: -25.3444, lng: 131.0369, year: 1987, criteria: "Mixed" },
            { name: "Sydney Opera House", country: "Australia", lat: -33.8568, lng: 151.2153, year: 2007, criteria: "Cultural" },
            
            // Additional notable sites
            { name: "Petra", country: "Jordan", lat: 30.3285, lng: 35.4444, year: 1985, criteria: "Cultural" },
            { name: "Persepolis", country: "Iran", lat: 29.9356, lng: 52.8916, year: 1979, criteria: "Cultural" },
            { name: "Ha Long Bay", country: "Vietnam", lat: 20.9101, lng: 107.1839, year: 1994, criteria: "Natural" },
            { name: "Sigiriya", country: "Sri Lanka", lat: 7.9569, lng: 80.7597, year: 1982, criteria: "Cultural" }
        ];
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
            
            const marker = L.circleMarker([site.lat, site.lng], {
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
