import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Landing } from './pages/Landing';
import { Scan } from './pages/Scan';
import { Validate } from './pages/Validate';
import { Analysis } from './pages/Analysis';
import { Ewaste } from './pages/Ewaste';
import { MapPage } from './pages/MapPage';
import { Learn } from './pages/Learn';
import { About } from './pages/About';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Landing />} />
          <Route path="scan" element={<Scan />} />
          <Route path="validate" element={<Validate />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="analysis/ewaste" element={<Ewaste />} />
          <Route path="map" element={<MapPage />} />
          <Route path="learn" element={<Learn />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}