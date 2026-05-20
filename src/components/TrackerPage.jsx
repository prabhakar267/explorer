import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import ExplorerMap from './ExplorerMap';
import SiteOverlay from './SiteOverlay';
import { useVisited } from '../hooks/useVisited';
import '../styles/explorer.css';

export default function TrackerPage({
  title,
  dataUrl,
  visitedUrl,
  mapOptions,
  tileOptions,
  popupContent,
  buildOverlayDetails,
  buildLink,
  filters,
  applyFilter,
  computeStats,
  loadingLabel,
  fetchOverlayDetails,
  boundaryLoader,
}) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewSite, setPreviewSite] = useState(null);
  const [overlayDetails, setOverlayDetails] = useState(null);
  const [filterState, setFilterState] = useState(filters?.initial ?? null);
  const previewRequestId = useRef(0);
  const { visited } = useVisited(visitedUrl);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => r.json())
      .then((data) => {
        const valid = data.filter(
          (s) => typeof s.lat === 'number' && typeof s.lng === 'number' && !Number.isNaN(s.lat) && !Number.isNaN(s.lng)
        );
        setSites(valid);
        setLoading(false);
      })
      .catch((err) => {
        console.error(`Error loading ${title}:`, err);
        setLoading(false);
      });
  }, [dataUrl, title]);

  const filteredSites = applyFilter ? applyFilter(sites, filterState) : sites;

  const handlePreview = useCallback(async (siteName) => {
    const requestId = ++previewRequestId.current;
    if (!siteName) {
      setPreviewSite(null);
      setOverlayDetails(null);
      return;
    }
    const site = sites.find((s) => s.name === siteName);
    if (!site) return;
    setPreviewSite(site);
    if (fetchOverlayDetails) {
      setOverlayDetails(null);
      const enriched = await fetchOverlayDetails(site);
      if (previewRequestId.current !== requestId) return;
      setOverlayDetails(buildOverlayDetails(enriched));
      return;
    }
    setOverlayDetails(buildOverlayDetails(site));
  }, [sites, fetchOverlayDetails, buildOverlayDetails]);

  const handleZoom = (lat, lng) => {
    setPreviewSite(null);
    setOverlayDetails(null);
    window._explorerMapZoom?.(lat, lng);
  };

  const stats = computeStats(filteredSites, visited);
  const link = previewSite ? buildLink(previewSite) : null;

  return (
    <div className="explorer-page">
      <div className="explorer-header">
        <div className="explorer-header-content">
          <div className="explorer-header-text">
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            <Link to="/" className="home-link" title="Home"><i className="fa-solid fa-circle-arrow-left"></i></Link>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <div>{loadingLabel}</div>
        </div>
      )}

      <ExplorerMap
        sites={filteredSites}
        visited={visited}
        onPreview={handlePreview}
        mapOptions={mapOptions}
        tileOptions={tileOptions}
        popupContent={popupContent}
        boundaryLoader={boundaryLoader}
      />

      <div className="explorer-stats">
        {filters && (
          <div className="stats-filter">
            {filters.render(filterState, setFilterState)}
          </div>
        )}
        {stats.map(({ label, value }) => (
          <div key={label}>{label}: <span>{value}</span></div>
        ))}
      </div>

      <SiteOverlay
        site={previewSite}
        details={overlayDetails}
        isVisited={previewSite ? visited.has(previewSite.name) : false}
        onClose={() => { setPreviewSite(null); setOverlayDetails(null); }}
        onZoom={handleZoom}
        linkLabel={link?.label}
        linkUrl={link?.url}
      />
    </div>
  );
}
