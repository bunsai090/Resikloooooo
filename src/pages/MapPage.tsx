import React, { useState, useEffect, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Clock, Search,
  Loader2, AlertCircle, RefreshCw, ExternalLink, Zap,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { ScrollArea } from '../components/ScrollArea';
import 'mapbox-gl/dist/mapbox-gl.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};
const MAPBOX_TOKEN: string = env.VITE_MAPBOX_TOKEN ?? '';
const API_BASE: string = env.VITE_API_BASE_URL ?? 'http://localhost:5000';

// ── Zamboanga City — locked center & bounds ──────────────────────────────────
const ZAMBOANGA_CENTER = { lat: 6.9214, lng: 122.0790 };
const ZAMBOANGA_BOUNDS: [[number, number], [number, number]] = [
  [121.8500, 6.7500], // SW
  [122.2500, 7.1000], // NE
];

type Facility = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance: number;
  address: string;
  verified: boolean;
  accepted_waste: string[];
  hours?: string;
  notes?: string;
};

// Pill color for e-waste type
const EWASTE_COLOR = '#C65B4B';

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function MapPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewState, setViewState] = useState({
    longitude: ZAMBOANGA_CENTER.lng,
    latitude: ZAMBOANGA_CENTER.lat,
    zoom: 13,
  });

  // Always fetch Zamboanga e-waste facilities — no user location needed
  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: ZAMBOANGA_CENTER.lat.toString(),
        lng: ZAMBOANGA_CENTER.lng.toString(),
        radius: '30',
        type: 'ewaste',
        city: 'zamboanga',
      });
      const res = await fetch(`${API_BASE}/api/facilities?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setFacilities(data.facilities || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load facilities';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const filteredFacilities = facilities.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.address.toLowerCase().includes(q) ||
      f.accepted_waste?.some((w) => w.toLowerCase().includes(q))
    );
  });

  function openDirections(facility: Facility) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function flyTo(facility: Facility) {
    setSelectedFacility(facility);
    setViewState((v) => ({
      ...v,
      longitude: facility.longitude,
      latitude: facility.latitude,
      zoom: 15,
    }));
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#F6F8F5] overflow-hidden relative">

      {/* ── MAP — full screen on mobile, flex-1 on desktop ── */}
      <div className="absolute inset-0 md:relative md:flex-1 md:h-full order-2 md:order-1">
        {!MAPBOX_TOKEN ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#E8EAE6]">
            <div className="text-center p-6">
              <AlertCircle className="w-10 h-10 text-[#C65B4B] mx-auto mb-3" />
              <p className="font-bold text-[#1B1F1D]">Mapbox token not configured</p>
              <p className="text-sm text-[#66706A] mt-1">Add VITE_MAPBOX_TOKEN to your .env file</p>
            </div>
          </div>
        ) : (
          <Map
            {...viewState}
            onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: '100%', height: '100%' }}
            maxBounds={ZAMBOANGA_BOUNDS}
            onClick={() => setSelectedFacility(null)}
          >
            <NavigationControl position="top-right" />
            <GeolocateControl
              position="top-right"
              trackUserLocation
              showUserHeading
              showAccuracyCircle
            />

            {/* E-waste markers */}
            {filteredFacilities.map((facility) => (
              <Marker
                key={facility.id}
                longitude={facility.longitude}
                latitude={facility.latitude}
                anchor="bottom"
                onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
                  e.originalEvent.stopPropagation();
                  flyTo(facility);
                }}
              >
                <div
                  className="cursor-pointer transition-transform hover:scale-110"
                  style={{
                    filter: selectedFacility?.id === facility.id
                      ? 'drop-shadow(0 0 8px rgba(198,91,75,0.6))'
                      : undefined,
                  }}
                  onClick={(e) => { e.stopPropagation(); flyTo(facility); }}
                >
                  {/* Pulse ring on selected */}
                  {selectedFacility?.id === facility.id && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-[#C65B4B]/30" />
                  )}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg relative"
                    style={{ backgroundColor: EWASTE_COLOR }}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
              </Marker>
            ))}

            {/* Popup */}
            {selectedFacility && (
              <Popup
                longitude={selectedFacility.longitude}
                latitude={selectedFacility.latitude}
                anchor="top"
                onClose={() => setSelectedFacility(null)}
                closeButton
                closeOnClick={false}
                maxWidth="280px"
              >
                <div className="p-1">
                  <div className="flex items-start gap-2 mb-1">
                    <p className="font-bold text-[#1B1F1D] text-sm leading-tight flex-1">
                      {selectedFacility.name}
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full text-white shrink-0 bg-[#C65B4B]">
                      E-Waste
                    </span>
                  </div>
                  <p className="text-[#66706A] text-xs mb-1">{selectedFacility.address}</p>
                  {selectedFacility.hours && (
                    <p className="text-[10px] text-[#66706A] mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {selectedFacility.hours}
                    </p>
                  )}
                  {selectedFacility.notes && (
                    <p className="text-[10px] text-[#2F6B5F] bg-[#2F6B5F]/8 rounded-md px-2 py-1 mb-2 leading-relaxed">
                      {selectedFacility.notes}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedFacility.accepted_waste?.slice(0, 4).map((w) => (
                      <span key={w} className="text-[10px] bg-[#F6F8F5] text-[#66706A] px-1.5 py-0.5 rounded-md capitalize">
                        {w}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => openDirections(selectedFacility)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2 rounded-lg bg-[#C65B4B] hover:bg-[#b54e3f] transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    Get Directions
                  </button>
                </div>
              </Popup>
            )}
          </Map>
        )}

        {/* City label — sits above the bottom sheet on mobile */}
        <div className="absolute bottom-[53%] md:bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow text-xs font-bold text-[#1B1F1D] flex items-center gap-1.5 pointer-events-none">
          <MapPin className="w-3 h-3 text-[#C65B4B]" />
          Zamboanga City, Philippines
        </div>

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-medium text-[#1B1F1D] z-10">
            <Loader2 className="w-4 h-4 animate-spin text-[#C65B4B]" />
            Loading drop-off points…
          </div>
        )}
      </div>

      {/* ── SIDEBAR / BOTTOM SHEET ── */}
      <div className="
        absolute bottom-0 left-0 right-0 h-[52%]
        md:relative md:h-full md:w-[400px] lg:w-[440px]
        bg-white border-t md:border-t-0 md:border-l border-[#1B1F1D]/8
        flex flex-col order-1 md:order-2 z-20
        rounded-t-3xl md:rounded-none
        shadow-[0_-8px_30px_rgba(0,0,0,0.08)] md:shadow-[-10px_0_30px_rgba(0,0,0,0.02)]
      ">
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-[#1B1F1D]/15 rounded-full mx-auto mt-3 md:hidden" />

        {/* Header */}
        <div className="px-4 pt-3 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-[#1B1F1D]/8 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C65B4B]/10">
                <Zap className="w-3.5 h-3.5 text-[#C65B4B]" />
              </div>
              <div>
                <h1 className="font-heading text-base font-bold text-[#1B1F1D] leading-none">E-Waste Drop-offs</h1>
                <p className="text-[10px] text-[#66706A] mt-0.5">Zamboanga City · {filteredFacilities.length} locations</p>
              </div>
            </div>
            <button onClick={fetchFacilities} className="p-2 rounded-xl hover:bg-[#F6F8F5] transition-colors text-[#66706A]" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#66706A]" />
            <Input
              placeholder="Search by name or accepted items…"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#F6F8F5] border-transparent focus-visible:ring-[#C65B4B] rounded-xl h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-3 md:px-5 md:py-4">
          <div className="space-y-2.5 pb-20 md:pb-4">

            {/* Error */}
            {error && (
              <div className="bg-[#C65B4B]/5 border border-[#C65B4B]/20 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-[#C65B4B] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#C65B4B]">Could not load facilities</p>
                  <p className="text-xs text-[#66706A] mt-0.5">{error}</p>
                  <p className="text-xs text-[#66706A] mt-1">Make sure the server is running on port 5000.</p>
                </div>
              </div>
            )}

            {/* Skeletons */}
            {loading && facilities.length === 0 && (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-[#1B1F1D]/8 rounded-2xl p-4 animate-pulse">
                    <div className="flex justify-between mb-3">
                      <div className="h-3.5 bg-[#1B1F1D]/5 rounded w-2/3" />
                      <div className="h-3.5 bg-[#1B1F1D]/5 rounded w-12" />
                    </div>
                    <div className="h-3 bg-[#1B1F1D]/5 rounded w-3/4 mb-2" />
                    <div className="h-8 bg-[#1B1F1D]/5 rounded-xl mt-3" />
                  </div>
                ))}
              </>
            )}

            {/* Empty */}
            {!loading && !error && filteredFacilities.length === 0 && (
              <div className="text-center py-10">
                <Zap className="w-8 h-8 text-[#1B1F1D]/10 mx-auto mb-3" />
                <p className="font-semibold text-[#1B1F1D] text-sm">No drop-off points found</p>
                <p className="text-xs text-[#66706A] mt-1">
                  {searchQuery ? 'Try a different search term.' : 'Make sure the server is running.'}
                </p>
              </div>
            )}

            {/* Cards */}
            <AnimatePresence>
              {filteredFacilities.map((facility, i) => (
                <motion.div
                  key={facility.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => flyTo(facility)}
                  className={`bg-white border rounded-2xl p-4 cursor-pointer transition-all group ${
                    selectedFacility?.id === facility.id
                      ? 'border-[#C65B4B] shadow-md ring-1 ring-[#C65B4B]/20'
                      : 'border-[#1B1F1D]/8 hover:border-[#C65B4B]/30 hover:shadow-sm'
                  }`}
                >
                  {/* Name + distance */}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#1B1F1D] group-hover:text-[#C65B4B] transition-colors text-sm leading-snug pr-2">
                      {facility.name}
                    </h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-mono text-[#66706A] bg-[#F6F8F5] px-2 py-0.5 rounded-md">
                        {formatDistance(facility.distance)}
                      </span>
                      {facility.verified && (
                        <span className="text-[9px] font-mono text-[#2F6B5F] bg-[#2F6B5F]/10 px-1.5 py-0.5 rounded-full">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <p className="text-xs text-[#66706A] mb-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-[#C65B4B]" />
                    {facility.address}
                  </p>

                  {/* Hours */}
                  {facility.hours && (
                    <div className="flex items-center gap-1.5 text-xs text-[#66706A] mb-2">
                      <Clock className="w-3 h-3" />
                      {facility.hours}
                    </div>
                  )}

                  {/* Notes */}
                  {facility.notes && (
                    <p className="text-[10px] text-[#2F6B5F] bg-[#2F6B5F]/5 rounded-lg px-2 py-1.5 mb-3 leading-relaxed">
                      ℹ️ {facility.notes}
                    </p>
                  )}

                  {/* Accepted waste tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white bg-[#C65B4B]">
                      E-Waste
                    </span>
                    {facility.accepted_waste?.slice(0, 3).map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="text-[10px] bg-[#F6F8F5] border-transparent text-[#66706A] capitalize"
                      >
                        {item}
                      </Badge>
                    ))}
                    {(facility.accepted_waste?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-[10px] bg-[#F6F8F5] border-transparent text-[#66706A]">
                        +{facility.accepted_waste.length - 3} more
                      </Badge>
                    )}
                  </div>

                  {/* Directions button */}
                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-sm h-9 border-[#C65B4B]/20 text-[#C65B4B] hover:bg-[#C65B4B]/5 hover:border-[#C65B4B]/40"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      openDirections(facility);
                    }}
                  >
                    <Navigation className="w-3.5 h-3.5 mr-2" />
                    Get Directions
                    <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Count */}
            {!loading && filteredFacilities.length > 0 && (
              <p className="text-center text-xs text-[#66706A] py-2">
                {filteredFacilities.length} e-waste drop-off point{filteredFacilities.length !== 1 ? 's' : ''} in Zamboanga City
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
