import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const VISITED_STYLE = { fillColor: '#c47d2e', color: '#a8691f' };
const UNVISITED_STYLE = { fillColor: '#94a3b8', color: '#64748b' };
const BASE_MARKER_OPTS = { radius: 8, weight: 2, opacity: 1, fillOpacity: 0.8 };

const BOUNDARY_BASE = { weight: 2, opacity: 0.9, fillOpacity: 0.18 };
const VISITED_BOUNDARY_STYLE = { ...BOUNDARY_BASE, ...VISITED_STYLE };
const UNVISITED_BOUNDARY_STYLE = { ...BOUNDARY_BASE, ...UNVISITED_STYLE };

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

    const map = L.map(mapRef.current, {
      zoomControl: false,
      ...mapOptions,
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
      const style = visited.has(site.name) ? VISITED_STYLE : UNVISITED_STYLE;
      const marker = L.circleMarker([site.lat, site.lng], { ...BASE_MARKER_OPTS, ...style });
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
      const style = visited.has(name) ? VISITED_STYLE : UNVISITED_STYLE;
      marker.setStyle(style);
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

  // Expose zoom method
  useEffect(() => {
    window._explorerMapZoom = (lat, lng) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 8, { animate: true, duration: 1.5 });
      }
    };
    return () => { delete window._explorerMapZoom; };
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
