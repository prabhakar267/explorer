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
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster) => {
                return this.createClusterIcon(cluster);
            }
        });
        
        this.initMap();
        this.loadUNESCOSites();
    }

    initMap() {
        this.map = L.map('map', {
            worldCopyJump: true,
            maxBounds: [[-90, -Infinity], [90, Infinity]],
            zoomControl: false
        }).setView([20, 0], 3);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            noWrap: false
        }).addTo(this.map);

        this.map.addLayer(this.markers);
        
        // Close overlay when clicking on map
        this.map.on('click', () => {
            this.closePreview();
        });
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
                
                // Add click event to open preview directly
                marker.on('click', (e) => {
                    e.originalEvent.stopPropagation(); // Prevent map click from closing overlay
                    this.showPreview(site.name);
                });
                
                // Add hover events to show/hide popup with delay
                let popupTimeout;
                
                marker.on('mouseover', function(e) {
                    clearTimeout(popupTimeout);
                    this.openPopup();
                });
                
                marker.on('mouseout', function(e) {
                    const popup = this.getPopup();
                    popupTimeout = setTimeout(() => {
                        this.closePopup();
                    }, 300); // 300ms delay before closing
                });
                
                // Keep popup open when hovering over it
                marker.on('popupopen', function(e) {
                    const popupElement = e.popup.getElement();
                    if (popupElement) {
                        popupElement.addEventListener('mouseenter', function() {
                            clearTimeout(popupTimeout);
                        });
                        
                        popupElement.addEventListener('mouseleave', function() {
                            popupTimeout = setTimeout(() => {
                                e.target.closePopup();
                            }, 100);
                        });
                    }
                });
                
                this.markers.addLayer(marker);
            });
        });
    }

    createClusterIcon(cluster) {
        const markers = cluster.getAllChildMarkers();
        const childCount = cluster.getChildCount();
        
        // Check if all markers in this cluster represent visited sites
        let allVisited = true;
        for (let marker of markers) {
            // Get the site name from the marker's popup content
            const popupContent = marker.getPopup().getContent();
            const titleMatch = popupContent.match(/<div class="popup-title">(.*?)<\/div>/);
            if (titleMatch) {
                const siteName = titleMatch[1];
                if (!this.visitedSites.has(siteName)) {
                    allVisited = false;
                    break;
                }
            }
        }
        
        // Determine cluster size class
        let sizeClass = 'marker-cluster-small';
        if (childCount < 10) {
            sizeClass = 'marker-cluster-small';
        } else if (childCount < 100) {
            sizeClass = 'marker-cluster-medium';
        } else {
            sizeClass = 'marker-cluster-large';
        }
        
        // Choose colors based on visited status
        const colors = allVisited ? {
            background: 'rgba(39, 174, 96, 0.6)',
            inner: 'rgba(46, 204, 113, 0.6)'
        } : {
            background: 'rgba(231, 76, 60, 0.6)',
            inner: 'rgba(192, 57, 43, 0.6)'
        };
        
        return new L.DivIcon({
            html: `<div style="background-color: ${colors.inner}"><span>${childCount}</span></div>`,
            className: `marker-cluster ${sizeClass} ${allVisited ? 'cluster-visited' : 'cluster-unvisited'}`,
            iconSize: new L.Point(40, 40),
            style: `background-color: ${colors.background}`
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
                <div class="popup-buttons">
                    <button class="popup-button ${isVisited ? 'visited' : ''}" 
                            onclick="unescoExplorer.toggleVisited('${site.name}')">
                        ${isVisited ? '✓ Visited' : 'Mark as Visited'}
                    </button>
                    <button class="popup-button preview-button" 
                            onclick="unescoExplorer.showPreview('${site.name.replace(/'/g, "\\'")}')">
                        Preview
                    </button>
                </div>
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

    resetAll() {
        if (confirm('Are you sure you want to reset all visited sites? This action cannot be undone.')) {
            this.visitedSites.clear();
            localStorage.removeItem('visitedUNESCOSites');
            this.updateMarkers();
            this.updateStats();
            
            // Close dropdown after action
            document.getElementById('dropdown-content').style.display = 'none';
            document.querySelector('.dropdown-menu').classList.remove('show');
        }
    }

    async showPreview(siteName) {
        const overlay = document.getElementById('site-overlay');
        const overlayTitle = document.getElementById('overlay-title');
        const overlayContent = document.getElementById('overlay-content');
        
        // Show overlay with loading state
        overlayTitle.textContent = siteName;
        overlayContent.innerHTML = '<div class="loading-overlay">Loading site details...</div>';
        overlay.classList.add('show');
        
        // Find the site data
        const site = this.sites.find(s => s.name === siteName);
        if (!site) {
            overlayContent.innerHTML = '<div class="loading-overlay">Site not found.</div>';
            return;
        }
        
        try {
            // Fetch detailed information from Wikipedia and other sources
            const siteDetails = await this.fetchSiteDetails(site);
            this.renderSiteDetails(siteDetails, site);
        } catch (error) {
            console.error('Error fetching site details:', error);
            overlayContent.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load detailed information</h3>
                    <p>Please check your internet connection and try again.</p>
                    <div class="basic-info">
                        <h4>Basic Information:</h4>
                        <p><strong>Country:</strong> ${site.country}</p>
                        <p><strong>Year Inscribed:</strong> ${site.year}</p>
                        <p><strong>Criteria:</strong> ${site.criteria}</p>
                        <p><strong>Coordinates:</strong> ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}</p>
                    </div>
                </div>
            `;
        }
    }

    async fetchSiteDetails(site) {
        // Try to fetch from Wikipedia API
        const searchQuery = encodeURIComponent(site.name + ' UNESCO World Heritage Site');
        const wikipediaSearchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${searchQuery}`;
        
        try {
            const response = await fetch(wikipediaSearchUrl);
            if (response.ok) {
                const data = await response.json();
                return {
                    title: data.title || site.name,
                    description: data.extract || 'No description available.',
                    image: data.thumbnail ? data.thumbnail.source : null,
                    wikipediaUrl: data.content_urls ? data.content_urls.desktop.page : null
                };
            }
        } catch (error) {
            console.log('Wikipedia API failed, using fallback');
        }
        
        // Fallback: try alternative Wikipedia search
        try {
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(site.name)}`;
            const response = await fetch(searchUrl);
            if (response.ok) {
                const data = await response.json();
                return {
                    title: data.title || site.name,
                    description: data.extract || 'No description available.',
                    image: data.thumbnail ? data.thumbnail.source : null,
                    wikipediaUrl: data.content_urls ? data.content_urls.desktop.page : null
                };
            }
        } catch (error) {
            console.log('Alternative Wikipedia search failed');
        }
        
        // Final fallback
        return {
            title: site.name,
            description: `${site.name} is a UNESCO World Heritage Site located in ${site.country}. It was inscribed in ${site.year} under the criteria: ${site.criteria}.`,
            image: null,
            wikipediaUrl: null
        };
    }

    renderSiteDetails(details, site) {
        const overlayContent = document.getElementById('overlay-content');
        const isVisited = this.visitedSites.has(site.name);
        
        overlayContent.innerHTML = `
            <div class="site-details">
                ${details.image ? `
                    <div class="site-image">
                        <img src="${details.image}" alt="${details.title}" onerror="this.style.display='none'">
                    </div>
                ` : ''}
                
                <div class="site-info">
                    <div class="info-section">
                        <h3>Description</h3>
                        <p>${details.description}</p>
                    </div>
                    
                    <div class="info-section">
                        <h3>Basic Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <strong>Country:</strong> ${site.country}
                            </div>
                            <div class="info-item">
                                <strong>Year Inscribed:</strong> ${site.year}
                            </div>
                            <div class="info-item">
                                <strong>Criteria:</strong> ${site.criteria}
                            </div>
                            <div class="info-item">
                                <strong>Coordinates:</strong> 
                                <span class="coordinates-link" onclick="unescoExplorer.zoomToSite(${site.lat}, ${site.lng})" title="Click to zoom to location">
                                    ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}
                                </span>
                            </div>
                            <div class="info-item">
                                <strong>Status:</strong> <span class="status ${isVisited ? 'visited' : 'unvisited'}">${isVisited ? 'Visited' : 'Not Visited'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="overlay-actions">
                        <button class="action-button ${isVisited ? 'visited' : ''}" 
                                onclick="unescoExplorer.toggleVisited('${site.name}'); unescoExplorer.updateOverlayStatus('${site.name}')">
                            ${isVisited ? '✓ Visited' : 'Mark as Visited'}
                        </button>
                        ${details.wikipediaUrl ? `
                            <a href="${details.wikipediaUrl}" target="_blank" class="action-button wikipedia-link">
                                View on Wikipedia
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    updateOverlayStatus(siteName) {
        const isVisited = this.visitedSites.has(siteName);
        const statusElement = document.querySelector('.status');
        const actionButton = document.querySelector('.overlay-actions .action-button');
        
        if (statusElement) {
            statusElement.textContent = isVisited ? 'Visited' : 'Not Visited';
            statusElement.className = `status ${isVisited ? 'visited' : 'unvisited'}`;
        }
        
        if (actionButton) {
            actionButton.textContent = isVisited ? '✓ Visited' : 'Mark as Visited';
            actionButton.className = `action-button ${isVisited ? 'visited' : ''}`;
        }
    }

    zoomToSite(lat, lng) {
        // Close the overlay first
        this.closePreview();
        
        // Zoom to the site location with a higher zoom level
        this.map.setView([lat, lng], 8, {
            animate: true,
            duration: 1.5
        });
    }

    closePreview() {
        const overlay = document.getElementById('site-overlay');
        overlay.classList.remove('show');
    }
}

// Theme management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'system';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }

    applyTheme(theme) {
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', systemTheme);
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.updateActiveButton();
    }

    setupThemeToggle() {
        const themeButtons = document.querySelectorAll('.theme-option');
        themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.getAttribute('data-theme');
                this.applyTheme(theme);
            });
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    }

    updateActiveButton() {
        const themeButtons = document.querySelectorAll('.theme-option');
        themeButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-theme') === this.currentTheme) {
                button.classList.add('active');
            }
        });
    }
}

// Initialize the app when the page loads
let unescoExplorer;
let themeManager;

document.addEventListener('DOMContentLoaded', function() {
    unescoExplorer = new UNESCOExplorer();
    themeManager = new ThemeManager();
    
    // Setup dropdown menu functionality
    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    dropdownButton.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Setup title click functionality to toggle description
    const headerTitle = document.getElementById('header-title');
    const headerDescription = document.getElementById('header-description');
    
    headerTitle.addEventListener('click', function() {
        if (headerDescription.style.display === 'none') {
            headerDescription.style.display = 'block';
        } else {
            headerDescription.style.display = 'none';
        }
    });
});
