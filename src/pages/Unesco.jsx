import TrackerPage from '../components/TrackerPage';
import { escapeHtml } from '../utils/escapeHtml';

const CATEGORY_FILTERS = [
  { value: 'C', label: 'Cultural' },
  { value: 'N', label: 'Natural' },
];

const MAP_OPTIONS = {
  worldCopyJump: true,
  maxBounds: [[-90, -Infinity], [90, Infinity]],
  center: [20, 0],
  zoom: 3,
};

const TILE_OPTIONS = { noWrap: false };

let wikiCache = null;
let wikiPromise = null;

function loadWiki() {
  if (wikiCache) return Promise.resolve(wikiCache);
  if (wikiPromise) return wikiPromise;
  wikiPromise = fetch(import.meta.env.BASE_URL + 'data/unesco-wiki.json')
    .then((r) => r.json())
    .then((data) => { wikiCache = data; return data; })
    .catch((err) => { console.error('Error loading UNESCO wiki:', err); wikiPromise = null; return {}; });
  return wikiPromise;
}

function popupContent(site) {
  return `
    <div class="custom-popup">
      <div class="popup-title">${escapeHtml(site.name)}</div>
      <div class="popup-info">
        <strong>Country:</strong> ${escapeHtml(site.country)}<br>
        <strong>Year Inscribed:</strong> ${escapeHtml(site.year)}<br>
        <strong>Criteria:</strong> ${escapeHtml(site.criteria)}
      </div>
    </div>
  `;
}

function applyFilter(sites, filterSet) {
  if (!filterSet || filterSet.size === 2) return sites;
  return sites.filter((s) => filterSet.has(s.criteria) || s.criteria === 'C/N');
}

function renderFilters(filterSet, setFilterSet) {
  return CATEGORY_FILTERS.map((f) => (
    <button
      key={f.value}
      className={`filter-button ${filterSet.has(f.value) ? 'active' : ''}`}
      onClick={() => setFilterSet((prev) => {
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
  ));
}

function buildOverlayDetails(site) {
  return {
    image: site.wikipedia?.image || null,
    description: site.wikipedia?.description ||
      `${site.name} is a UNESCO World Heritage Site located in ${site.country}. It was inscribed in ${site.year}.`,
    fields: [
      { label: 'Country', value: site.country },
      { label: 'Year Inscribed', value: site.year },
      { label: 'Criteria', value: site.criteria },
    ],
  };
}

function buildLink(site) {
  return site.wikipedia?.url ? { label: 'View on Wikipedia', url: site.wikipedia.url } : null;
}

function computeStats(filteredSites, visited) {
  const total = filteredSites.length;
  const visitedCount = filteredSites.filter((s) => visited.has(s.name)).length;
  return [
    { label: 'Total Sites', value: total || 'Loading...' },
    { label: 'Visited', value: visitedCount },
    { label: 'Remaining', value: total ? total - visitedCount : 'Loading...' },
  ];
}

async function fetchOverlayDetails(site) {
  const wiki = await loadWiki();
  return { ...site, wikipedia: wiki[site.name] || site.wikipedia };
}

export default function Unesco() {
  return (
    <TrackerPage
      title="UNESCO World Heritage Sites"
      dataUrl={import.meta.env.BASE_URL + 'data/unesco-sites.json'}
      visitedUrl={import.meta.env.BASE_URL + 'data/visited-unesco.json'}
      mapOptions={MAP_OPTIONS}
      tileOptions={TILE_OPTIONS}
      popupContent={popupContent}
      buildOverlayDetails={buildOverlayDetails}
      buildLink={buildLink}
      filters={{ initial: new Set(['C', 'N']), render: renderFilters }}
      applyFilter={applyFilter}
      computeStats={computeStats}
      loadingLabel="Loading UNESCO World Heritage Sites..."
      fetchOverlayDetails={fetchOverlayDetails}
    />
  );
}
