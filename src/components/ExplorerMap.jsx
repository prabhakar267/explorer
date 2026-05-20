import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const VISITED_STYLE = { fillColor: '#c47d2e', color: '#a8691f' };
const UNVISITED_STYLE = { fillColor: '#94a3b8', color: '#64748b' };
const BASE_MARKER_OPTS = { radius: 8, weight: 2, opacity: 1, fillOpacity: 0.8 };

export default function ExplorerMap({
  sites,
  visited,
  onPreview,
  mapOptions,
  tileOptions,
  popupContent,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterRef = useRef(null);
  const markersRef = useRef(new Map());
  const visitedRef = useRef(visited);
  visitedRef.current = visited;

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

    mapInstanceRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      clusterRef.current = null;
      markersRef.current = new Map();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create/update markers when sites change
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster || sites.length === 0) return;

    cluster.clearLayers();
    markersRef.current.clear();

    let popupHoverTimeout = null;

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
        clearTimeout(popupHoverTimeout);
        e.layer.openPopup();
      }
    });

    cluster.on('mouseout', (e) => {
      if (e.layer?.siteData) {
        popupHoverTimeout = setTimeout(() => e.layer.closePopup(), 300);
      }
    });

    cluster.on('popupopen', (e) => {
      const el = e.popup.getElement();
      if (!el) return;
      el.addEventListener('mouseenter', () => clearTimeout(popupHoverTimeout));
      el.addEventListener('mouseleave', () => {
        popupHoverTimeout = setTimeout(() => e.popup._source?.closePopup(), 100);
      });
    });
  }, [sites]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker styles when visited state changes
  useEffect(() => {
    markersRef.current.forEach((marker, name) => {
      const style = visited.has(name) ? VISITED_STYLE : UNVISITED_STYLE;
      marker.setStyle(style);
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
