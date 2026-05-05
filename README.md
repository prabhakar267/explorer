# UNESCO World Heritage Sites Explorer

![UNESCO World Heritage Sites Explorer](https://prabhakar267.github.io/explorer/assets/molumen-world-map-1.png)

A modern, interactive web application that displays UNESCO World Heritage Sites on a beautiful map interface, allowing users to track their visits and explore sites worldwide with optional GitHub Gist synchronization.

**🌐 Live Demo**: [https://prabhakar267.github.io/explorer/](https://prabhakar267.github.io/explorer/)

## ✨ Features

### 🗺️ Interactive Mapping
- **Full-screen Map**: Immersive map experience with smooth navigation
- **Hover Previews**: Instant site information on marker hover
- **Smart Clustering**: Automatic marker grouping with visit status indicators
- **World Wrapping**: Seamless map navigation across longitude boundaries
- **Zoom to Location**: Click coordinates to jump to site location

### 🔐 Data Sync & Access Control
- **Local Storage**: Works perfectly without any setup - data stored locally
- **Access Code System**: Optional GitHub Gist sync gated by a shared access code
- **Data Export**: Download your visit data as JSON for backup/sharing
- **Read-only Sync**: Gist data loads automatically when a valid access code is provided
- **Offline First**: Full functionality without internet connection

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

### 🔒 Security & Privacy
- **No Registration Required**: Works immediately without accounts
- **Local Data Priority**: Your data stays on your device by default
- **No Tracking**: No analytics or user tracking
- **No Third-Party Cookies**: No external scripts loaded for tracking purposes

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with MarkerCluster plugin
- **Data Sync**: GitHub Gist integration (optional)
- **Styling**: CSS Variables, Glass Morphism, Responsive Design
- **Data Storage**: localStorage + optional Gist sync
- **Hosting**: GitHub Pages compatible
- **Access Codes**: ROT13 obfuscation (not encryption — see [Security note](#-privacy--security))

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

### Option 1: Use Live Version (Recommended)
Visit [https://prabhakar267.github.io/explorer/](https://prabhakar267.github.io/explorer/) - works immediately!

### Option 2: Local Development
```bash
git clone https://github.com/prabhakar267/explorer.git
cd explorer
# Serve via local HTTP server (required for CORS)
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Option 3: With GitHub Gist Sync
1. Get an access code from the project maintainer
2. Click the dropdown menu (⋮) in the top-right
3. Select "Enter Access Code" and input your code
4. Your data will now sync with the shared GitHub Gist

## 📱 Usage Guide

### 🔍 Exploring Sites
- **Browse Map**: Pan and zoom to explore different regions
- **Hover Preview**: Hover over markers for quick site information
- **Click for Details**: Click markers for full site previews with Wikipedia info
- **Theme Toggle**: Switch between light, dark, and system themes

### 💾 Data Management
- **Local Storage**: All visit data automatically saved to your browser
- **Access Code**: Optional sync with GitHub Gist for shared data
- **Download Data**: Export your visits as JSON file
- **Reset Data**: Clear all visited sites when needed

### 🎯 Visual Indicators
- **🔴 Red Markers**: Unvisited sites
- **🟢 Green Markers**: Visited sites
- **📍 Clusters**: Grouped markers showing visit status
- **🔄 Sync Status**: Shows "Local Only" or "Gist Sync" in dropdown menu

## 🔧 Data Synchronization

### How It Works
1. **Default Mode**: Data stored locally in your browser
2. **Gist Sync Mode**: Enter access code to load shared data from GitHub Gist
3. **Data Export**: Download JSON file to manually update gists
4. **Access Gating**: Access codes are obfuscated (ROT13) in the source to prevent casual discovery — this is **not encryption**

### Access Code System
- Access codes are obfuscated (ROT13) before being stored in the codebase to avoid plaintext leakage via code search
- Only users with valid access codes can trigger the gist fetch in the UI
- Console logging shows obfuscated versions for debugging
- Data is read-only from gists — updates require manually editing the gist

> ⚠️ **Security note:** ROT13 is obfuscation, not encryption. Anyone viewing the source in DevTools can recover the access codes and find the gist ID. If the linked gist is public, its contents are public regardless of the access code. Treat the access code as a UX gate, not a security mechanism — do not store anything in the gist that you wouldn't publish openly.

### Data Format
Downloaded JSON includes:
```json
{
  "visitedSites": ["Site Name 1", "Site Name 2"],
  "theme": "system",
  "lastUpdated": "2025-01-11T08:00:00.000Z",
  "totalSites": 42
}
```

## 🌐 Deployment

### GitHub Pages
1. Fork the repository
2. Enable GitHub Pages in repository settings
3. Access at `https://username.github.io/repository-name`
4. No additional configuration needed

### Custom Hosting
- Upload files to any static hosting service
- Ensure HTTPS for security
- No server-side requirements

## 🔒 Privacy & Security

- **Local First**: Data stays on your device by default
- **No Registration**: Works without creating accounts
- **No Tracking**: No analytics, cookies, or external tracking scripts
- **Access Code Obfuscation**: Access codes use ROT13 in source — this is **obfuscation, not encryption**. It prevents casual discovery via code search but anyone with DevTools can recover the codes. Do not rely on it for data secrecy.
- **Open Source**: Full code transparency

## 🤝 Contributing

Contributions are welcome! This project was created as a coding exercise and learning experience.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `python3 -m http.server 8000`
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **UNESCO**: For maintaining the World Heritage Sites database
- **Leaflet.js**: For the excellent mapping library
- **GitHub**: For Gist hosting and Pages deployment
- **OpenStreetMap**: For the map tiles and data

---

**Created by [Prabhakar Gupta](https://github.com/prabhakar267)** - A vibe coding project built with Claude 3.5 Sonnet

## 🔄 Recent Updates

- **v2.0**: Replaced Firebase with GitHub Gist system for simpler data sync
- **Privacy**: Removed Google Analytics and eliminated all tracking
- **Honesty**: Replaced "encryption" claims with accurate "obfuscation" terminology
- **Optimization**: Removed dead code and optimized performance
- **Accounts**: Eliminated need for user accounts while maintaining optional sync
