// Environment Variables Loader
// Loads .env file and makes variables available via window.ENV

async function loadEnvironmentVariables() {
    try {
        const response = await fetch('.env');
        if (!response.ok) {
            console.log('No .env file found, Firebase will use demo mode');
            return;
        }
        
        const envText = await response.text();
        const envVars = {};
        
        // Parse .env file
        envText.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        
        // Make environment variables available globally
        window.ENV = envVars;
        console.log('Environment variables loaded successfully');
        
    } catch (error) {
        console.log('Could not load environment variables:', error);
        window.ENV = {};
    }
}

// Load environment variables immediately
loadEnvironmentVariables();
