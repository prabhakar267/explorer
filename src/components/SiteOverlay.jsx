import { useState, useEffect, useRef } from 'react';

export default function SiteOverlay({ site, details, isVisited, onClose, onZoom, linkLabel, linkUrl }) {
  const [showing, setShowing] = useState(false);
  const [rendered, setRendered] = useState(false);
  const prevSite = useRef(null);

  useEffect(() => {
    if (site) {
      prevSite.current = site;
      setRendered(true);
      const id = setTimeout(() => setShowing(true), 10);
      return () => clearTimeout(id);
    } else {
      setShowing(false);
    }
  }, [site]);

  const handleTransitionEnd = () => {
    if (!showing && !site) {
      setRendered(false);
      prevSite.current = null;
    }
  };

  const handleClose = () => {
    setShowing(false);
    setTimeout(onClose, 300);
  };

  if (!rendered) return null;

  const displaySite = site || prevSite.current;

  return (
    <div
      className={`site-overlay ${showing ? 'show' : ''}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="overlay-header">
        <button className="back-button" onClick={handleClose} title="Go back"><i className="fa-solid fa-arrow-left"></i></button>
        <h2>{displaySite?.name}</h2>
        <button className="close-overlay" onClick={handleClose}><i className="fa-solid fa-xmark"></i></button>
      </div>
      <div className="overlay-content">
        {!details ? (
          <div className="loading-overlay">Loading site details...</div>
        ) : (
          <div className="site-details">
            {details.image && (
              <div className="site-image">
                <img
                  src={details.image}
                  alt={displaySite?.name}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {details.imageCaption && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 8px 0' }}>
                    {details.imageCaption}
                  </div>
                )}
              </div>
            )}

            <div className="info-section">
              <h3>Description</h3>
              <p>{details.description}</p>
            </div>

            <div className="info-section">
              <h3>Basic Information</h3>
              <div className="info-grid">
                {details.fields.map(({ label, value }) => (
                  <div className="info-item" key={label}>
                    <strong>{label}:</strong> {value}
                  </div>
                ))}
                <div className="info-item">
                  <strong>Coordinates:</strong>{' '}
                  <span className="coordinates-link" onClick={() => onZoom(displaySite.lat, displaySite.lng)}>
                    <i className="fa-solid fa-location-crosshairs"></i> {displaySite?.lat.toFixed(4)}, {displaySite?.lng.toFixed(4)}
                  </span>
                </div>
                <div className="info-item">
                  <strong>Status:</strong>{' '}
                  <span className={`status ${isVisited ? 'visited' : 'unvisited'}`}>
                    {isVisited ? 'Visited' : 'Not Visited'}
                  </span>
                </div>
              </div>
            </div>

            <div className="overlay-actions">
              {linkUrl && (
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="action-button wikipedia-link">
                  {linkLabel}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
