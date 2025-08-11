// Environment Variables Loader
// Loads environment variables from various sources, falls back to demo mode

function loadEnvironmentVariables() {
    // Initialize window.ENV object
    window.ENV = {};
    
    // Environment variables to look for
    const envVars = [
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN', 
        'FIREBASE_DATABASE_URL',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID',
        'FIREBASE_MEASUREMENT_ID'
    ];
    
    let foundEnvVars = false;
    
    // Check if environment variables are available from various sources
    envVars.forEach(varName => {
        let value = null;
        
        // Method 1: Direct process.env (Node.js environment)
        if (typeof process !== 'undefined' && process.env && process.env[varName]) {
            value = process.env[varName];
        }
        
        // Method 2: Build-time injected variables (Vite) - skip in non-module context
        // Note: import.meta is only available in ES modules, skipping to avoid syntax errors
        
        // Method 3: React-style environment variables
        if (!value && typeof process !== 'undefined' && process.env && process.env[`REACT_APP_${varName}`]) {
            value = process.env[`REACT_APP_${varName}`];
        }
        
        // Method 4: GitHub repository secrets (if exposed via build process)
        if (!value && typeof window !== 'undefined' && window.GITHUB_SECRETS && window.GITHUB_SECRETS[varName]) {
            value = window.GITHUB_SECRETS[varName];
        }
        
        // Method 5: GitHub Pages/Netlify environment variables (if exposed via build process)
        if (!value && typeof window !== 'undefined' && window[varName]) {
            value = window[varName];
        }
        
        // Method 6: Check for global variables that might be injected
        if (!value && typeof window !== 'undefined' && window.ENV && window.ENV[varName]) {
            value = window.ENV[varName];
        }
        
        if (value) {
            window.ENV[varName] = value;
            foundEnvVars = true;
        }
    });
    
    if (foundEnvVars) {
        console.log('Environment variables loaded successfully from build environment');
        return Promise.resolve();
    }
    
    // Fallback: try to load from .env file (for local development)
    return fetch('.env')
        .then(response => {
            if (!response.ok) {
                console.log('No environment variables or .env file found - using demo mode');
                return '';
            }
            return response.text();
        })
        .then(envText => {
            if (envText) {
                // Parse .env file
                envText.split('\n').forEach(line => {
                    line = line.trim();
                    if (line && !line.startsWith('#')) {
                        const [key, ...valueParts] = line.split('=');
                        if (key && valueParts.length > 0) {
                            window.ENV[key.trim()] = valueParts.join('=').trim();
                            foundEnvVars = true;
                        }
                    }
                });
                
                if (foundEnvVars) {
                    console.log('Environment variables loaded from .env file');
                } else {
                    console.log('No valid environment variables found - using demo mode');
                }
            } else {
                console.log('No environment configuration found - using demo mode');
            }
        })
        .catch(error => {
            console.log('Could not load environment variables - using demo mode:', error);
        });
}

// Load environment variables immediately
loadEnvironmentVariables();
