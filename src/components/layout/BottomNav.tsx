import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, ScanLine } from 'lucide-react';

export function BottomNav() {
  const location = useLocation();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[#1B1F1D]/8 bg-white pb-safe">
      <div className="flex h-16 items-center justify-between px-10">

        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${
            location.pathname === '/' ? 'text-[#2F6B5F]' : 'text-[#66706A]'
          }`}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Scan — center, elevated */}
        <div className="relative -top-4">
          <Link
            to="/scan"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1B1F1D] text-white shadow-lg shadow-black/20 ring-4 ring-white transition-transform active:scale-95 hover:bg-[#2F6B5F]">
            <ScanLine className="h-6 w-6" />
          </Link>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[#66706A] whitespace-nowrap">
            Scan
          </span>
        </div>

        {/* Map */}
        <Link
          to="/map"
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${
            location.pathname.includes('/map') ? 'text-[#2F6B5F]' : 'text-[#66706A]'
          }`}>
          <Map className="h-5 w-5" />
          <span className="text-[10px] font-medium">Map</span>
        </Link>

      </div>
    </div>
  );
}