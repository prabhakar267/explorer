import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const VISITED_STYLE = { fillColor: '#c47d2e', color: '#a8691f' };
const UNVISITED_STYLE = { fillColor: '#94a3b8', color: '#64748b' };

const BOUNDARY_BASE = { weight: 2, opacity: 0.9, fillOpacity: 0.18 };
const VISITED_BOUNDARY_STYLE = { ...BOUNDARY_BASE, ...VISITED_STYLE };
const UNVISITED_BOUNDARY_STYLE = { ...BOUNDARY_BASE, ...UNVISITED_STYLE };

// Dots are rendered as L.marker with a divIcon (DOM element in the marker
// pane) instead of L.circleMarker. The marker pane is only translated
// during zoom animations, never scaled, so the dot stays a fixed pixel
// size as the map zooms — circleMarkers, which live in the SVG/canvas
// overlay pane, visibly grow under flyTo animations.
const DOT_DIAMETER = 16;
function dotIcon(isVisited) {
  const { fillColor, color } = isVisited ? VISITED_STYLE : UNVISITED_STYLE;
  const html = `<span class="park-dot" style="background:${fillColor};border-color:${color};"></span>`;
  return L.divIcon({
    html,
    className: 'park-dot-wrapper',
    iconSize: [DOT_DIAMETER, DOT_DIAMETER],
    iconAnchor: [DOT_DIAMETER / 2, DOT_DIAMETER / 2],
  });
}

