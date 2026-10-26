import { createContext, useContext, useState, useEffect } from 'react';

// One theme state for the whole app. Previously App and Home each called a
// standalone useTheme(), giving two independent copies: picking "dark" on Home
// left App's copy believing the theme was still "system", so App's
// prefers-color-scheme listener would reapply the OS theme on the next OS
// switch and clobber the explicit choice.
const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      document.documentElement.setAttribute('data-theme', resolved);
    };
    apply();
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage unavailable (private mode, blocked): theme still applies for
      // this page load, it just won't persist.
    }

    if (theme !== 'system') return undefined;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
