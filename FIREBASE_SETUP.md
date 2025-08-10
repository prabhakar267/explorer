# Firebase Setup for Cross-Device Sync

Currently, the app uses localStorage simulation for demonstration. To enable **real cross-device synchronization**, follow these steps:

## 🔥 Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "unesco-explorer")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Save changes

### 3. Enable Firestore Database
1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location close to your users
5. Create database

### 4. Get Firebase Configuration
1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click **Web app** icon (`</>`)
4. Register app with nickname (e.g., "unesco-web")
5. Copy the `firebaseConfig` object

### 5. Secure Configuration Setup

**⚠️ IMPORTANT: Never commit API keys to version control!**

Choose one of these secure methods:

#### Method A: Environment Variables (Recommended)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual Firebase values in `.env`:
   ```bash
   VITE_FIREBASE_API_KEY=your-actual-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-actual-project-id
   # ... etc
   ```

3. Use a build tool like Vite or Webpack to inject environment variables

#### Method B: External Config File

1. Copy the example config:
   ```bash
   cp config/firebase.json.example config/firebase.json
   ```

2. Fill in your actual values in `config/firebase.json`

3. The app will automatically load this file at runtime

#### Method C: API Endpoint

Create a secure API endpoint at `/api/firebase-config` that returns your configuration (server-side only).

## 🔒 Security Rules (Production)

For production, update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 How It Works

Once configured:

1. **Sign Up/In**: Users create accounts with email/password
2. **Real-time Sync**: Data syncs to Firebase Firestore
3. **Cross-Device**: Sign in on any device to access your data
4. **Data Merging**: Visited sites from all devices are combined
5. **Offline Support**: Works offline, syncs when reconnected

## 📱 Data Structure

User data is stored in Firestore as:

```javascript
/users/{userId} {
  email: "user@example.com",
  visitedSites: ["Site 1", "Site 2", ...],
  theme: "system|light|dark",
  lastSync: "2025-01-10T12:00:00.000Z"
}
```

## 🔧 Current Fallback

Without Firebase configuration, the app uses:
- localStorage simulation for demo purposes
- Email-only authentication (no real accounts)
- Single-device storage only

## 🌐 Deployment

For production deployment:
1. Set up Firebase Hosting (optional)
2. Configure custom domain
3. Enable production security rules
4. Set up monitoring and analytics

---

**Note**: The current implementation gracefully falls back to localStorage if Firebase is not configured, so the app works in both modes.