export default function ExplorerMap({
  sites,
  visited,
  onPreview,
  mapOptions,
  tileOptions,
  popupContent,
  boundaryLoader,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterRef = useRef(null);
  const markersRef = useRef(new Map());
  const boundaryLayersRef = useRef(new Map()); // site.name -> L.GeoJSON layer
  const boundaryCacheRef = useRef(new Map()); // site.name -> Promise<geojson | null>
  const boundaryLoaderRef = useRef(boundaryLoader);
  boundaryLoaderRef.current = boundaryLoader;
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;
  const popupHoverTimeoutRef = useRef(null);
  const visitedRef = useRef(visited);
  visitedRef.current = visited;

  const syncBoundaries = useCallback(() => {
    const map = mapInstanceRef.current;
    const cluster = clusterRef.current;
    const loader = boundaryLoaderRef.current;
    if (!map || !cluster || !loader) return;

    const layers = boundaryLayersRef.current;
    const cache = boundaryCacheRef.current;

    // markercluster keeps directly-rendered markers in its internal
    // _featureGroup; markers inside a cluster are not in that group. This
    // works for any marker type (circleMarker, etc.) — unlike checking
    // marker._icon, which only exists on HTML icon markers.
    const featureGroup = cluster._featureGroup;
    const wantedNames = new Set();
    let unclusteredCount = 0;

    markersRef.current.forEach((marker, name) => {
      if (!featureGroup?.hasLayer(marker)) return;
      unclusteredCount++;
      wantedNames.add(name);

      if (layers.has(name)) return;

      if (!cache.has(name)) {
        cache.set(
          name,
          Promise.resolve(loader(marker.siteData)).catch((err) => {
            console.error(`Failed to load boundary for ${name}:`, err);
            return null;
          })
        );
      }

      cache.get(name).then((geojson) => {
        if (!geojson) return;
        const currentMap = mapInstanceRef.current;
        const currentCluster = clusterRef.current;
        const currentMarker = markersRef.current.get(name);
        if (!currentMap || !currentCluster || !currentMarker) return;
        if (!currentCluster._featureGroup?.hasLayer(currentMarker)) return;
        if (layers.has(name)) return;

        const isVisited = visitedRef.current.has(name);
        const layer = L.geoJSON(geojson, {
          style: isVisited ? VISITED_BOUNDARY_STYLE : UNVISITED_BOUNDARY_STYLE,
        });

        // Make the polygon behave like the marker: hover opens the
        // marker's popup, click triggers the preview overlay. Stopping
        // propagation prevents the map's background click handler from
        // immediately closing the overlay we just opened.
        layer.on('mouseover', () => {
          clearTimeout(popupHoverTimeoutRef.current);
          currentMarker.openPopup();
        });
        layer.on('mouseout', () => {
          popupHoverTimeoutRef.current = setTimeout(
            () => currentMarker.closePopup(),
            300
          );
        });
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onPreviewRef.current?.(name);
        });

        layer.addTo(currentMap);
        layers.set(name, layer);
      });
    });

    if (typeof window !== 'undefined' && window._explorerBoundaryDebug) {
      console.log(`[boundaries] sync: ${unclusteredCount} unclustered, ${layers.size} layers drawn`);
    }

    layers.forEach((layer, name) => {
      if (!wantedNames.has(name)) {
        layer.remove();
        layers.delete(name);
      }
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const mobileZoomAdjust = window.innerWidth <= 768 && mapOptions.zoom != null ? -1 : 0;
    const map = L.map(mapRef.current, {
      zoomControl: false,
      ...mapOptions,
      zoom: (mapOptions.zoom || 3) + mobileZoomAdjust,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
      maxZoom: 18,
      subdomains: 'abcd',
      ...tileOptions,
    }).addTo(map);

    const cluster = new L.MarkerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c) => createClusterIcon(c, visited),
    });

    map.addLayer(cluster);
    map.on('click', () => onPreview(null));

    // Re-evaluate which markers are unclustered after every zoom/pan/cluster
    // animation so we can show or hide their boundary polygons accordingly.
    // animationend fires after cluster zoom animations; moveend covers pans
    // and the final settled zoom; zoomend is a belt-and-suspenders fallback
    // for the no-animation path.
    cluster.on('animationend', syncBoundaries);
    map.on('moveend', syncBoundaries);
    map.on('zoomend', syncBoundaries);

    mapInstanceRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      clusterRef.current = null;
      markersRef.current = new Map();
      boundaryLayersRef.current = new Map();
      boundaryCacheRef.current = new Map();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create/update markers when sites change
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster || sites.length === 0) return;

    cluster.clearLayers();
    markersRef.current.clear();

    sites.forEach((site) => {
      const isVisited = visited.has(site.name);
      const marker = L.marker([site.lat, site.lng], { icon: dotIcon(isVisited) });
      marker.siteData = site;
      marker.bindPopup(() => popupContent(site, visitedRef.current.has(site.name)), { closeButton: false });
      markersRef.current.set(site.name, marker);
      cluster.addLayer(marker);
    });

    // Event delegation on the cluster group
    cluster.off('click mouseover mouseout popupopen');

    cluster.on('click', (e) => {
      const site = e.layer?.siteData;
      if (site) {
        e.originalEvent?.stopPropagation?.();
        onPreview(site.name);
      }
    });

    cluster.on('mouseover', (e) => {
      if (e.layer?.siteData) {
        clearTimeout(popupHoverTimeoutRef.current);
        e.layer.openPopup();
      }
    });

    cluster.on('mouseout', (e) => {
      if (e.layer?.siteData) {
        popupHoverTimeoutRef.current = setTimeout(() => e.layer.closePopup(), 300);
      }
    });

    cluster.on('popupopen', (e) => {
      const el = e.popup.getElement();
      if (!el) return;
      el.addEventListener('mouseenter', () => clearTimeout(popupHoverTimeoutRef.current));
      el.addEventListener('mouseleave', () => {
        popupHoverTimeoutRef.current = setTimeout(() => e.popup._source?.closePopup(), 100);
      });
    });

    syncBoundaries();
  }, [sites]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker styles when visited state changes
  useEffect(() => {
    markersRef.current.forEach((marker, name) => {
      marker.setIcon(dotIcon(visited.has(name)));
    });
    boundaryLayersRef.current.forEach((layer, name) => {
      const style = visited.has(name) ? VISITED_BOUNDARY_STYLE : UNVISITED_BOUNDARY_STYLE;
      layer.setStyle(style);
    });
    if (clusterRef.current) {
      clusterRef.current.options.iconCreateFunction = (c) => createClusterIcon(c, visited);
      clusterRef.current.refreshClusters();
    }
  }, [visited]);

  // Expose an imperative focus method. Given a site, fly to its boundary
  // polygon if we have one (so the entire polygon fits the visible map
  // area), otherwise fall back to a fixed zoom centred on the site's
  // coords. Padding accounts for the side overlay that covers ~40% of the
  // screen on the right.
  useEffect(() => {
    const isMobile = () => window.innerWidth <= 768;

    window._explorerMapFocusSite = async (site) => {
      const map = mapInstanceRef.current;
      if (!map || !site) return;

      const mobile = isMobile();
      const mapSize = map.getSize();

      // On desktop, overlay is 40% width on the right.
      // On mobile, overlay is 70% height from the bottom.
      const fitOpts = {
        animate: true,
        duration: 1.0,
        paddingTopLeft: [20, 20],
        paddingBottomRight: mobile
          ? [20, Math.round(mapSize.y * 0.6) + 20]
          : [Math.round(mapSize.x * 0.4) + 20, 20],
        maxZoom: 12,
      };

      const loader = boundaryLoaderRef.current;
      if (loader) {
        const cache = boundaryCacheRef.current;
        if (!cache.has(site.name)) {
          cache.set(
            site.name,
            Promise.resolve(loader(site)).catch(() => null)
          );
        }
        const geojson = await cache.get(site.name);
        if (geojson) {
          const bounds = L.geoJSON(geojson).getBounds();
          if (bounds.isValid()) {
            map.flyToBounds(bounds, fitOpts);
            return;
          }
        }
      }

      const targetZoom = mobile ? 6 : 8;
      const sitePoint = map.project([site.lat, site.lng], targetZoom);
      if (mobile) {
        // Bottom sheet = 60% of viewport. Visible strip = top 40%.
        // Place the site at the vertical center of the visible strip.
        const sheetFraction = 0.6;
        const visibleCenterY = (mapSize.y * (1 - sheetFraction)) / 2;
        const mapCenterY = mapSize.y / 2;
        const offsetY = mapCenterY - visibleCenterY;
        const adjusted = map.unproject(
          [sitePoint.x, sitePoint.y + offsetY],
          targetZoom
        );
        map.flyTo(adjusted, targetZoom, { animate: true, duration: 1.0 });
      } else {
        const offsetX = mapSize.x * 0.2;
        const adjusted = map.unproject(
          [sitePoint.x + offsetX, sitePoint.y],
          targetZoom
        );
        map.flyTo(adjusted, targetZoom, { animate: true, duration: 1.0 });
      }
    };

    return () => {
      delete window._explorerMapFocusSite;
    };
  }, []);

  return <div ref={mapRef} className="explorer-map" />;
}

