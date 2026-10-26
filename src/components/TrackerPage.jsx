import { useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ExplorerMap from './ExplorerMap';
import SiteOverlay from './SiteOverlay';
import { useVisited } from '../hooks/useVisited';
import { useJson } from '../hooks/useJson';
import '../styles/explorer.css';

const NO_SITES = [];

export default function TrackerPage({
  title,
  dataUrl,
  visitedUrl,
  mapOptions,
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
  const [previewSite, setPreviewSite] = useState(null);
  const [overlayDetails, setOverlayDetails] = useState(null);
  const [filterState, setFilterState] = useState(filters?.initial ?? null);
  const previewRequestId = useRef(0);
  const { data, error, loading } = useJson(dataUrl);
  const { visited, error: visitedError } = useVisited(visitedUrl);

  // Drop entries without usable coordinates. Memoised so ExplorerMap's
  // marker-rebuild effect (keyed on `sites`) only fires when the data changes.
  const sites = useMemo(() => {
    if (!Array.isArray(data)) return NO_SITES;
    return data.filter(
      (s) => typeof s.lat === 'number' && typeof s.lng === 'number' && !Number.isNaN(s.lat) && !Number.isNaN(s.lng)
    );
  }, [data]);

  const filteredSites = useMemo(
    () => (applyFilter ? applyFilter(sites, filterState) : sites),
    [applyFilter, sites, filterState]
  );

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
    window._explorerMapFocusSite?.(site);
    if (fetchOverlayDetails) {
      setOverlayDetails(null);
      const enriched = await fetchOverlayDetails(site);
      if (previewRequestId.current !== requestId) return;
      setOverlayDetails(buildOverlayDetails(enriched));
      return;
    }
    setOverlayDetails(buildOverlayDetails(site));
  }, [sites, fetchOverlayDetails, buildOverlayDetails]);

  const stats = computeStats(filteredSites, visited);
  const link = previewSite ? buildLink(previewSite) : null;

  // Alphabetical "next site" link inside the overlay. We navigate within
  // the currently visible (filtered) list so the link respects whatever
  // filters the user has applied. Wraps back to the first site after the
  // last one.
  let nextSite = null;
  if (previewSite && filteredSites.length > 1) {
    const idx = filteredSites.findIndex((s) => s.name === previewSite.name);
    if (idx >= 0) {
      nextSite = filteredSites[(idx + 1) % filteredSites.length];
    }
  }

  return (
    <div className={`explorer-page${previewSite ? ' overlay-open' : ''}`}>
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

      {!loading && error && (
        <div className="loading-indicator load-error" role="alert">
          <div className="load-error-title">Couldn't load {title}.</div>
          <div className="load-error-detail">Check your connection and reload the page.</div>
        </div>
      )}

      {!loading && !error && visitedError && (
        <div className="load-warning" role="status">
          Visited status couldn't be loaded; all sites are shown as not visited.
        </div>
      )}

      <ExplorerMap
        sites={filteredSites}
        visited={visited}
        onPreview={handlePreview}
        mapOptions={mapOptions}
        popupContent={popupContent}
        boundaryLoader={boundaryLoader}
      />

      {!error && (
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
      )}

      <SiteOverlay
        site={previewSite}
        details={overlayDetails}
        isVisited={previewSite ? visited.has(previewSite.name) : false}
        onClose={() => { setPreviewSite(null); setOverlayDetails(null); }}
        linkUrl={link?.url}
        nextSiteName={nextSite ? (nextSite.fullName || nextSite.name) : null}
        onNext={nextSite ? () => handlePreview(nextSite.name) : null}
      />
    </div>
  );
}
