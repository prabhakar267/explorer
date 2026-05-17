import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/games.css';

export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [themeFilter, setThemeFilter] = useState('All');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/ps-games.json')
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading games:', err);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const list = themeFilter === 'All' ? games : games.filter((g) => g.themes?.includes(themeFilter));
    return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [games, themeFilter]);

  const themes = useMemo(() => {
    const counts = {};
    for (const g of games) {
      for (const t of g.themes || []) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [games]);

  return (
    <div className="games-page">
      <div className="games-header">
        <div className="games-header-content">
          <div className="games-header-text">
            <h1><i class="fa-brands fa-playstation"></i> PlayStation Games</h1>
            <span className="games-count">{games.length} played</span>
          </div>
          <div className="header-actions">
            <Link to="/" className="home-link" title="Home">
              <i className="fa-solid fa-circle-arrow-left"></i>
            </Link>
          </div>
        </div>
      </div>

      <div className="games-filters">
        <button
          className={`platform-filter ${themeFilter === 'All' ? 'active' : ''}`}
          onClick={() => setThemeFilter('All')}
        >
          All ({games.length})
        </button>
        {themes.map(([theme, count]) => (
          <button
            key={theme}
            className={`platform-filter ${themeFilter === theme ? 'active' : ''}`}
            onClick={() => setThemeFilter(theme)}
          >
            {theme} ({count})
          </button>
        ))}
      </div>

      {loading && (
        <div className="games-loading">
          <div className="spinner" />
          <div>Loading games...</div>
        </div>
      )}

      <div className="games-grid">
        {filtered.map((game) => (
          <a
            key={game.title}
            className="game-card"
            href={game.url || `https://store.playstation.com/search/${encodeURIComponent(game.title)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="game-cover">
              {game.cover ? (
                <img src={game.cover} alt={game.title} loading="lazy" />
              ) : (
                <div className="game-cover-placeholder">
                  <i className="fa-solid fa-gamepad"></i>
                </div>
              )}
            </div>
            <div className="game-info">
              <h3 className="game-title">{game.title}</h3>
              {game.developer && <div className="game-developer">{game.developer}</div>}
              <div className="game-meta">
                {game.rating && <span className="game-rating">{game.rating}/100</span>}
              </div>
              {game.themes && game.themes.length > 0 && (
                <div className="game-themes">
                  {game.themes.map((theme) => (
                    <span key={theme} className="game-theme">{theme}</span>
                  ))}
                </div>
              )}
              {game.collection && <div className="game-collection">{game.collection}</div>}
            </div>
          </a>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="games-empty">No games found for this filter.</div>
      )}
    </div>
  );
}
