import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Unesco from './pages/Unesco';
import Parks from './pages/Parks';
import Games from './pages/Games';
import { useTheme } from './hooks/useTheme';
import './styles/global.css';

function App() {
  useTheme();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/unesco" element={<Unesco />} />
      <Route path="/parks" element={<Parks />} />
      <Route path="/games" element={<Games />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
