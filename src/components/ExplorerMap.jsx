import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const VISITED_STYLE = { fillColor: '#27ae60', color: '#2ecc71' };
const UNVISITED_STYLE = { fillColor: '#e74c3c', color: '#c0392b' };
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
      marker.bindPopup(() => popupContent(site, visited.has(site.name)));
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

function createClusterIcon(cluster, visited) {
  const markers = cluster.getAllChildMarkers();
  const childCount = cluster.getChildCount();

  let allVisited = true;
  for (const marker of markers) {
    if (!marker.siteData?.name || !visited.has(marker.siteData.name)) {
      allVisited = false;
      break;
    }
  }

  const sizeClass = childCount < 10 ? 'marker-cluster-small' :
    childCount < 100 ? 'marker-cluster-medium' : 'marker-cluster-large';

  const colors = allVisited
    ? { background: 'rgba(39, 174, 96, 0.6)', inner: 'rgba(46, 204, 113, 0.6)' }
    : { background: 'rgba(231, 76, 60, 0.6)', inner: 'rgba(192, 57, 43, 0.6)' };

  return new L.DivIcon({
    html: `<div style="background-color: ${colors.inner}"><span>${childCount}</span></div>`,
    className: `marker-cluster ${sizeClass} ${allVisited ? 'cluster-visited' : 'cluster-unvisited'}`,
    iconSize: new L.Point(40, 40),
  });
}
