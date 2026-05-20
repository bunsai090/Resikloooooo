import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, Wrench, Recycle, ArrowRight, Leaf,
  AlertCircle, Heart, PenTool, Droplets, Youtube,
  Trash2, RefreshCw, ExternalLink, Play
} from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { mockSuggestions } from '../lib/mockData';
import { fetchTutorials } from '../lib/api';

const ICON_MAP: Record<string, React.ReactNode> = {
  Sprout: <Sprout className="w-5 h-5" />,
  Leaf: <Leaf className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  PenTool: <PenTool className="w-5 h-5" />,
  Droplets: <Droplets className="w-5 h-5" />,
  Recycle: <Recycle className="w-5 h-5" />,
};

type Tutorial = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  url: string;
};

export function Analysis() {
  const location = useLocation();
  const state = location.state || {};
  const dynamicAnalysis = state.analysis;
  const image = state.imageUrl || 'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&q=80&w=800';

  const data = dynamicAnalysis || mockSuggestions.plasticBottle;

  const itemTitle = data.item
    ? (data.item.includes('·') ? data.item.split('·')[0].trim() : data.item)
    : 'Detected Item';
  const itemSubtitle = data.item && data.item.includes('·')
    ? data.item.split('·')[1].trim()
    : 'Recyclable';

  // Recycle vs Dispose toggle
  const [actionMode, setActionMode] = useState<'recycle' | 'dispose'>('recycle');

  // YouTube tutorials state
  const [recycleTutorials, setRecycleTutorials] = useState<Tutorial[]>([]);
  const [disposeTutorials, setDisposeTutorials] = useState<Tutorial[]>([]);
  const [loadingTutorials, setLoadingTutorials] = useState(false);

  useEffect(() => {
    const query = itemTitle;
    setLoadingTutorials(true);

    Promise.all([
      fetchTutorials(query, 'recycle', 3).catch(() => ({ tutorials: [] })),
      fetchTutorials(query + ' proper disposal', 'diy', 3).catch(() => ({ tutorials: [] })),
    ]).then(([recycleRes, disposeRes]) => {
      setRecycleTutorials(recycleRes.tutorials || []);
      setDisposeTutorials(disposeRes.tutorials || []);
      setLoadingTutorials(false);
    });
  }, [itemTitle]);

  const currentTutorials = actionMode === 'recycle' ? recycleTutorials : disposeTutorials;

  const disposeTips = getDisposeTips(itemTitle, itemSubtitle);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F8F5] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-border/40 pt-8 pb-6 sticky top-16 z-40">
        <div className="container flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#1B1F1D]">
                Analysis Complete
              </h1>
              {data.isFallback ? (
                <Badge className="bg-[#FFF3CD] text-[#856404] border-none font-mono uppercase tracking-wider text-[10px]">
                  Sandbox
                </Badge>
              ) : (
                <Badge className="bg-[#DCE8DD] text-[#2F6B5F] border-none font-mono uppercase tracking-wider text-[10px]">
                  AI Verified
                </Badge>
              )}
            </div>
            <p className="text-[#66706A] text-sm">
              Review recommendations before disposing of this item.
            </p>
          </div>
          <Link to="/analysis/ewaste">
            <Button variant="outline" size="sm" className="text-xs border-[#C65B4B]/30 text-[#C65B4B] hover:bg-[#C65B4B]/5 w-fit">
              <AlertCircle className="w-3 h-3 mr-2" />
              View E-Waste Demo
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            {/* Item card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-2 shadow-sm border border-border/50 overflow-hidden">
              <div className="aspect-square rounded-2xl overflow-hidden relative bg-gray-100">
                <img src={image} alt="Scanned item" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-white font-bold text-xl mb-1">{itemTitle}</h2>
                  <p className="text-white/80 text-sm font-mono">{itemSubtitle}</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div className="bg-[#F6F8F5] rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#66706A] mb-1">Condition</p>
                  <p className="font-medium text-[#1B1F1D] flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-[#2F6B5F]" /> {data.condition}
                  </p>
                </div>
                <div className="bg-[#F6F8F5] rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#66706A] mb-1">Confidence</p>
                  <p className="font-medium text-[#1B1F1D]">{data.confidence}%</p>
                </div>
              </div>
            </motion.div>

            {/* Environmental Impact */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-[#2F6B5F] text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <Leaf className="w-6 h-6 text-[#7BAE7F] mb-4" />
              <h3 className="font-bold text-lg mb-2">Environmental Impact</h3>
              <p className="text-white/80 text-sm mb-4 leading-relaxed">
                By choosing to reuse this item instead of throwing it away, you save approximately{' '}
                <strong className="text-white">{data.impact} kg of CO₂</strong> emissions.
              </p>
            </motion.div>

            {/* Action toggle */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-border/50">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#66706A] mb-3">What do you want to do?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActionMode('recycle')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    actionMode === 'recycle'
                      ? 'border-[#2F6B5F] bg-[#2F6B5F]/5 text-[#2F6B5F]'
                      : 'border-border/50 text-[#66706A] hover:border-[#2F6B5F]/30'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-sm font-bold">Recycle It</span>
                  <span className="text-[10px] text-center leading-tight opacity-70">Proper recycling steps & centers</span>
                </button>
                <button
                  onClick={() => setActionMode('dispose')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    actionMode === 'dispose'
                      ? 'border-[#C65B4B] bg-[#C65B4B]/5 text-[#C65B4B]'
                      : 'border-border/50 text-[#66706A] hover:border-[#C65B4B]/30'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-sm font-bold">Dispose It</span>
                  <span className="text-[10px] text-center leading-tight opacity-70">Safe disposal tips & guides</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-8 space-y-8">

            {/* REUSE SECTION */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#2F6B5F]/10 text-[#2F6B5F] flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h2 className="font-heading text-xl font-bold text-[#1B1F1D]">Reuse Opportunities</h2>
                <Badge variant="outline" className="ml-auto border-[#2F6B5F]/20 text-[#2F6B5F] bg-[#2F6B5F]/5">
                  Top Choice
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.reuse?.map((item: { title: string; desc: string; icon?: string }, i: number) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-border/50 hover:border-[#2F6B5F]/30 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-[#F6F8F5] text-[#2F6B5F] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {ICON_MAP[item.icon || ''] || <Sprout className="w-5 h-5" />}
                    </div>
                    <h3 className="font-bold text-[#1B1F1D] mb-1">{item.title}</h3>
                    <p className="text-[#66706A] text-sm mb-4">{item.desc}</p>
                    <div className="flex items-center text-[#2F6B5F] text-xs font-bold uppercase tracking-wider">
                      View DIY Guide <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* RECYCLE / DISPOSE SECTION — switches based on toggle */}
            <AnimatePresence mode="wait">
              {actionMode === 'recycle' ? (
                <motion.section
                  key="recycle"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#66706A]/10 text-[#66706A] flex items-center justify-center">
                      <Recycle className="w-4 h-4" />
                    </div>
                    <h2 className="font-heading text-xl font-bold text-[#1B1F1D]">Recycling Guidance</h2>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 mb-4">
                    <p className="text-[#1B1F1D] font-medium mb-4">{data.recycle}</p>
                    <Link to="/map" className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full rounded-xl">
                        Find Nearby Recycling Centers
                      </Button>
                    </Link>
                  </div>

                  {/* YouTube tutorials for recycling */}
                  <TutorialSection
                    tutorials={currentTutorials}
                    loading={loadingTutorials}
                    title="How to Recycle This"
                    accentColor="#2F6B5F"
                  />
                </motion.section>
              ) : (
                <motion.section
                  key="dispose"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#C65B4B]/10 text-[#C65B4B] flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <h2 className="font-heading text-xl font-bold text-[#1B1F1D]">Safe Disposal Guide</h2>
                    {data.hazard && (
                      <Badge className="bg-[#C65B4B]/10 text-[#C65B4B] border-[#C65B4B]/20">
                        ⚠ {data.hazard} Hazard
                      </Badge>
                    )}
                  </div>

                  {/* Disposal tips */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 mb-4 space-y-3">
                    {disposeTips.map((tip, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#C65B4B]/10 text-[#C65B4B] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                          {i + 1}
                        </div>
                        <p className="text-[#1B1F1D] text-sm leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>

                  {/* YouTube tutorials for disposal */}
                  <TutorialSection
                    tutorials={currentTutorials}
                    loading={loadingTutorials}
                    title="How to Properly Dispose This"
                    accentColor="#C65B4B"
                  />
                </motion.section>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tutorial Section Component ───────────────────────────────────────────────
function TutorialSection({
  tutorials,
  loading,
  title,
  accentColor,
}: {
  tutorials: Tutorial[];
  loading: boolean;
  title: string;
  accentColor: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Youtube className="w-4 h-4" style={{ color: accentColor }} />
        <h3 className="font-bold text-[#1B1F1D] text-sm">{title}</h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border/50 animate-pulse">
              <div className="aspect-video bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : tutorials.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tutorials.map(t => (
            <a
              key={t.id}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl overflow-hidden border border-border/50 hover:border-gray-300 transition-all group shadow-sm"
            >
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Youtube className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 text-[#1B1F1D] ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-[#1B1F1D] text-xs font-semibold line-clamp-2 mb-1 leading-snug">{t.title}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[#66706A] text-[10px] truncate">{t.channelTitle}</p>
                  <ExternalLink className="w-3 h-3 text-[#66706A] shrink-0 ml-1" />
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-border/50 text-center">
          <Youtube className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-[#66706A] text-sm">No video guides found for this item.</p>
          <a
            href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(title.toLowerCase())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#2F6B5F] font-bold mt-2 hover:underline"
          >
            Search on YouTube <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Disposal tips generator ──────────────────────────────────────────────────
function getDisposeTips(itemTitle: string, itemSubtitle: string): string[] {
  const name = (itemTitle + ' ' + itemSubtitle).toLowerCase();

  if (name.includes('phone') || name.includes('laptop') || name.includes('electronic') || name.includes('e-waste') || name.includes('battery')) {
    return [
      'Do NOT throw in regular household trash — electronics contain toxic heavy metals.',
      'Remove and separately bag any swollen or damaged batteries before transport.',
      'Wipe all personal data from the device before disposal.',
      'Bring to a certified e-waste drop-off point (SM Malls, Robinsons, or your city hall).',
      'Ask your barangay if they have scheduled e-waste collection drives.',
    ];
  }
  if (name.includes('organic') || name.includes('food') || name.includes('peel') || name.includes('banana') || name.includes('fruit')) {
    return [
      'Place in the green/biodegradable waste bin — never mix with plastics or metals.',
      'If no green bin is available, bury in soil at least 6 inches deep as natural compost.',
      'Do not dispose of large quantities in drainage — it causes blockages and odor.',
      'Check if your barangay has a composting program or community garden that accepts organic waste.',
    ];
  }
  if (name.includes('glass')) {
    return [
      'Wrap broken glass in thick newspaper or cardboard before placing in the bin.',
      'Never place loose broken glass directly in trash bags — it can injure waste collectors.',
      'Intact glass bottles can be returned to stores or dropped at glass recycling points.',
      'Label the bag "Broken Glass" so collectors are aware.',
    ];
  }
  if (name.includes('hazardous') || name.includes('chemical') || name.includes('paint') || name.includes('oil')) {
    return [
      'Never pour hazardous liquids down the drain or into the soil.',
      'Keep in original container with lid tightly sealed.',
      'Bring to a Household Hazardous Waste (HHW) collection event in your city.',
      'Contact your local DENR office for proper disposal guidance.',
    ];
  }
  if (name.includes('plastic')) {
    return [
      'Check the recycling number (1–7) on the bottom of the item.',
      'Rinse out any food or liquid residue before disposal.',
      'Flatten or crush to reduce volume in the bin.',
      'Place in the yellow/plastic recycling bin or bring to a junk shop.',
      'Avoid burning plastic — it releases toxic fumes.',
    ];
  }
  // Generic fallback
  return [
    'Separate this item from regular household waste before disposal.',
    'Check if your barangay has a scheduled waste segregation collection day.',
    'Bring to your nearest Materials Recovery Facility (MRF) for proper sorting.',
    'When in doubt, contact your local government unit (LGU) for disposal guidance.',
  ];
}
