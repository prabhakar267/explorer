// Firebase Configuration - Environment Variables Only
// Reads configuration from generic environment variables

const firebaseConfig = {
    apiKey: window.ENV?.FIREBASE_API_KEY,
    authDomain: window.ENV?.FIREBASE_AUTH_DOMAIN,
    databaseURL: window.ENV?.FIREBASE_DATABASE_URL,
    projectId: window.ENV?.FIREBASE_PROJECT_ID,
    storageBucket: window.ENV?.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.ENV?.FIREBASE_MESSAGING_SENDER_ID,
    appId: window.ENV?.FIREBASE_APP_ID,
    measurementId: window.ENV?.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let firebaseApp = null;
let auth = null;
let db = null;

function initializeFirebase() {
    try {
        // Check if we have a valid configuration
        if (firebaseConfig.apiKey && firebaseConfig.projectId) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            console.log("Firebase initialized successfully with environment variables");
        } else {
            console.log("Firebase environment variables not found, using demo mode");
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        console.log("Falling back to demo mode");
    }
}

// Wait for environment variables to be loaded, then initialize Firebase
function waitForEnvAndInitialize() {
    if (window.ENV) {
        initializeFirebase();
    } else {
        // Wait a bit and try again
        setTimeout(waitForEnvAndInitialize, 100);
    }
}

// Start the initialization process
waitForEnvAndInitialize();

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDb = db;
window.isFirebaseEnabled = firebaseApp !== null;
