// US National Parks Explorer
//
// v1 of the Parks view. This class is intentionally a near-duplicate of
// UNESCOExplorer in js/script.js. The two differ in:
//   - data source        (local JSON file vs. UNESCO CSV)
//   - storage key        (visitedUSParks vs. visitedUNESCOSites)
//   - map bounds         (cropped to the US + territories)
//   - preview lookup     (uses wikipediaTitle from the record, more
//                         reliable than UNESCO's guess-from-name)
//   - popup / detail copy (Year Established / Area / State instead of
//                          Country / Year Inscribed / Criteria)
//   - no Gist sync        (v1 is local-only; sync is a follow-up issue)
//
// Refactoring the two into a shared base class (SitesExplorer) is tracked
// as a separate follow-up. For v1 the duplication is tolerated so the two
// surfaces can evolve independently.

class USParksExplorer {
    static VISITED_STYLE = {
        fillColor: '#27ae60',
        color: '#2ecc71',
    };
    static UNVISITED_STYLE = {
        fillColor: '#e74c3c',
        color: '#c0392b',
    };
    static BASE_MARKER_OPTS = {
        radius: 8,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
    };

    // Bounds chosen to cover all 63 parks including territories:
    //   - Alaska / Gates of the Arctic at ~67.8N
    //   - American Samoa at ~14.25S, 170.68W
    //   - US Virgin Islands at ~64.73W
    // A little padding so markers aren't clipped against the edge.
    static MAX_BOUNDS = [[-16, -180], [72, -64]];
    // Initial view centers on CONUS so the common case (lower-48 parks)
    // is visible without panning.
    static INITIAL_CENTER = [39.5, -98.35];
    static INITIAL_ZOOM = 4;

    static STORAGE_KEY = 'visitedUSParks';
    static DATA_URL = 'data/us-parks.json';

