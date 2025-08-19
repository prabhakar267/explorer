// GitHub Gist Data Manager
// Simple data loading from GitHub Gists using access codes

class GistDataManager {
    constructor() {
        this.encryptionKey = "unesco-explorer-2025"; // Simple key for basic obfuscation
        this.accessCodes = {
            // Encrypted access codes using simple Caesar cipher
            "nybbtbouv123": {
                gistId: "05bc3de9d00ceaf8d9505ec513a57ccd",
                gistUrl: "https://api.github.com/gists/05bc3de9d00ceaf8d9505ec513a57ccd"
            }
        };
        this.currentAccessCode = null;
        this.isEnabled = false;
        this.loadedData = null;
        this.init();
    }

    init() {
        // Check if user has a saved access code
        const savedCode = localStorage.getItem('unescoAccessCode');
        if (savedCode) {
            // Delay the access code setting to ensure UI is ready
            setTimeout(() => {
                this.setAccessCode(savedCode);
            }, 100);
        }
    }

    // Simple Caesar cipher for basic obfuscation
    encrypt(text) {
        return text.split('').map(char => {
            if (char.match(/[a-z]/i)) {
                const code = char.charCodeAt(0);
                const base = code >= 65 && code <= 90 ? 65 : 97;
                return String.fromCharCode(((code - base + 13) % 26) + base);
            }
            return char;
        }).join('');
    }


    setAccessCode(code) {
        const encryptedCode = this.encrypt(code.toLowerCase());
        
        if (this.accessCodes[encryptedCode]) {
            this.currentAccessCode = code;
            this.isEnabled = true;
            localStorage.setItem('unescoAccessCode', code);
            console.log('Access code accepted - GitHub Gist sync enabled');
            this.loadGistData();
            return true;
        } else {
            console.log('Invalid access code');
            return false;
        }
    }

    removeAccessCode() {
        this.currentAccessCode = null;
        this.isEnabled = false;
        this.loadedData = null;
        localStorage.removeItem('unescoAccessCode');
        console.log('Access code removed - using localStorage only');
    }

    async loadGistData() {
        if (!this.isEnabled || !this.currentAccessCode) {
            return [];
        }

        const encryptedCode = this.encrypt(this.currentAccessCode.toLowerCase());
        const gistConfig = this.accessCodes[encryptedCode];

        try {
            // Fetch gist data using GitHub API
            const response = await fetch(gistConfig.gistUrl);
            
            if (!response.ok) {
                throw new Error(`GitHub API request failed: ${response.status}`);
            }

            const gistData = await response.json();
            
            // Find the data file in the gist
            const files = gistData.files;
            let dataContent = null;
            
            // Look for JSON data file (could be named data.json, unesco-data.json, etc.)
            for (const filename in files) {
                if (filename.toLowerCase().includes('data') && filename.toLowerCase().includes('.json')) {
                    dataContent = files[filename].content;
                    break;
                }
            }
            
            // If no specific data file found, try the first JSON file
            if (!dataContent) {
                for (const filename in files) {
                    if (filename.toLowerCase().endsWith('.json')) {
                        dataContent = files[filename].content;
                        break;
                    }
                }
            }
            
            if (!dataContent) {
                throw new Error('No JSON data file found in gist');
            }

            // Parse the JSON data
            const parsedData = JSON.parse(dataContent);
            this.loadedData = parsedData;
            
            console.log('Loaded data from GitHub Gist:', parsedData?.visitedSites?.length || 0, 'visited sites');
            
            // Notify UI that data has been loaded
            this.notifyDataLoaded(parsedData?.visitedSites || []);
            
            return parsedData?.visitedSites || [];
            
        } catch (error) {
            console.error('Error loading gist data:', error);
            return [];
        }
    }

    async loadUserData() {
        if (this.isEnabled && this.currentAccessCode) {
            try {
                const gistData = await this.loadGistData();
                return gistData;
            } catch (error) {
                console.error('Error loading from gist, using localStorage:', error);
            }
        }
        
        // Fallback to localStorage
        const localData = JSON.parse(localStorage.getItem('visitedUNESCOSites') || '[]');
        return localData;
    }

    downloadData() {
        const visitedSites = JSON.parse(localStorage.getItem('visitedUNESCOSites') || '[]');
        const theme = localStorage.getItem('theme') || 'system';
        
        const data = {
            visitedSites: visitedSites,
            theme: theme,
            lastUpdated: new Date().toISOString(),
            totalSites: visitedSites.length
        };

        // Create download link
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `unesco-explorer-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Data downloaded:', visitedSites.length, 'visited sites');
    }

    showAccessCodeDialog() {
        const code = prompt('Enter access code to sync with GitHub Gist:');
        if (code) {
            const encryptedCode = this.encrypt(code.toLowerCase());
            console.log(`Access code entered: "${code}"`);
            console.log(`Encrypted version: "${encryptedCode}"`);
            
            if (this.setAccessCode(code)) {
                alert('Access code accepted! Data will now sync from GitHub Gist.');
                // Data loading and UI update will be handled by setAccessCode -> loadGistData -> notifyDataLoaded
            } else {
                alert('Invalid access code. Please try again.');
            }
        }
    }

    updateUI() {
        // Update any UI elements to show sync status
        const syncStatus = document.querySelector('.sync-status');
        if (syncStatus) {
            if (this.isEnabled) {
                syncStatus.innerHTML = `
                    <span class="sync-indicator">●</span>
                    <span class="sync-text">Gist Sync</span>
                `;
            } else {
                syncStatus.innerHTML = `
                    <span class="sync-indicator">●</span>
                    <span class="sync-text">Local Only</span>
                `;
            }
        }
    }

    // Method for compatibility with existing code
    async onDataChange() {
        // No automatic sync - data is read-only from gist
        // Users need to manually update the gist
    }

    // Notify the UI when data has been loaded from API
    notifyDataLoaded(visitedSites) {
        if (window.unescoExplorer) {
            // Update the visited sites in the explorer
            window.unescoExplorer.updateVisitedSitesFromAPI(visitedSites);
        } else {
            // If UI is not ready yet, wait and try again
            setTimeout(() => {
                if (window.unescoExplorer) {
                    window.unescoExplorer.updateVisitedSitesFromAPI(visitedSites);
                }
            }, 500);
        }
    }
}

// Export for global use
window.GistDataManager = GistDataManager;
