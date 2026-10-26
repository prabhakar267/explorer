import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Games from './pages/Games';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { ThemeProvider } from './hooks/useTheme';
import './styles/global.css';

// The tracker pages pull in Leaflet, markercluster and maplibre-gl — around a
// megabyte of JavaScript that Home has no use for. Loading them dynamically
// keeps all of it out of the entry chunk, so the landing page ships only React
// and itself. Home stays a static import: it is the first route rendered, and
// deferring it would just add a round-trip before anything appears.
// Home prefetches these same modules on hover; keep the paths in sync.
const Unesco = lazy(() => import('./pages/Unesco'));
const Parks = lazy(() => import('./pages/Parks'));

function App() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<div className="route-fallback"><div className="route-fallback-spinner" /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/unesco" element={<Unesco />} />
          <Route path="/parks" element={<Parks />} />
          <Route path="/games" element={<Games />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </StrictMode>
);