    constructor() {
        this.map = null;
        this.sites = [];
        this.visitedSites = new Set();
        this.markersBySite = new Map();
        this._popupHoverTimeout = null;
        this.markers = new L.MarkerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster) => this.createClusterIcon(cluster),
        });

        this._setupMarkerEventDelegation();
        this.initMap();
        this.loadParks();
        this.loadVisitedSites();
    }

    _setupMarkerEventDelegation() {
        this.markers.on('click', (e) => {
            const marker = e.layer;
            const site = marker?.siteData;
            if (!site) return;
            e.originalEvent?.stopPropagation?.();
            this.showPreview(site.name);
        });

        this.markers.on('mouseover', (e) => {
            const marker = e.layer;
            if (!marker?.siteData) return;
            clearTimeout(this._popupHoverTimeout);
            marker.openPopup();
        });

        this.markers.on('mouseout', (e) => {
            const marker = e.layer;
            if (!marker?.siteData) return;
            this._popupHoverTimeout = setTimeout(() => {
                marker.closePopup();
            }, 300);
        });

        this.markers.on('popupopen', (e) => {
            const popupEl = e.popup.getElement();
            if (!popupEl) return;
            popupEl.addEventListener('mouseenter', () => {
                clearTimeout(this._popupHoverTimeout);
            });
            popupEl.addEventListener('mouseleave', () => {
                this._popupHoverTimeout = setTimeout(() => {
                    e.popup._source?.closePopup();
                }, 100);
            });
        });
    }

    _styleFor(siteName) {
        return this.visitedSites.has(siteName)
            ? USParksExplorer.VISITED_STYLE
            : USParksExplorer.UNVISITED_STYLE;
    }

    loadVisitedSites() {
        // Local-only in v1. No Gist sync on the Parks view.
        const localData = JSON.parse(
            localStorage.getItem(USParksExplorer.STORAGE_KEY) || '[]'
        );
        this.visitedSites = new Set(localData);

        if (this.sites.length > 0) {
            this.updateMarkers();
            this.updateStats();
        }
    }

    initMap() {
        this.map = L.map('map', {
            // The US is contiguous enough that world-wrapping would be
            // confusing. Disable it and constrain to US bounds instead.
            worldCopyJump: false,
            maxBounds: USParksExplorer.MAX_BOUNDS,
            maxBoundsViscosity: 1.0,
            zoomControl: false,
        }).setView(USParksExplorer.INITIAL_CENTER, USParksExplorer.INITIAL_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            noWrap: true,
        }).addTo(this.map);

        this.map.addLayer(this.markers);

        this.map.on('click', () => {
            this.closePreview();
        });
    }

    async loadParks() {
        try {
            const response = await fetch(USParksExplorer.DATA_URL);
            if (!response.ok) {
                throw new Error(
                    `Failed to load parks data: ${response.status}`
                );
            }
            const parks = await response.json();
            this.sites = parks.filter(
                (p) =>
                    typeof p.lat === 'number' &&
                    typeof p.lng === 'number' &&
                    !Number.isNaN(p.lat) &&
                    !Number.isNaN(p.lng)
            );
            this.createMarkers();
            this.updateStats();
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('Error loading US parks:', error);
            document.getElementById('loading').innerHTML =
                '<div>Error loading parks. Please refresh the page.</div>';
        }
    }

    createMarkers() {
        this.sites.forEach((site) => {
            const marker = L.circleMarker(
                [site.lat, site.lng],
                {
                    ...USParksExplorer.BASE_MARKER_OPTS,
                    ...this._styleFor(site.name),
                }
            );
            marker.siteData = site;
            marker.bindPopup(() =>
                this.createPopupContent(site, this.visitedSites.has(site.name))
            );
            this.markersBySite.set(site.name, marker);
            this.markers.addLayer(marker);
        });
    }

    createClusterIcon(cluster) {
        const markers = cluster.getAllChildMarkers();
        const childCount = cluster.getChildCount();

        let allVisited = true;
        for (const marker of markers) {
            const name = marker.siteData?.name;
            if (!name || !this.visitedSites.has(name)) {
                allVisited = false;
                break;
            }
        }

        const sizeClass =
            childCount < 10
                ? 'marker-cluster-small'
                : childCount < 100
                ? 'marker-cluster-medium'
                : 'marker-cluster-large';

        const colors = allVisited
            ? {
                  background: 'rgba(39, 174, 96, 0.6)',
                  inner: 'rgba(46, 204, 113, 0.6)',
              }
            : {
                  background: 'rgba(231, 76, 60, 0.6)',
                  inner: 'rgba(192, 57, 43, 0.6)',
              };

        return new L.DivIcon({
            html: `<div style="background-color: ${colors.inner}"><span>${childCount}</span></div>`,
            className: `marker-cluster ${sizeClass} ${
                allVisited ? 'cluster-visited' : 'cluster-unvisited'
            }`,
            iconSize: new L.Point(40, 40),
            style: `background-color: ${colors.background}`,
        });
    }

    _formatArea(acres) {
        if (typeof acres !== 'number' || Number.isNaN(acres)) return 'Unknown';
        return `${acres.toLocaleString('en-US', {
            maximumFractionDigits: 0,
        })} acres`;
    }

    createPopupContent(site, isVisited) {
        const stateLabel =
            Array.isArray(site.states) && site.states.length > 1
                ? 'States'
                : 'State';
        const stateValue =
            site.state || (Array.isArray(site.states) ? site.states.join(', ') : '');
        // Escape single quotes in the site name so the onclick handlers
        // don't break when a park name contains them (none currently do,
        // but belt-and-braces).
        const safeName = site.name.replace(/'/g, "\\'");
        return `
            <div class="custom-popup">
                <div class="popup-title">${site.name}</div>
                <div class="popup-info">
                    <strong>${stateLabel}:</strong> ${stateValue}<br>
                    <strong>Established:</strong> ${site.yearEstablished ?? 'Unknown'}<br>
                    <strong>Area:</strong> ${this._formatArea(site.areaAcres)}
                </div>
                <div class="popup-buttons">
                    <button class="popup-button ${isVisited ? 'visited' : ''}"
                            onclick="parksExplorer.toggleVisited('${safeName}')">
                        ${isVisited ? '✓ Visited' : 'Mark as Visited'}
                    </button>
                    <button class="popup-button preview-button"
                            onclick="parksExplorer.showPreview('${safeName}')">
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

        localStorage.setItem(
            USParksExplorer.STORAGE_KEY,
            JSON.stringify([...this.visitedSites])
        );

        const marker = this.markersBySite.get(siteName);
        if (marker) {
            marker.setStyle(this._styleFor(siteName));
        }
        this.markers.refreshClusters();
        this.updateStats();
    }

    updateMarkers() {
        if (this.markersBySite.size === 0) {
            this.createMarkers();
            return;
        }
        this.markersBySite.forEach((marker, siteName) => {
            marker.setStyle(this._styleFor(siteName));
        });
        this.markers.refreshClusters();
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
        if (
            confirm(
                'Are you sure you want to reset all visited parks? This action cannot be undone.'
            )
        ) {
            this.visitedSites.clear();
            localStorage.removeItem(USParksExplorer.STORAGE_KEY);
            this.updateMarkers();
            this.updateStats();

            document.getElementById('dropdown-content').style.display = 'none';
            document.querySelector('.dropdown-menu').classList.remove('show');
        }
    }

    async showPreview(siteName) {
        const overlay = document.getElementById('site-overlay');
        const overlayTitle = document.getElementById('overlay-title');
        const overlayContent = document.getElementById('overlay-content');

        overlayTitle.textContent = siteName;
        overlayContent.innerHTML =
            '<div class="loading-overlay">Loading park details...</div>';
        overlay.classList.add('show');

        const site = this.sites.find((s) => s.name === siteName);
        if (!site) {
            overlayContent.innerHTML =
                '<div class="loading-overlay">Park not found.</div>';
            return;
        }

        try {
            const siteDetails = await this.fetchSiteDetails(site);
            this.renderSiteDetails(siteDetails, site);
        } catch (error) {
            console.error('Error fetching park details:', error);
            overlayContent.innerHTML = `
                <div class="error-message">
                    <h3>Unable to load detailed information</h3>
                    <p>Please check your internet connection and try again.</p>
                    <div class="basic-info">
                        <h4>Basic Information:</h4>
                        <p><strong>State:</strong> ${site.state || 'Unknown'}</p>
                        <p><strong>Established:</strong> ${site.yearEstablished ?? 'Unknown'}</p>
                        <p><strong>Area:</strong> ${this._formatArea(site.areaAcres)}</p>
                        <p><strong>Coordinates:</strong> ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}</p>
                    </div>
                </div>
            `;
        }
    }

    async fetchSiteDetails(site) {
        // Park records include wikipediaTitle — use it directly rather
        // than guessing from the display name like UNESCOExplorer does.
        // Wikipedia's REST summary API expects an encoded page title.
        const title = site.wikipediaTitle || site.name;
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            title
        )}`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return {
                    title: data.title || site.name,
                    description: data.extract || 'No description available.',
                    image: data.thumbnail ? data.thumbnail.source : null,
                    wikipediaUrl: data.content_urls
                        ? data.content_urls.desktop.page
                        : null,
                };
            }
        } catch (error) {
            console.log('Wikipedia summary fetch failed, using fallback');
        }

        // Final fallback — a minimal card assembled from the record itself.
        return {
            title: site.name,
            description: `${site.name} National Park is located in ${site.state}. It was established in ${site.yearEstablished}.`,
            image: null,
            wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        };
    }

    renderSiteDetails(details, site) {
        const overlayContent = document.getElementById('overlay-content');
        const isVisited = this.visitedSites.has(site.name);
        const stateLabel =
            Array.isArray(site.states) && site.states.length > 1
                ? 'States'
                : 'State';
        const stateValue =
            site.state || (Array.isArray(site.states) ? site.states.join(', ') : '');
        const safeName = site.name.replace(/'/g, "\\'");

        overlayContent.innerHTML = `
            <div class="site-details">
                ${
                    details.image
                        ? `
                    <div class="site-image">
                        <img src="${details.image}" alt="${details.title}" onerror="this.style.display='none'">
                    </div>
                `
                        : ''
                }

                <div class="site-info">
                    <div class="info-section">
                        <h3>Description</h3>
                        <p>${details.description}</p>
                    </div>

                    <div class="info-section">
                        <h3>Basic Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <strong>${stateLabel}:</strong> ${stateValue}
                            </div>
                            <div class="info-item">
                                <strong>Established:</strong> ${site.yearEstablished ?? 'Unknown'}
                            </div>
                            <div class="info-item">
                                <strong>Area:</strong> ${this._formatArea(site.areaAcres)}
                            </div>
                            <div class="info-item">
                                <strong>Coordinates:</strong>
                                <span class="coordinates-link" onclick="parksExplorer.zoomToSite(${site.lat}, ${site.lng})" title="Click to zoom to location">
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
                                onclick="parksExplorer.toggleVisited('${safeName}'); parksExplorer.updateOverlayStatus('${safeName}')">
                            ${isVisited ? '✓ Visited' : 'Mark as Visited'}
                        </button>
                        ${
                            details.wikipediaUrl
                                ? `
                            <a href="${details.wikipediaUrl}" target="_blank" class="action-button wikipedia-link">
                                View on Wikipedia
                            </a>
                        `
                                : ''
                        }
                    </div>
                </div>
            </div>
        `;
    }

    updateOverlayStatus(siteName) {
        const isVisited = this.visitedSites.has(siteName);
        const statusElement = document.querySelector('.status');
        const actionButton = document.querySelector(
            '.overlay-actions .action-button'
        );

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
        this.closePreview();
        this.map.setView([lat, lng], 8, {
            animate: true,
            duration: 1.5,
        });
    }

    closePreview() {
        const overlay = document.getElementById('site-overlay');
        overlay.classList.remove('show');
    }
}

// Theme management — intentionally duplicated from script.js so the Parks
// page stays self-contained. A shared `js/theme.js` is a good extraction
// target once the two views are generalized.
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
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
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
        themeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const theme = button.getAttribute('data-theme');
                this.applyTheme(theme);
            });
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    }

    updateActiveButton() {
        const themeButtons = document.querySelectorAll('.theme-option');
        themeButtons.forEach((button) => {
            button.classList.remove('active');
            if (button.getAttribute('data-theme') === this.currentTheme) {
                button.classList.add('active');
            }
        });
    }
}

let parksExplorer;
let themeManager;

document.addEventListener('DOMContentLoaded', function () {
    parksExplorer = new USParksExplorer();
    window.parksExplorer = parksExplorer;

    themeManager = new ThemeManager();

    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    dropdownButton.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', function (e) {
        if (!dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    const headerTitle = document.getElementById('header-title');
    const headerDescription = document.getElementById('header-description');

    headerTitle.addEventListener('click', function () {
        if (headerDescription.style.display === 'none') {
            headerDescription.style.display = 'block';
        } else {
            headerDescription.style.display = 'none';
        }
    });
});