function lerpColor(r1, g1, b1, r2, g2, b2, t) {
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ];
}

function createClusterIcon(cluster, visited) {
  const markers = cluster.getAllChildMarkers();
  const childCount = cluster.getChildCount();

  let visitedCount = 0;
  for (const marker of markers) {
    if (marker.siteData?.name && visited.has(marker.siteData.name)) {
      visitedCount++;
    }
  }

  const ratio = childCount > 0 ? visitedCount / childCount : 0;

  // Blend from gray (0%) to amber (100%)
  const [r, g, b] = lerpColor(148, 163, 184, 196, 125, 46, ratio);
  const [ri, gi, bi] = lerpColor(100, 116, 139, 168, 105, 31, ratio);

  const size = childCount < 10 ? 36 : childCount < 100 ? 44 : 52;
  const innerSize = size - 10;
  const fontSize = childCount < 10 ? 12 : childCount < 100 ? 13 : 14;

  return new L.DivIcon({
    html: `<div style="background-color: rgba(${r}, ${g}, ${b}, 0.6); width: ${size}px; height: ${size}px; border-radius: ${size / 2}px; display: flex; align-items: center; justify-content: center;"><div style="background-color: rgba(${ri}, ${gi}, ${bi}, 0.7); width: ${innerSize}px; height: ${innerSize}px; border-radius: ${innerSize / 2}px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-weight: bold; font-size: ${fontSize}px;">${childCount}</span></div></div>`,
    className: 'marker-cluster-custom',
    iconSize: new L.Point(size, size),
  });
}
