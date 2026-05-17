import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ExplorerMap from '../components/ExplorerMap';
import SiteOverlay from '../components/SiteOverlay';
import DropdownMenu from '../components/DropdownMenu';
import { useTheme } from '../hooks/useTheme';
import { useVisited } from '../hooks/useVisited';
import '../styles/explorer.css';

const CATEGORY_FILTERS = [
  { value: 'C', label: 'Cultural' },
  { value: 'N', label: 'Natural' },
];

export default function Unesco() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewSite, setPreviewSite] = useState(null);
  const [descVisible, setDescVisible] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(new Set(['C', 'N']));
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

  const filteredSites = categoryFilter.size === 2
    ? sites
    : sites.filter((s) => categoryFilter.has(s.criteria) || s.criteria === 'C/N');

  const handlePreview = useCallback((siteName) => {
    if (!siteName) {
      setPreviewSite(null);
      return;
    }
    const site = sites.find((s) => s.name === siteName);
    if (site) setPreviewSite(site);
  }, [sites]);

  const handleZoom = (lat, lng) => {
    setPreviewSite(null);
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

  const totalSites = filteredSites.length;
  const visitedCount = filteredSites.filter((s) => visited.has(s.name)).length;

  const overlayDetails = previewSite ? {
    image: previewSite.wikipedia?.image || null,
    description: previewSite.wikipedia?.description ||
      `${previewSite.name} is a UNESCO World Heritage Site located in ${previewSite.country}. It was inscribed in ${previewSite.year}.`,
    fields: [
      { label: 'Country', value: previewSite.country },
      { label: 'Year Inscribed', value: previewSite.year },
      { label: 'Criteria', value: previewSite.criteria },
    ],
  } : null;

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
        sites={filteredSites}
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
        <div className="stats-filter">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-button ${categoryFilter.has(f.value) ? 'active' : ''}`}
              onClick={() => setCategoryFilter((prev) => {
                const next = new Set(prev);
                if (next.has(f.value)) {
                  if (next.size > 1) next.delete(f.value);
                } else {
                  next.add(f.value);
                }
                return next;
              })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div>Total Sites: <span>{totalSites || 'Loading...'}</span></div>
        <div>Visited: <span>{visitedCount}</span></div>
        <div>Remaining: <span>{totalSites ? totalSites - visitedCount : 'Loading...'}</span></div>
      </div>

      <SiteOverlay
        site={previewSite}
        details={overlayDetails}
        isVisited={previewSite ? visited.has(previewSite.name) : false}
        onClose={() => setPreviewSite(null)}
        onZoom={handleZoom}
        linkLabel="View on Wikipedia"
        linkUrl={previewSite?.wikipedia?.url}
      />
    </div>
  );
}
