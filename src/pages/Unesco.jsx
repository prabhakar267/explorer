import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ExplorerMap from '../components/ExplorerMap';
import SiteOverlay from '../components/SiteOverlay';
import DropdownMenu from '../components/DropdownMenu';
import { useTheme } from '../hooks/useTheme';
import { useVisited } from '../hooks/useVisited';
import { loadGistData, showAccessCodeDialog, downloadData } from '../utils/gistDataManager';
import '../styles/explorer.css';

export default function Unesco() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewSite, setPreviewSite] = useState(null);
  const [previewDetails, setPreviewDetails] = useState(null);
  const [descVisible, setDescVisible] = useState(false);
  const [theme, setTheme] = useTheme();
  const { visited, toggle, resetAll, loadFromArray } = useVisited('visitedUNESCOSites');

  useEffect(() => {
    fetchSites().then((data) => {
      setSites(data);
      setLoading(false);
    });
  }, []);

  // Attempt to load from gist
  useEffect(() => {
    loadGistData().then((arr) => {
      if (arr && arr.length > 0) loadFromArray(arr);
    });
  }, [loadFromArray]);

  const handlePreview = useCallback(async (siteName) => {
    if (!siteName) {
      setPreviewSite(null);
      setPreviewDetails(null);
      return;
    }
    const site = sites.find((s) => s.name === siteName);
    if (!site) return;
    setPreviewSite(site);
    setPreviewDetails(null);

    const details = await fetchSiteDetails(site);
    setPreviewDetails(details);
  }, [sites]);

  const handleZoom = (lat, lng) => {
    setPreviewSite(null);
    setPreviewDetails(null);
    window._explorerMapZoom?.(lat, lng);
  };

  const popupContent = (site, isVisited) => `
    <div class="custom-popup">
      <div class="popup-title">${site.name}</div>
      <div class="popup-info">
        <strong>Country:</strong> ${site.country}<br>
        <strong>Year Inscribed:</strong> ${site.year}<br>
        <strong>Criteria:</strong> ${site.criteria}
      </div>
    </div>
  `;

  const totalSites = sites.length;
  const visitedCount = visited.size;

  return (
    <div className="explorer-page">
      <div className="explorer-header">
        <div className="explorer-header-content">
          <div className="explorer-header-text">
            <h1 onClick={() => setDescVisible(!descVisible)}>UNESCO World Heritage Sites Explorer</h1>
            {descVisible && (
              <p>
                Discover and track your visits to UNESCO World Heritage Sites around the world.<br />
                A vibe coding project by Prabhakar Gupta.{' '}
                <a href="https://github.com/prabhakar267/explorer" target="_blank" rel="noopener noreferrer">View Source Code</a>
              </p>
            )}
          </div>
          <div className="header-actions">
            <Link to="/" className="home-link">&larr; Home</Link>
            <DropdownMenu theme={theme} setTheme={setTheme} onReset={resetAll}>
              <div className="dropdown-section">
                <span className="dropdown-label">Data Sync</span>
                <div className="sync-status">
                  <span className="sync-indicator">&#9679;</span>
                  <span className="sync-text">Local Only</span>
                </div>
                <button className="auth-button" onClick={showAccessCodeDialog} style={{ marginTop: 8 }}>
                  Enter Access Code
                </button>
                <button className="auth-button secondary" onClick={downloadData} style={{ marginTop: 4 }}>
                  Download Data
                </button>
              </div>
              <div className="dropdown-divider" />
            </DropdownMenu>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <div>Loading UNESCO World Heritage Sites...</div>
        </div>
      )}

      <ExplorerMap
        sites={sites}
        visited={visited}
        onToggle={toggle}
        onPreview={handlePreview}
        mapOptions={{
          worldCopyJump: true,
          maxBounds: [[-90, -Infinity], [90, Infinity]],
          center: [20, 0],
          zoom: 3,
        }}
        tileOptions={{ noWrap: false }}
        popupContent={popupContent}
      />

      <div className="explorer-stats">
        <div>Total Sites: <span>{totalSites || 'Loading...'}</span></div>
        <div>Visited: <span>{visitedCount}</span></div>
        <div>Remaining: <span>{totalSites ? totalSites - visitedCount : 'Loading...'}</span></div>
      </div>

      {previewSite && (
        <SiteOverlay
          site={previewSite}
          details={previewDetails ? {
            image: previewDetails.image,
            description: previewDetails.description,
            fields: [
              { label: 'Country', value: previewSite.country },
              { label: 'Year Inscribed', value: previewSite.year },
              { label: 'Criteria', value: previewSite.criteria },
            ],
          } : null}
          isVisited={visited.has(previewSite.name)}
          onToggle={toggle}
          onClose={() => { setPreviewSite(null); setPreviewDetails(null); }}
          onZoom={handleZoom}
          linkLabel="View on Wikipedia"
          linkUrl={previewDetails?.wikipediaUrl}
        />
      )}
    </div>
  );
}

async function fetchSites() {
  const response = await fetch(
    'https://ihp-wins.unesco.org/dataset/88c8eff6-b94d-4826-bb13-7107ac4c02a9/resource/2f46f6b2-45f9-402b-ace9-1e02c9c97a3d/download/whc-sites-2025.csv'
  );
  const csvText = await response.text();
  return parseCSV(csvText);
}

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const sites = [];

  const nameIndex = headers.indexOf('name_en');
  const countryIndex = headers.indexOf('states_name_en');
  const latIndex = headers.indexOf('latitude');
  const lngIndex = headers.indexOf('longitude');
  const yearIndex = headers.indexOf('date_inscribed');
  const categoryIndex = headers.indexOf('category_short');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);

    if (fields.length > Math.max(nameIndex, countryIndex, latIndex, lngIndex, yearIndex, categoryIndex)) {
      const lat = parseFloat(fields[latIndex]);
      const lng = parseFloat(fields[lngIndex]);
      if (isNaN(lat) || isNaN(lng)) continue;

      sites.push({
        name: fields[nameIndex] || 'Unknown Site',
        country: fields[countryIndex] || 'Unknown Country',
        lat,
        lng,
        year: parseInt(fields[yearIndex]) || 'Unknown',
        criteria: fields[categoryIndex] || 'Unknown',
      });
    }
  }
  return sites;
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function fetchSiteDetails(site) {
  const searchQuery = encodeURIComponent(site.name + ' UNESCO World Heritage Site');
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${searchQuery}`);
    if (response.ok) {
      const data = await response.json();
      return {
        description: data.extract || 'No description available.',
        image: data.thumbnail?.source || null,
        wikipediaUrl: data.content_urls?.desktop?.page || null,
      };
    }
  } catch { /* fall through */ }

  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(site.name)}`);
    if (response.ok) {
      const data = await response.json();
      return {
        description: data.extract || 'No description available.',
        image: data.thumbnail?.source || null,
        wikipediaUrl: data.content_urls?.desktop?.page || null,
      };
    }
  } catch { /* fall through */ }

  return {
    description: `${site.name} is a UNESCO World Heritage Site located in ${site.country}. It was inscribed in ${site.year} under the criteria: ${site.criteria}.`,
    image: null,
    wikipediaUrl: null,
  };
}
