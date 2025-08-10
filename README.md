# UNESCO World Heritage Sites Explorer

A single-page web application that displays UNESCO World Heritage Sites on an interactive map, allowing users to track their visits and explore sites worldwide.

## Features

- **Interactive Map**: Full-screen map view with zoom in/out capabilities
- **Site Markers**: Visual markers for all UNESCO World Heritage Sites
- **Visit Tracking**: Mark sites as visited with persistent local storage
- **Marker Clustering**: Automatic clustering of markers when zoomed out
- **Site Information**: Detailed popups with site information including:
  - Site name and country
  - Year of inscription
  - UNESCO criteria (Cultural, Natural, or Mixed)
- **Statistics**: Real-time tracking of total sites, visited sites, and remaining sites
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with MarkerCluster plugin
- **Data Storage**: Browser localStorage for visit tracking
- **Hosting**: GitHub Pages compatible (no backend required)

## Site Data

The application loads data directly from the official UNESCO World Heritage Sites database via their public API (`https://ihp-wins.unesco.org/.../whc-sites-2025.csv`), containing 1000+ sites from around the world, covering:
- **Africa**: Pyramids of Giza, Robben Island, Cradle of Humankind, etc.
- **Asia**: Great Wall of China, Taj Mahal, Angkor, Borobudur, etc.
- **Europe**: Colosseum, Acropolis, Stonehenge, Palace of Versailles, etc.
- **Americas**: Machu Picchu, Chichen Itza, Yellowstone, Grand Canyon, etc.
- **Oceania**: Great Barrier Reef, Uluru, Sydney Opera House, etc.

The CSV data includes comprehensive information such as:
- Site names in multiple languages
- Precise coordinates (latitude/longitude)
- Inscription dates
- UNESCO criteria categories
- Country information

## Usage

1. **Viewing Sites**: The map loads with all UNESCO sites marked
2. **Navigation**: Use mouse/touch to pan and zoom the map
3. **Site Details**: Click on any marker to view site information
4. **Mark as Visited**: Click the "Mark as Visited" button in the popup
5. **Track Progress**: View your progress in the statistics panel

## Visual Indicators

- **Red Markers**: Unvisited sites
- **Green Markers**: Visited sites
- **Clustered Markers**: Multiple sites grouped together when zoomed out

## Data Persistence

Your visit tracking data is automatically saved to your browser's local storage, so your progress persists between sessions.

## Installation & Deployment

### Local Development
1. Clone or download the repository
2. Open `index.html` in a web browser
3. No build process or server required

### GitHub Pages Deployment
1. Upload files to a GitHub repository
2. Enable GitHub Pages in repository settings
3. The site will be available at `https://username.github.io/repository-name`

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is open source and available under the MIT License.
