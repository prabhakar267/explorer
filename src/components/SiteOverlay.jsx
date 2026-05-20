import { useState, useEffect, useRef } from 'react';

export default function SiteOverlay({ site, details, isVisited, onClose, onZoom, linkLabel, linkUrl }) {
  const [showing, setShowing] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const prevSite = useRef(null);

  useEffect(() => {
    if (site) {
      prevSite.current = site;
      setRendered(true);
      setGalleryIndex(0);
      const id = setTimeout(() => setShowing(true), 10);
      return () => clearTimeout(id);
    } else {
      setShowing(false);
    }
  }, [site]);

  // Reset to the first image whenever a new set of images loads (e.g. when
  // fetchOverlayDetails resolves after the site is shown).
  useEffect(() => {
    setGalleryIndex(0);
  }, [details?.images]);

  const images = details?.images || [];
  const galleryCount = images.length;
  const currentImage = galleryCount > 0 ? images[Math.min(galleryIndex, galleryCount - 1)] : null;
  const goPrev = () => setGalleryIndex((i) => (i - 1 + galleryCount) % galleryCount);
  const goNext = () => setGalleryIndex((i) => (i + 1) % galleryCount);

  // Arrow keys navigate the gallery while the overlay is open.
  useEffect(() => {
    if (!showing || galleryCount <= 1) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showing, galleryCount]);

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
        <h2>{details?.title || displaySite?.name}</h2>
        <span className="overlay-header-spacer" aria-hidden="true" />
      </div>
      <div className="overlay-content">
        {!details ? (
          <div className="loading-overlay">Loading site details...</div>
        ) : (
          <div className="site-details">
            {currentImage && (
              <div className="site-gallery">
                <div className="gallery-frame">
                  <img
                    key={currentImage.url}
                    src={currentImage.url}
                    alt={currentImage.altText || displaySite?.name}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {galleryCount > 1 && (
                    <>
                      <button
                        type="button"
                        className="gallery-nav gallery-nav-prev"
                        onClick={goPrev}
                        aria-label="Previous image"
                      >
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                      <button
                        type="button"
                        className="gallery-nav gallery-nav-next"
                        onClick={goNext}
                        aria-label="Next image"
                      >
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                      <div className="gallery-counter">
                        {galleryIndex + 1} / {galleryCount}
                      </div>
                    </>
                  )}
                </div>
                {galleryCount > 1 && (
                  <div className="gallery-dots" role="tablist" aria-label="Gallery navigation">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === galleryIndex}
                        aria-label={`Go to image ${i + 1}`}
                        className={`gallery-dot ${i === galleryIndex ? 'active' : ''}`}
                        onClick={() => setGalleryIndex(i)}
                      />
                    ))}
                  </div>
                )}
                {currentImage.caption && (
                  <div className="gallery-caption">{currentImage.caption}</div>
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
