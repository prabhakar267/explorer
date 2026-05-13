export default function SiteOverlay({ site, details, isVisited, onToggle, onClose, onZoom, linkLabel, linkUrl }) {
  if (!site) return null;

  return (
    <div className={`site-overlay ${site ? 'show' : ''}`}>
      <div className="overlay-header">
        <button className="back-button" onClick={onClose} title="Go back">&larr;</button>
        <h2>{site.name}</h2>
        <button className="close-overlay" onClick={onClose}>&times;</button>
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
                  alt={site.name}
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
                  <span className="coordinates-link" onClick={() => onZoom(site.lat, site.lng)}>
                    {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
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
              <button
                className={`action-button ${isVisited ? 'visited' : ''}`}
                onClick={() => onToggle(site.name)}
              >
                {isVisited ? '✓ Visited' : 'Mark as Visited'}
              </button>
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
