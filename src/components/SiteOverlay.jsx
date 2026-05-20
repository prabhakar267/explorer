import { useState, useEffect, useRef } from 'react';

export default function SiteOverlay({ site, details, isVisited, onClose, linkUrl, nextSiteName, onNext }) {
  const [showing, setShowing] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());
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

  // Filter out images whose URL already 404'd in this session. brokenUrls
  // accumulates across site changes so a given URL is never retried.
  const allImages = details?.images || [];
  const images = allImages.filter((img) => !brokenUrls.has(img.url));
  const galleryCount = images.length;
  const currentImage = galleryCount > 0 ? images[Math.min(galleryIndex, galleryCount - 1)] : null;
  const goPrev = () => setGalleryIndex((i) => (i - 1 + galleryCount) % galleryCount);
  const goNext = () => setGalleryIndex((i) => (i + 1) % galleryCount);

  const handleImageError = (url) => {
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

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
        <div className="overlay-header-row">
          <button className="back-button" onClick={handleClose} title="Go back"><i className="fa-solid fa-arrow-left"></i></button>
          <h2>
            {linkUrl ? (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="overlay-title-link">
                {details?.title || displaySite?.name}
              </a>
            ) : (
              details?.title || displaySite?.name
            )}
            {isVisited && (
              <span className="visited-badge" title="Visited">
                <i className="fa-solid fa-check"></i> Visited
              </span>
            )}
          </h2>
          <span className="overlay-header-spacer" aria-hidden="true" />
        </div>
        {nextSiteName && onNext && (
          <button type="button" className="next-site-link" onClick={onNext}>
            Next: {nextSiteName} <i className="fa-solid fa-angles-right"></i>
          </button>
        )}
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
                    onError={() => handleImageError(currentImage.url)}
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
              {details.descriptionPrefix && (
                <div className="description-prefix">{details.descriptionPrefix}</div>
              )}
              <p>{details.description}</p>
            </div>

            {details.fields && details.fields.length > 0 && (
              <div className="info-section">
                <h3>Basic Information</h3>
                <div className="info-grid">
                  {details.fields.map(({ label, value }) => (
                    <div className="info-item" key={label}>
                      <strong>{label}:</strong> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
