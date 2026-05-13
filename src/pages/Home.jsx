import { Link } from 'react-router-dom';
import '../styles/home.css';

const worldMapImg = import.meta.env.BASE_URL + 'assets/molumen-world-map-1.png';

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-container">
        <header className="home-header">
          <h1>Explorer</h1>
          <p className="home-subtitle">Track visits to heritage sites, national parks, and more</p>
        </header>

        <main>
          <section className="trackers-grid">
            <div
              className="tracker-tile"
              style={{ backgroundImage: `url(${worldMapImg})`, backgroundColor: '#f0f4ff' }}
            >
              <Link to="/unesco">
                <div className="tile-overlay">
                  <h3>UNESCO World Heritage Sites</h3>
                  <p>Discover and track your visits to cultural and natural heritage sites around the world</p>
                </div>
              </Link>
            </div>

            <div
              className="tracker-tile"
              style={{ background: 'linear-gradient(135deg, #2d5016 0%, #4a7c23 50%, #1a5276 100%)' }}
            >
              <Link to="/parks">
                <div className="tile-overlay">
                  <h3>US National Parks</h3>
                  <p>Track your visits to the 63 US National Parks across the country</p>
                </div>
              </Link>
            </div>
          </section>
        </main>
      </div>

      <footer className="home-footer">
        <p>
          <a href="https://www.prabhakargupta.com/" target="_blank" rel="noopener noreferrer">Prabhakar Gupta</a>
          <span className="separator">&bull;</span>
          <a href="https://github.com/prabhakar267/explorer" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </footer>
    </div>
  );
}
