import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, X, AlertCircle, ScanLine,
  ImageIcon, ArrowRight, CheckCircle2, Sparkles,
  Droplets, Wine, Cylinder, Package, Leaf,
  Smartphone, Laptop, BatteryMedium, Shirt, Newspaper,
} from 'lucide-react';
import { Button } from '../components/Button';
import { uploadImage, initiateScan } from '../lib/api';

const QUICK_ITEMS = [
  { value: 'plastic_bottle', label: 'Plastic Bottle', icon: Droplets },
  { value: 'glass_bottle',   label: 'Glass Bottle',   icon: Wine },
  { value: 'aluminum_can',   label: 'Aluminum Can',   icon: Cylinder },
  { value: 'cardboard',      label: 'Cardboard',      icon: Package },
  { value: 'food_waste',     label: 'Food / Organic', icon: Leaf },
  { value: 'old_phone',      label: 'Old Phone',      icon: Smartphone },
  { value: 'old_laptop',     label: 'Laptop / PC',    icon: Laptop },
  { value: 'battery',        label: 'Battery',        icon: BatteryMedium },
  { value: 'clothing',       label: 'Clothing',       icon: Shirt },
  { value: 'newspaper',      label: 'Paper / News',   icon: Newspaper },
];

export function Scan() {
  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef  = useRef<HTMLInputElement>(null);

  const [isScanning,     setIsScanning]     = useState(false);
  const [scanComplete,   setScanComplete]   = useState(false);
  const [image,          setImage]          = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [imageBase64,    setImageBase64]    = useState<string | null>(null);
  const [needsUserInput, setNeedsUserInput] = useState(false);
  const [selectedItem,   setSelectedItem]   = useState('');
  const [customItem,     setCustomItem]     = useState('');
  const [scanResult, setScanResult] = useState<{
    scanId: string; objectType: string;
    confidence: number; isEwaste: boolean;
    needsUserInput?: boolean; questions: any[];
  } | null>(null);

  const resetState = () => {
    setImage(null); setScanComplete(false); setScanResult(null);
    setError(null); setNeedsUserInput(false);
    setSelectedItem(''); setCustomItem(''); setImageBase64(null);
  };

  const processFile = async (file: File) => {
    setError(null); setScanComplete(false); setScanResult(null);
    setNeedsUserInput(false); setSelectedItem(''); setCustomItem('');
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    setIsScanning(true);
    try {
      const sessionId = 'session_' + Math.random().toString(36).substring(2, 9);
      const uploadRes = await uploadImage(file, sessionId);
      if (!uploadRes.success) throw new Error('Upload failed');
      const fr = new FileReader();
      fr.readAsDataURL(file);
      fr.onloadend = async () => {
        const b64 = fr.result as string;
        setImageBase64(b64);
        try {
          const res = await initiateScan(uploadRes.scanId, b64);
          setScanResult({
            scanId: uploadRes.scanId, objectType: res.objectType,
            confidence: res.confidence, isEwaste: res.isEwaste,
            needsUserInput: res.needsUserInput, questions: res.questions,
          });
          setNeedsUserInput(!!res.needsUserInput);
          setIsScanning(false); setScanComplete(true);
        } catch (e: any) {
          setError(e.message || 'Analysis failed. Please try again.');
          setIsScanning(false);
        }
      };
    } catch (e: any) {
      setError(e.message || 'Upload failed. Please try again.');
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleContinue = () => {
    if (!scanResult) return;
    const finalObjectType = needsUserInput
      ? (customItem.trim() || QUICK_ITEMS.find(i => i.value === selectedItem)?.label || selectedItem || 'Unknown Item')
      : scanResult.objectType;
    navigate('/validate', {
      state: {
        scanId: scanResult.scanId, imageUrl: image, imageBase64,
        questions: scanResult.questions, objectType: finalObjectType,
        confidence: scanResult.confidence, isEwaste: scanResult.isEwaste,
        prefillAnswers: needsUserInput ? { object_name: customItem.trim() || selectedItem } : {},
      },
    });
  };

  const canContinue = scanComplete && !error && scanResult &&
    (!needsUserInput || selectedItem || customItem.trim().length > 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F8F5]">
      {/* Hidden inputs */}
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      {/* ── Page shell ── */}
      <div className="container max-w-5xl py-10 px-4 md:px-6">

        {/* ── Page header — hierarchy: eyebrow → title → subtitle ── */}
        <div className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-2">
            AI · Waste Scanner
          </p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-[#1B1F1D] leading-tight mb-2">
            Scan &amp; Analyze
          </h1>
          <p className="text-[#66706A] text-base max-w-md leading-relaxed">
            Take a photo or upload an image — RESIKLO identifies the material
            and tells you the best next step.
          </p>
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid md:grid-cols-2 gap-6 items-start">

          {/* ══ LEFT COLUMN: Input controls ══ */}
          <div className="flex flex-col gap-4">

            {/* PRIMARY and SECONDARY actions — hidden once image is loaded */}
            <AnimatePresence>
              {!image && (
                <motion.div
                  key="upload-controls"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  {/* PRIMARY action — Camera (dark, dominant) */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="block group relative w-full overflow-hidden rounded-2xl bg-[#1B1F1D] p-6 text-left
                               transition-all duration-200 hover:bg-[#2a302e] active:scale-[0.99]
                               shadow-lg shadow-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BAE7F]"
                  >
                    <div className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full bg-[#7BAE7F]/15 blur-2xl" />
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7BAE7F]/15 ring-1 ring-[#7BAE7F]/20">
                        <Camera className="h-5 w-5 text-[#7BAE7F]" />
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#7BAE7F]/50 border border-[#7BAE7F]/15 rounded-full px-2.5 py-1">
                        Live
                      </span>
                    </div>
                    <p className="relative font-heading text-lg font-semibold text-white mb-1">Open Camera</p>
                    <p className="relative text-sm text-[#9aa39d] leading-relaxed mb-5">
                      Point at any waste item and capture it directly.
                    </p>
                    <div className="relative inline-flex items-center gap-1.5 text-[#7BAE7F] text-sm font-semibold">
                      Take a photo
                      <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
                    </div>
                  </button>

                  {/* SECONDARY action — Gallery (light, subordinate) */}
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="group relative w-full overflow-hidden rounded-2xl bg-white border border-[#1B1F1D]/8 p-6 text-left
                               transition-all duration-200 hover:border-[#2F6B5F]/35 hover:shadow-md
                               shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6B5F]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F6B5F]/8 ring-1 ring-[#2F6B5F]/12">
                        <Upload className="h-5 w-5 text-[#2F6B5F]" />
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#66706A] border border-[#1B1F1D]/10 rounded-full px-2.5 py-1">
                        Gallery
                      </span>
                    </div>
                    <p className="font-heading text-lg font-semibold text-[#1B1F1D] mb-1">Upload from Gallery</p>
                    <p className="text-sm text-[#66706A] leading-relaxed mb-4">
                      Choose an existing photo from your device.
                    </p>
                    <p className="font-mono text-[10px] text-[#66706A]/50">JPG · PNG · WEBP · Max 10 MB</p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Fallback: manual item selection ── */}
            <AnimatePresence>
              {scanComplete && !error && needsUserInput && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="rounded-2xl border border-[#1B1F1D]/10 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-[#66706A] shrink-0" />
                    <p className="text-[#1B1F1D] text-sm font-semibold">AI scanner busy — select your item</p>
                  </div>
                  <p className="text-[#66706A] text-xs mb-3">What is this item?</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {QUICK_ITEMS.map(item => {
                      const Icon = item.icon;
                      const isSelected = selectedItem === item.value;
                      return (
                        <button key={item.value}
                          onClick={() => { setSelectedItem(item.value); setCustomItem(''); }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                            isSelected
                              ? 'bg-[#1B1F1D] border-[#1B1F1D] text-white'
                              : 'bg-[#F6F8F5] border-[#1B1F1D]/8 text-[#1B1F1D] hover:border-[#1B1F1D]/25 hover:bg-white'
                          }`}>
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white/70' : 'text-[#66706A]'}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <input type="text" value={customItem}
                    onChange={e => { setCustomItem(e.target.value); setSelectedItem(''); }}
                    placeholder="Or type it here (e.g. Banana peel)"
                    className="w-full bg-[#F6F8F5] border border-[#1B1F1D]/8 rounded-xl px-3 py-2.5 text-[#1B1F1D] text-sm placeholder-[#66706A]/50 focus:outline-none focus:border-[#1B1F1D]/30 transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Continue CTA — only appears when ready ── */}
            <AnimatePresence>
              {canContinue && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <button
                    onClick={handleContinue}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl
                               bg-[#2F6B5F] hover:bg-[#1B1F1D] text-white font-semibold
                               h-14 text-sm transition-colors shadow-md shadow-[#2F6B5F]/20
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6B5F]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Continue to Analysis
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Scan another — shown while image is active ── */}
            <AnimatePresence>
              {image && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button
                    onClick={resetState}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl
                               border border-[#1B1F1D]/12 bg-white hover:bg-[#F6F8F5]
                               text-[#66706A] hover:text-[#1B1F1D] font-medium
                               h-11 text-sm transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Scan another item
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ══ RIGHT COLUMN: Preview / Result ══ */}
          <div className="rounded-2xl overflow-hidden border border-[#1B1F1D]/8 bg-white shadow-sm flex flex-col min-h-[440px]">
            <AnimatePresence mode="wait">

              {/* Empty state — clear, informative, not cluttered */}
              {!image && (
                <motion.div key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-10 text-center"
                >
                  {/* Reticle frame — visual metaphor for scanning */}
                  <div className="relative mb-6">
                    <div className="h-20 w-20 rounded-2xl bg-[#F6F8F5] flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-[#66706A]/25" />
                    </div>
                    <div className="absolute -top-1.5 -left-1.5 h-5 w-5 border-t-2 border-l-2 border-[#2F6B5F]/40 rounded-tl-lg" />
                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 border-t-2 border-r-2 border-[#2F6B5F]/40 rounded-tr-lg" />
                    <div className="absolute -bottom-1.5 -left-1.5 h-5 w-5 border-b-2 border-l-2 border-[#2F6B5F]/40 rounded-bl-lg" />
                    <div className="absolute -bottom-1.5 -right-1.5 h-5 w-5 border-b-2 border-r-2 border-[#2F6B5F]/40 rounded-br-lg" />
                  </div>

                  <p className="font-heading text-base font-semibold text-[#1B1F1D] mb-1">
                    Awaiting Item
                  </p>
                  <p className="text-sm text-[#66706A] max-w-[220px] leading-relaxed mb-6">
                    Take a photo or upload an image to view the waste analysis.
                  </p>

                  {/* Supported material types — sets expectation */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Plastic', 'E-Waste', 'Paper', 'Fabric', 'Glass'].map(tag => (
                      <span key={tag}
                        className="rounded-full bg-[#F6F8F5] border border-[#1B1F1D]/8 px-3 py-1
                                   font-mono text-[10px] uppercase tracking-wider text-[#66706A]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Image preview + result */}
              {image && (
                <motion.div key="preview"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Image viewport */}
                  <div className="relative flex-1 min-h-[280px] bg-[#1B1F1D]">
                    <img src={image} alt="Scanned item"
                      className="absolute inset-0 w-full h-full object-cover opacity-90" />

                    {/* Scanning state */}
                    {isScanning && !error && (
                      <>
                        <motion.div
                          className="absolute left-0 right-0 h-0.5 bg-[#7BAE7F] shadow-[0_0_14px_rgba(123,174,127,0.9)] z-20"
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="absolute inset-0 bg-[#2F6B5F]/10 z-10" />
                        {/* Corner reticle */}
                        <div className="absolute inset-8 pointer-events-none z-20">
                          <div className="absolute top-0 left-0 h-5 w-5 border-t-2 border-l-2 border-[#7BAE7F]" />
                          <div className="absolute top-0 right-0 h-5 w-5 border-t-2 border-r-2 border-[#7BAE7F]" />
                          <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-[#7BAE7F]" />
                          <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-[#7BAE7F]" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center z-30">
                          <div className="bg-black/60 backdrop-blur-md rounded-full px-5 py-2.5 border border-white/10 flex items-center gap-2.5">
                            <ScanLine className="w-4 h-4 text-[#7BAE7F] animate-pulse" />
                            <span className="text-white font-mono text-xs tracking-widest uppercase">Analyzing…</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Error overlay */}
                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/80 z-30">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-white text-center max-w-xs">
                          <p className="font-bold text-[#C65B4B] mb-2">Analysis Failed</p>
                          <p className="text-white/75 text-sm mb-5 leading-relaxed">{error}</p>
                          <Button size="sm" onClick={resetState}
                            className="bg-[#7BAE7F] text-[#1B1F1D] font-bold rounded-full px-6">
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Dismiss button */}
                    {!isScanning && (
                      <button onClick={resetState}
                        className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full
                                   flex items-center justify-center text-white/70 hover:text-white
                                   border border-white/10 z-40 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Result strip — appears after successful scan */}
                  <AnimatePresence>
                    {scanComplete && !error && scanResult && !needsUserInput && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="p-5 border-t border-[#1B1F1D]/8 bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#2F6B5F]" />
                              <p className="font-mono text-[9px] uppercase tracking-wider text-[#66706A]">Identified</p>
                            </div>
                            <h3 className="font-heading text-lg font-semibold text-[#1B1F1D] leading-tight">
                              {scanResult.objectType}
                            </h3>
                            <p className="text-sm text-[#66706A] mt-0.5">
                              {scanResult.isEwaste ? 'Electronic Waste · Hazardous' : 'Potential Recyclable'}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-[#DCE8DD] text-[#2F6B5F] font-mono text-xs font-semibold px-3 py-1 shrink-0 ml-3">
                            {scanResult.confidence}% match
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="rounded-full border border-[#1B1F1D]/10 bg-[#F6F8F5] text-[#66706A] text-xs px-3 py-1">
                            {scanResult.isEwaste ? 'Electronic' : 'Standard'}
                          </span>
                          <span className="rounded-full border border-[#1B1F1D]/10 bg-[#F6F8F5] text-[#66706A] text-xs px-3 py-1">
                            {scanResult.isEwaste ? 'Hazardous' : 'Recyclable'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
