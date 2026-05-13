export default function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-toggle">
      {['system', 'light', 'dark'].map((t) => (
        <button
          key={t}
          className={`theme-option ${theme === t ? 'active' : ''}`}
          onClick={() => setTheme(t)}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}
