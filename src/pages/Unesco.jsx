import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ExplorerMap from '../components/ExplorerMap';
import SiteOverlay from '../components/SiteOverlay';
import DropdownMenu from '../components/DropdownMenu';
import { useTheme } from '../hooks/useTheme';
import { useVisited } from '../hooks/useVisited';
import '../styles/explorer.css';

export default function Unesco() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewSite, setPreviewSite] = useState(null);
  const [previewDetails, setPreviewDetails] = useState(null);
  const [descVisible, setDescVisible] = useState(false);
  const [theme, setTheme] = useTheme();
  const { visited } = useVisited(import.meta.env.BASE_URL + 'data/visited-unesco.json');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/unesco-sites.json')
      .then((r) => r.json())
      .then((data) => {
        setSites(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading UNESCO sites:', err);
        setLoading(false);
      });
  }, []);

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

  const popupContent = (site) => `
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
            <DropdownMenu theme={theme} setTheme={setTheme} />
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
          onClose={() => { setPreviewSite(null); setPreviewDetails(null); }}
          onZoom={handleZoom}
          linkLabel="View on Wikipedia"
          linkUrl={previewDetails?.wikipediaUrl}
        />
      )}
    </div>
  );
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
