import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ExplorerMap from '../components/ExplorerMap';
import SiteOverlay from '../components/SiteOverlay';
import DropdownMenu from '../components/DropdownMenu';
import { useTheme } from '../hooks/useTheme';
import { useVisited } from '../hooks/useVisited';
import '../styles/explorer.css';

const MAX_BOUNDS = [[-16, -180], [72, -64]];
const INITIAL_CENTER = [39.5, -98.35];
const INITIAL_ZOOM = 4;

export default function Parks() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewSite, setPreviewSite] = useState(null);
  const [descVisible, setDescVisible] = useState(false);
  const [theme, setTheme] = useTheme();
  const { visited } = useVisited(import.meta.env.BASE_URL + 'data/visited-parks.json');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/us-parks.json')
      .then((r) => r.json())
      .then((parks) => {
        const valid = parks.filter(
          (p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !Number.isNaN(p.lat) && !Number.isNaN(p.lng)
        );
        setSites(valid);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading parks:', err);
        setLoading(false);
      });
  }, []);

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

  const popupContent = (site) => {
    const stateLabel = Array.isArray(site.states) && site.states.length > 1 ? 'States' : 'State';
    const stateValue = site.state || (Array.isArray(site.states) ? site.states.join(', ') : '');
    return `
      <div class="custom-popup">
        <div class="popup-title">${escapeHtml(site.name)}</div>
        <div class="popup-info">
          <strong>${stateLabel}:</strong> ${escapeHtml(stateValue)}<br>
          <strong>Designation:</strong> ${escapeHtml(site.designation || 'National Park')}
        </div>
      </div>
    `;
  };

  const totalSites = sites.length;
  const visitedCount = visited.size;

  const overlayDetails = previewSite ? {
    image: previewSite.image?.url || null,
    imageCaption: previewSite.image?.caption
      ? `${previewSite.image.caption}${previewSite.image.credit ? ` (© ${previewSite.image.credit})` : ''}`
      : null,
    description: previewSite.description || `${previewSite.name} National Park.`,
    fields: [
      { label: 'Full Name', value: previewSite.fullName || previewSite.name },
      { label: Array.isArray(previewSite.states) && previewSite.states.length > 1 ? 'States' : 'State', value: previewSite.state || (Array.isArray(previewSite.states) ? previewSite.states.join(', ') : '') },
      { label: 'Designation', value: previewSite.designation || 'National Park' },
      { label: 'Park Code', value: previewSite.parkCode || '—' },
    ],
  } : null;

  return (
    <div className="explorer-page">
      <div className="explorer-header">
        <div className="explorer-header-content">
          <div className="explorer-header-text">
            <h1 onClick={() => setDescVisible(!descVisible)}>US National Parks Explorer</h1>
            {descVisible && (
              <p>
                Discover and track your visits to the 63 US National Parks.<br />
                A companion to the <Link to="/unesco" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>UNESCO Sites</Link> explorer.{' '}
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
          <div>Loading US National Parks...</div>
        </div>
      )}

      <ExplorerMap
        sites={sites}
        visited={visited}
        onPreview={handlePreview}
        mapOptions={{
          worldCopyJump: false,
          maxBounds: MAX_BOUNDS,
          maxBoundsViscosity: 1.0,
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM,
        }}
        tileOptions={{ noWrap: true }}
        popupContent={popupContent}
      />

      <div className="explorer-stats">
        <div>Total Parks: <span>{totalSites || 'Loading...'}</span></div>
        <div>Visited: <span>{visitedCount}</span></div>
        <div>Remaining: <span>{totalSites ? totalSites - visitedCount : 'Loading...'}</span></div>
      </div>

      <SiteOverlay
        site={previewSite}
        details={overlayDetails}
        isVisited={previewSite ? visited.has(previewSite.name) : false}
        onClose={() => setPreviewSite(null)}
        onZoom={handleZoom}
        linkLabel="View on nps.gov"
        linkUrl={previewSite?.url}
      />
    </div>
  );
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
