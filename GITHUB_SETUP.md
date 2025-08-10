# GitHub Pages Setup with Environment Variables

This guide explains how to set up the UNESCO World Heritage Sites Explorer on GitHub Pages with Firebase integration using GitHub repository secrets.

## 🔧 GitHub Repository Setup

### 1. Enable GitHub Pages
1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The site will be available at `https://username.github.io/repository-name`

### 2. Configure Repository Secrets
Go to **Settings** → **Secrets and variables** → **Actions** and add these repository secrets:

```
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Firebase Project Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable **Authentication** → **Email/Password** provider
3. Enable **Firestore Database** in test mode
4. Get your configuration from **Project Settings** → **General** → **Your apps**

## 🚀 How It Works

### GitHub Actions Workflow
The `.github/workflows/deploy.yml` file:
1. **Triggers** on every push to main branch
2. **Injects** environment variables from repository secrets into `js/env-config.js`
3. **Builds** the site with Firebase configuration
4. **Deploys** to GitHub Pages automatically

### Environment Variable Injection
During build, the workflow creates:
```javascript
// js/env-config.js (auto-generated)
window.ENV = {
  FIREBASE_API_KEY: 'your-actual-api-key',
  FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
  // ... other Firebase config
};
```

### Local Development
For local development:
1. Create a `.env` file with your Firebase configuration
2. The app will load variables from the `.env` file
3. If no `.env` file exists, app runs in demo mode (localStorage only)

## 🔒 Security

### Repository Secrets
- **Secrets are encrypted** and only accessible during GitHub Actions
- **Not exposed** in the repository code or logs
- **Injected at build time** into the deployed files

### Firebase Security Rules
Update your Firestore security rules for production:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔄 Deployment Process

1. **Push to main** → GitHub Actions triggers
2. **Secrets injected** → Environment variables added to build
3. **Site deployed** → Available on GitHub Pages with Firebase
4. **Users can sign in** → Cross-device sync enabled

## 🛠️ Troubleshooting

### Firebase Not Working
- Check that all repository secrets are set correctly
- Verify Firebase project configuration
- Check browser console for error messages
- Ensure Firestore and Authentication are enabled

### Build Failures
- Check GitHub Actions logs in the **Actions** tab
- Verify all required secrets are configured
- Ensure Firebase project exists and is accessible

### Demo Mode
If Firebase isn't configured, the app automatically falls back to:
- localStorage-only data storage
- No cross-device sync
- No user authentication
- Full functionality otherwise

---

**Note**: Use your actual Firebase project configuration values for the repository secrets.
