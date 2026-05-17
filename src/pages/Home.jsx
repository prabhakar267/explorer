import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import '../styles/home.css';


export default function Home() {
  const [theme, setTheme] = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Explorer</h1>
        <p className="home-subtitle">My personal travel tracker</p>
      </header>

      <main>
        <section className="trackers-grid">
          <div
            className="tracker-tile"
            style={{ backgroundImage: 'url(https://live.staticflickr.com/5048/5250912829_e288600226_b.jpg)' }}
          >
            <Link to="/unesco">
              <div className="tile-overlay">
                <h3>UNESCO World Heritage Sites</h3>
                <p>Cultural and natural heritage sites I've visited around the world</p>
              </div>
            </Link>
          </div>

          <div
            className="tracker-tile"
            style={{ backgroundImage: 'url(https://capitolreefresort.com/wp-content/uploads/2020/01/CRNP-sunset-stock-750x375.jpg)' }}
          >
            <Link to="/parks">
              <div className="tile-overlay">
                <h3>US National Parks</h3>
                <p>The 63 US National Parks I've explored</p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-content">
          <p>
            <a href="https://www.prabhakargupta.com/" target="_blank" rel="noopener noreferrer">Prabhakar Gupta</a>
          </p>
          <div className="settings-popover" ref={settingsRef}>
            <button
              className="settings-button"
              onClick={(e) => { e.stopPropagation(); setSettingsOpen(!settingsOpen); }}
            >
              <i className="fa-solid fa-gear"></i>
            </button>
            {settingsOpen && (
              <div className="settings-bubble">
                <span className="settings-label">Theme</span>
                <ThemeToggle theme={theme} setTheme={setTheme} />
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
