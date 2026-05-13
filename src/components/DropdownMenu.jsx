import { useState, useRef, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

export default function DropdownMenu({ theme, setTheme, onReset, children }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="dropdown-menu" ref={menuRef}>
      <button className="dropdown-button" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
        &#8942;
      </button>
      <div className={`dropdown-content ${open ? 'show' : ''}`}>
        {children}
        <div className="dropdown-section">
          <span className="dropdown-label">Theme</span>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
        <div className="dropdown-divider" />
        <button className="dropdown-action" onClick={() => { onReset(); setOpen(false); }}>
          Reset All Visited
        </button>
      </div>
    </div>
  );
}
