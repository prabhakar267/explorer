import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Unesco from './pages/Unesco';
import Parks from './pages/Parks';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/unesco" element={<Unesco />} />
        <Route path="/parks" element={<Parks />} />
      </Routes>
    </HashRouter>
  </StrictMode>
);
