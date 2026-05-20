import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { uploadImage, initiateScan } from '../lib/api';

const QUICK_ITEMS = [
  { value: 'plastic_bottle', label: 'Plastic Bottle', emoji: '🧴' },
  { value: 'glass_bottle', label: 'Glass Bottle', emoji: '🍶' },
  { value: 'aluminum_can', label: 'Aluminum Can', emoji: '🥤' },
  { value: 'cardboard', label: 'Cardboard', emoji: '📦' },
  { value: 'food_waste', label: 'Food / Organic', emoji: '🍌' },
  { value: 'old_phone', label: 'Old Phone', emoji: '📱' },
  { value: 'old_laptop', label: 'Laptop / PC', emoji: '💻' },
  { value: 'battery', label: 'Battery', emoji: '🔋' },
  { value: 'clothing', label: 'Clothing', emoji: '👕' },
  { value: 'newspaper', label: 'Paper / News', emoji: '📰' },
];

export function Scan() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [needsUserInput, setNeedsUserInput] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [customItem, setCustomItem] = useState<string>('');
  const [scanResult, setScanResult] = useState<{
    scanId: string;
    objectType: string;
    confidence: number;
    isEwaste: boolean;
    needsUserInput?: boolean;
    questions: any[];
  } | null>(null);

  const triggerUpload = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanComplete(false);
    setScanResult(null);
    setNeedsUserInput(false);
    setSelectedItem('');
    setCustomItem('');

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);

    setIsScanning(true);

    try {
      const sessionId = 'session_' + Math.random().toString(36).substring(2, 9);
      const uploadRes = await uploadImage(file, sessionId);
      if (!uploadRes.success) throw new Error('Upload failed');

      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onloadend = async () => {
        const base64String = fileReader.result as string;
        setImageBase64(base64String);
        try {
          const initiateRes = await initiateScan(uploadRes.scanId, base64String);
          setScanResult({
            scanId: uploadRes.scanId,
            objectType: initiateRes.objectType,
            confidence: initiateRes.confidence,
            isEwaste: initiateRes.isEwaste,
            needsUserInput: initiateRes.needsUserInput,
            questions: initiateRes.questions
          });
          setNeedsUserInput(!!initiateRes.needsUserInput);
          setIsScanning(false);
          setScanComplete(true);
        } catch (err: any) {
          setError(err.message || 'Analysis failed. Please try again.');
          setIsScanning(false);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setIsScanning(false);
    }
  };

  const handleContinue = () => {
    if (!scanResult) return;
    const finalObjectType = needsUserInput
      ? (customItem.trim() || QUICK_ITEMS.find(i => i.value === selectedItem)?.label || selectedItem || 'Unknown Item')
      : scanResult.objectType;

    navigate('/validate', {
      state: {
        scanId: scanResult.scanId,
        imageUrl: image,
        imageBase64,
        questions: scanResult.questions,
        objectType: finalObjectType,
        confidence: scanResult.confidence,
        isEwaste: scanResult.isEwaste,
        // Pass user-selected item as a pre-filled answer for the finalize step
        prefillAnswers: needsUserInput ? { object_name: customItem.trim() || selectedItem } : {}
      }
    });
  };

  const canContinue = scanComplete && !error && scanResult &&
    (!needsUserInput || selectedItem || customItem.trim().length > 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#1B1F1D] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,107,95,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-6"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="text-center mb-4">
                <h1 className="font-heading text-3xl font-bold text-white mb-2">Scan Item</h1>
                <p className="text-[#66706A]">Center the item in the frame</p>
              </div>

              <div
                onClick={triggerUpload}
                className="aspect-[3/4] w-full rounded-3xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-white/40 transition-colors"
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <Camera className="w-12 h-12 text-white/40 mb-4" />
                <p className="text-white/60 text-sm font-medium mb-8">Tap to activate camera</p>
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                  <Button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); triggerUpload(); }}
                    size="lg"
                    className="rounded-full w-16 h-16 bg-white text-[#1B1F1D] hover:bg-white/90 shadow-lg p-0 flex items-center justify-center"
                  >
                    <Camera className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={triggerUpload}
                variant="outline"
                className="w-full rounded-xl border-white/20 text-white hover:bg-white/10 h-14"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload from Gallery
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-4"
            >
              {/* Image preview */}
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-black shadow-2xl">
                <img src={image} alt="Scanned item" className="w-full h-full object-cover opacity-80" />

                {/* Error overlay */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/80 z-30">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-white max-w-sm text-center">
                      <p className="font-bold text-[#C65B4B] mb-2 text-lg">Analysis Failed</p>
                      <p className="text-white/80 text-sm mb-5">{error}</p>
                      <Button size="sm" onClick={() => { setError(null); setImage(null); }} className="bg-[#7BAE7F] text-[#1B1F1D] font-bold">
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}

                {/* Scanning animation */}
                {isScanning && !error && (
                  <>
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-[#7BAE7F] shadow-[0_0_15px_rgba(123,174,127,0.8)] z-20"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 bg-[#2F6B5F]/20 mix-blend-overlay z-10" />
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                      <div className="bg-black/50 backdrop-blur-md rounded-full px-6 py-3 border border-white/10 flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-[#7BAE7F] border-t-transparent animate-spin" />
                        <span className="text-white font-mono text-sm tracking-wider">ANALYZING...</span>
                      </div>
                    </div>
                  </>
                )}

                {/* AI success result overlay */}
                {scanComplete && !error && scanResult && !needsUserInput && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30"
                  >
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-white font-bold text-lg">{scanResult.objectType}</h3>
                          <p className="text-white/60 text-sm">{scanResult.isEwaste ? 'Electronic Waste' : 'Potential Recyclable'}</p>
                        </div>
                        <Badge className="bg-[#7BAE7F]/20 text-[#7BAE7F] border-[#7BAE7F]/30">
                          {scanResult.confidence}% Match
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">
                          {scanResult.isEwaste ? 'Electronic' : 'Standard'}
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">
                          {scanResult.isEwaste ? 'Hazardous' : 'Recyclable'}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!isScanning && (
                  <button
                    onClick={() => { setImage(null); setScanComplete(false); setScanResult(null); setError(null); setNeedsUserInput(false); }}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white border border-white/10 z-40"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Manual item selection when AI is unavailable */}
              {scanComplete && !error && needsUserInput && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-amber-400 text-sm font-medium">AI scanner busy — select your item below</p>
                  </div>

                  <p className="text-white/60 text-xs mb-3">What is this item?</p>

                  {/* Quick select grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {QUICK_ITEMS.map(item => (
                      <button
                        key={item.value}
                        onClick={() => { setSelectedItem(item.value); setCustomItem(''); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left ${
                          selectedItem === item.value
                            ? 'bg-[#7BAE7F]/20 border-[#7BAE7F] text-[#7BAE7F]'
                            : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                        }`}
                      >
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom text input */}
                  <input
                    type="text"
                    value={customItem}
                    onChange={e => { setCustomItem(e.target.value); setSelectedItem(''); }}
                    placeholder="Or type it here (e.g. Banana peel)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#7BAE7F]/50"
                  />
                </motion.div>
              )}

              {/* Continue button */}
              {canContinue && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button
                    onClick={handleContinue}
                    className="w-full rounded-xl bg-[#7BAE7F] hover:bg-[#7BAE7F]/90 text-[#1B1F1D] font-bold h-14 text-lg shadow-lg shadow-[#7BAE7F]/20"
                  >
                    Continue to Analysis
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
