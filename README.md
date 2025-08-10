# UNESCO World Heritage Sites Explorer

![UNESCO World Heritage Sites Explorer](https://prabhakar267.github.io/explorer/assets/molumen-world-map-1.svg)

A modern, interactive web application that displays UNESCO World Heritage Sites on a beautiful map interface, allowing users to track their visits and explore sites worldwide with cross-device synchronization.

**🌐 Live Demo**: [https://prabhakar267.github.io/explorer/](https://prabhakar267.github.io/explorer/)

## ✨ Features

### 🗺️ Interactive Mapping
- **Full-screen Map**: Immersive map experience with smooth navigation
- **Hover Previews**: Instant site information on marker hover
- **Smart Clustering**: Automatic marker grouping with visit status indicators
- **World Wrapping**: Seamless map navigation across longitude boundaries
- **Zoom to Location**: Click coordinates to jump to site location

### 👤 User Authentication & Sync
- **Firebase Authentication**: Secure email/password accounts
- **Cross-Device Sync**: Access your data from any device
- **Real-time Updates**: Instant synchronization across all devices
- **Offline Support**: Works without internet using local storage
- **Data Merging**: Intelligently combines data from multiple devices

### 🎨 Modern Design
- **Theme System**: Light, dark, and system theme modes
- **Glass Morphism**: Modern UI with backdrop blur effects
- **Responsive Design**: Perfect on desktop, tablet, and mobile
- **CSS Variables**: Dynamic theming throughout the interface
- **Smooth Animations**: Polished interactions and transitions

### 📊 Site Management
- **Visit Tracking**: Mark sites as visited with persistent storage
- **Detailed Previews**: Rich site information with Wikipedia integration
- **Progress Statistics**: Real-time tracking of visited vs remaining sites
- **Site Search**: Easy discovery through interactive map exploration
- **Reset Functionality**: Clear all visited sites when needed

### 🔒 Security & Configuration
- **Environment Variables**: Secure Firebase configuration management
- **No Hardcoded Keys**: API keys loaded from environment files
- **Graceful Fallbacks**: Works in demo mode without Firebase
- **Git Security**: Sensitive files automatically ignored

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with MarkerCluster plugin
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Styling**: CSS Variables, Glass Morphism, Responsive Design
- **Data Storage**: Firebase + localStorage fallback
- **Hosting**: GitHub Pages compatible

## 🌍 Site Data

The application loads real-time data from the official UNESCO World Heritage Sites database (`https://ihp-wins.unesco.org/.../whc-sites-2025.csv`), featuring 1000+ sites across:

- **🏛️ Cultural Sites**: Taj Mahal, Colosseum, Machu Picchu, Great Wall of China
- **🌿 Natural Sites**: Great Barrier Reef, Yellowstone, Galápagos Islands
- **🏞️ Mixed Sites**: Mount Fuji, Meteora, Papahānaumokuākea
- **🌍 Global Coverage**: Sites from all continents and regions

Each site includes:
- Precise GPS coordinates
- Inscription year and criteria
- Country and regional information
- Wikipedia integration for detailed descriptions

## 🚀 Quick Start

### Option 1: Use Live Version
Visit [https://prabhakar267.github.io/explorer/](https://prabhakar267.github.io/explorer/) - no setup required!

### Option 2: Local Development
```bash
git clone https://github.com/prabhakar267/explorer.git
cd explorer
# Open index.html in your browser - no build process needed!
```

### Option 3: With Firebase Sync
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password) and Firestore Database
3. Copy `.env.example` to `.env` and add your Firebase configuration
4. Open `index.html` in your browser

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed Firebase configuration instructions.

## 📱 Usage Guide

### 🔍 Exploring Sites
- **Browse Map**: Pan and zoom to explore different regions
- **Hover Preview**: Hover over markers for quick site information
- **Click for Details**: Click markers for full site previews with Wikipedia info
- **Theme Toggle**: Switch between light, dark, and system themes

### 👤 Account Features
- **Sign Up/In**: Create an account for cross-device sync
- **Visit Tracking**: Mark sites as visited - syncs across all devices
- **Progress Tracking**: View statistics in the bottom-left panel
- **Data Sync**: Automatic synchronization with visual status indicators

### 🎯 Visual Indicators
- **🔴 Red Markers**: Unvisited sites
- **🟢 Green Markers**: Visited sites
- **📍 Clusters**: Grouped markers showing visit status
- **🔄 Sync Status**: Real-time sync indicators in account menu

## 🔧 Configuration

### Environment Variables
Create a `.env` file with your Firebase configuration:
```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Security
- Environment variables are automatically loaded
- `.env` file is git-ignored for security
- Firebase rules restrict access to user's own data
- Graceful fallback to demo mode without configuration

## 🌐 Deployment

### GitHub Pages
1. Fork or clone the repository
2. Enable GitHub Pages in repository settings
3. Add Firebase configuration (optional)
4. Access at `https://username.github.io/repository-name`

### Custom Hosting
- Upload files to any static hosting service
- Configure environment variables for Firebase sync
- No server-side requirements

## 🔒 Privacy & Data

- **Local Storage**: Visit data stored locally when not signed in
- **Firebase Sync**: Encrypted data storage when authenticated
- **No Tracking**: No analytics or user tracking (unless you enable Firebase Analytics)
- **Open Source**: Full transparency - inspect all code

## 🤝 Contributing

Contributions are welcome! This project was created as a coding exercise and learning experience.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **UNESCO**: For maintaining the World Heritage Sites database
- **Leaflet.js**: For the excellent mapping library
- **Firebase**: For authentication and database services
- **OpenStreetMap**: For the map tiles and data

---

**Created by [Prabhakar Gupta](https://github.com/prabhakar267)** - A vibe coding project built with Claude 3.5 Sonnet
