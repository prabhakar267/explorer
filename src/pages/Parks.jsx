import TrackerPage from '../components/TrackerPage';
import { escapeHtml } from '../utils/escapeHtml';

const MAP_OPTIONS = {
  worldCopyJump: true,
  center: [39.5, -98.35],
  zoom: 4,
};

const TILE_OPTIONS = {};

function popupContent(site, isVisited) {
  return `
    <div class="custom-popup">
      <div class="popup-title">${escapeHtml(site.fullName || site.name)}</div>
      <div class="popup-info">
        <span class="status ${isVisited ? 'visited' : 'unvisited'}">${isVisited ? 'Visited' : 'Not Visited'}</span>
      </div>
    </div>
  `;
}

function buildOverlayDetails(site) {
  const stateLabel = Array.isArray(site.states) && site.states.length > 1 ? 'States' : 'State';
  const stateValue = site.state || (Array.isArray(site.states) ? site.states.join(', ') : '');
  const sourceImages = Array.isArray(site.images) && site.images.length > 0
    ? site.images
    : site.image ? [site.image] : [];
  const images = sourceImages.map((img) => ({
    url: img.url,
    altText: img.altText || '',
    caption: img.caption
      ? `${img.caption}${img.credit ? ` (© ${img.credit})` : ''}`
      : null,
  }));
  return {
    title: site.fullName || site.name,
    images,
    description: site.description || `${site.name} National Park.`,
    fields: [
      { label: stateLabel, value: stateValue },
    ],
  };
}

function buildLink(site) {
  return site.url ? { label: 'View on nps.gov', url: site.url } : null;
}

const BOUNDARIES_BASE = import.meta.env.BASE_URL + 'data/park-boundaries/';

async function loadParkBoundary(site) {
  if (!site?.parkCode) return null;
  const res = await fetch(`${BOUNDARIES_BASE}${site.parkCode}.json`);
  if (!res.ok) return null;
  return res.json();
}

function computeStats(sites, visited) {
  const total = sites.length;
  return [
    { label: 'Total Parks', value: total || 'Loading...' },
    { label: 'Visited', value: visited.size },
    { label: 'Remaining', value: total ? total - visited.size : 'Loading...' },
  ];
}

export default function Parks() {
  return (
    <TrackerPage
      title="US National Parks"
      dataUrl={import.meta.env.BASE_URL + 'data/us-parks.json'}
      visitedUrl={import.meta.env.BASE_URL + 'data/visited-parks.json'}
      mapOptions={MAP_OPTIONS}
      tileOptions={TILE_OPTIONS}
      popupContent={popupContent}
      buildOverlayDetails={buildOverlayDetails}
      buildLink={buildLink}
      computeStats={computeStats}
      loadingLabel="Loading US National Parks..."
      boundaryLoader={loadParkBoundary}
    />
  );
}
