import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, Wrench, Recycle, Leaf,
  Heart, PenTool, Droplets,
  Trash2, RefreshCw, ExternalLink, Play,
  Youtube, MapPin, Zap, CheckCircle2,
  AlertTriangle, Info, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { mockSuggestions } from '../lib/mockData';
import { fetchTutorials } from '../lib/api';

const ICON_MAP: Record<string, React.ReactNode> = {
  Sprout:   <Sprout   className="w-4 h-4" />,
  Leaf:     <Leaf     className="w-4 h-4" />,
  Wrench:   <Wrench   className="w-4 h-4" />,
  Heart:    <Heart    className="w-4 h-4" />,
  PenTool:  <PenTool  className="w-4 h-4" />,
  Droplets: <Droplets className="w-4 h-4" />,
  Recycle:  <Recycle  className="w-4 h-4" />,
};

type Tutorial = {
  id: string; title: string; description: string;
  thumbnailUrl: string; channelTitle: string; url: string;
};

// ─── AI-driven decision tips based on item analysis ──────────────────────────
function getDecisionTips(itemTitle: string, itemSubtitle: string, condition: string, isEwaste: boolean) {
  const name = (itemTitle + ' ' + itemSubtitle + ' ' + condition).toLowerCase();
  const cond = (condition || '').toLowerCase();

  const recyclePros: string[] = [];
  const recycleCons: string[] = [];
  const disposePros: string[] = [];
  const disposeCons: string[] = [];
  let recommendation: 'recycle' | 'dispose' = 'recycle';
  let recommendationReason = '';

  if (isEwaste || name.includes('battery') || name.includes('electronic')) {
    recommendation = 'dispose';
    recommendationReason = 'This item contains hazardous materials that cannot go in regular recycling bins. Safe e-waste disposal is the responsible choice.';
    recyclePros.push('Some components (metals, plastics) can be recovered by certified facilities');
    recycleCons.push('Cannot be placed in regular recycling bins — will contaminate the stream');
    recycleCons.push('Requires a certified e-waste recycler, not a standard drop-off');
    disposePros.push('Certified e-waste centers safely extract toxic materials like lead and mercury');
    disposePros.push('Prevents soil and water contamination from battery leakage');
    disposePros.push('Many SM Malls and LGU offices have free e-waste drop-off bins');
    disposeCons.push('Requires a trip to a certified collection point');
  } else if (cond === 'broken' || cond === 'poor') {
    recommendation = 'dispose';
    recommendationReason = 'The item is in poor or broken condition. Recycling is still possible but requires proper preparation. Disposal may be more practical.';
    recyclePros.push('Material can still be recovered even if the item is broken');
    recyclePros.push('Reduces landfill volume and saves raw materials');
    recycleCons.push('Broken items may contaminate recycling if not cleaned properly');
    recycleCons.push('Some facilities reject heavily damaged items');
    disposePros.push('Straightforward — no preparation needed beyond basic sorting');
    disposePros.push('Broken items are less likely to be rejected at disposal sites');
    disposeCons.push('Adds to landfill volume — recycling is still the better environmental choice if possible');
  } else if (name.includes('plastic') || name.includes('pet') || name.includes('hdpe')) {
    recommendation = 'recycle';
    recommendationReason = 'This plastic item is in recyclable condition. Recycling saves significantly more CO₂ than disposal and keeps plastic out of landfills.';
    recyclePros.push('PET and HDPE plastics are widely accepted at recycling centers');
    recyclePros.push('Recycling one plastic bottle saves enough energy to power a light bulb for 6 hours');
    recyclePros.push('Reduces demand for virgin plastic production');
    recycleCons.push('Must be rinsed clean — food residue contaminates the recycling stream');
    recycleCons.push('Caps may need to be removed depending on your local facility');
    disposePros.push('Simpler if no recycling facility is nearby');
    disposeCons.push('Plastic takes 400–1000 years to decompose in a landfill');
    disposeCons.push('Contributes to microplastic pollution in soil and water');
  } else if (name.includes('glass')) {
    recommendation = 'recycle';
    recommendationReason = 'Glass is 100% recyclable and can be recycled endlessly without quality loss. Recycling is strongly preferred over disposal.';
    recyclePros.push('Glass can be recycled indefinitely without losing purity');
    recyclePros.push('Recycling glass uses 40% less energy than making new glass');
    recycleCons.push('Broken glass must be wrapped before transport to protect collectors');
    recycleCons.push('Not all facilities accept mixed-color glass — check your local rules');
    disposePros.push('Only practical if the glass is heavily contaminated or mixed with hazardous material');
    disposeCons.push('Glass in landfills does not decompose — it stays there permanently');
  } else if (name.includes('paper') || name.includes('cardboard')) {
    recommendation = 'recycle';
    recommendationReason = 'Paper and cardboard are among the easiest and most impactful materials to recycle. Recycling is almost always the right choice.';
    recyclePros.push('Paper recycling saves 17 trees per ton of paper recycled');
    recyclePros.push('Cardboard is accepted at virtually every recycling facility');
    recyclePros.push('Reduces methane emissions from paper decomposing in landfills');
    recycleCons.push('Wet or food-soiled paper cannot be recycled — it must be composted or disposed');
    disposePros.push('Only if the paper is heavily soiled with food or grease');
    disposeCons.push('Paper in landfills produces methane, a greenhouse gas 25x more potent than CO₂');
  } else {
    recommendation = 'recycle';
    recommendationReason = 'Based on the item\'s condition and material, recycling is the recommended first step. Check your local facility for accepted materials.';
    recyclePros.push('Keeps material out of landfills and recovers usable resources');
    recyclePros.push('Reduces the environmental cost of producing new materials');
    recycleCons.push('Requires proper sorting and preparation before drop-off');
    disposePros.push('Simpler if no recycling option is available nearby');
    disposeCons.push('Disposal should always be the last resort after recycling options are exhausted');
  }

  return { recommendation, recommendationReason, recyclePros, recycleCons, disposePros, disposeCons };
}

export function Analysis() {
  const location  = useLocation();
  const state     = location.state || {};
  const dynamicAnalysis = state.analysis;
  const image = state.imageUrl ||
    'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&q=80&w=800';

  const data = dynamicAnalysis || mockSuggestions.plasticBottle;

  const itemTitle = data.item
    ? (data.item.includes('·') ? data.item.split('·')[0].trim() : data.item)
    : 'Detected Item';
  const itemSubtitle = data.item && data.item.includes('·')
    ? data.item.split('·')[1].trim() : 'Recyclable';

  const tips = getDecisionTips(itemTitle, itemSubtitle, data.condition || '', !!data.isEwaste);

  // Default tab to AI recommendation
  const [actionMode, setActionMode] = useState<'recycle' | 'dispose'>(tips.recommendation);
  const [recycleTutorials, setRecycleTutorials] = useState<Tutorial[]>([]);
  const [disposeTutorials, setDisposeTutorials] = useState<Tutorial[]>([]);
  const [loadingTutorials, setLoadingTutorials] = useState(false);

  useEffect(() => {
    setLoadingTutorials(true);
    const recycleQuery = `${itemTitle} recycling`;
    const disposeQuery = `${itemTitle} proper disposal`;
    Promise.all([
      fetchTutorials(recycleQuery, 'recycle', 3).catch(() => ({ tutorials: [] })),
      fetchTutorials(disposeQuery, 'diy', 3).catch(() => ({ tutorials: [] })),
    ]).then(([r, d]) => {
      setRecycleTutorials((r as any).tutorials || []);
      setDisposeTutorials((d as any).tutorials || []);
      setLoadingTutorials(false);
    });
  }, [itemTitle]);

  const currentTutorials = actionMode === 'recycle' ? recycleTutorials : disposeTutorials;
  const disposeTips = getDisposeTips(itemTitle, itemSubtitle);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F8F5]">
      <div className="container py-6 px-4 md:px-6 max-w-6xl">

        {/* Top bar */}
        <div className="flex items-center gap-3 mb-5">
          <h1 className="font-heading text-2xl font-semibold text-[#1B1F1D]">Analysis Complete</h1>
          {data.isFallback ? (
            <span className="rounded-full bg-amber-100 text-amber-700 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1">Sandbox</span>
          ) : (
            <span className="rounded-full bg-[#DCE8DD] text-[#2F6B5F] font-mono text-[10px] uppercase tracking-wider px-2.5 py-1">AI Verified</span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Image card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl overflow-hidden relative shadow-md border border-[#1B1F1D]/8 flex-shrink-0"
              style={{ aspectRatio: '4/3' }}>
              <img src={image} alt="Scanned item" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2 className="text-white font-heading font-bold text-lg leading-tight mb-0.5">{itemTitle}</h2>
                <p className="text-white/70 text-xs font-mono">{itemSubtitle}</p>
                <div className="flex gap-2 mt-2.5">
                  <span className="rounded-full bg-white/15 backdrop-blur border border-white/20 text-white text-[10px] font-mono px-2.5 py-1">{data.condition}</span>
                  <span className="rounded-full bg-[#7BAE7F]/30 backdrop-blur border border-[#7BAE7F]/30 text-white text-[10px] font-mono px-2.5 py-1">{data.confidence}% match</span>
                </div>
              </div>
            </motion.div>

            {/* Environmental impact */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="rounded-3xl bg-[#2F6B5F] p-5 relative overflow-hidden shadow-sm">
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[#7BAE7F]" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#7BAE7F]">Environmental Impact</p>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Choosing to reuse saves approximately{' '}
                <strong className="text-white">{data.impact} kg of CO₂</strong> emissions.
              </p>
            </motion.div>

            {/* AI Recommendation tip */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className={`rounded-3xl p-4 border ${
                tips.recommendation === 'recycle'
                  ? 'bg-[#2F6B5F]/8 border-[#2F6B5F]/20'
                  : 'bg-[#C65B4B]/8 border-[#C65B4B]/20'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <Info className={`w-4 h-4 ${tips.recommendation === 'recycle' ? 'text-[#2F6B5F]' : 'text-[#C65B4B]'}`} />
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#66706A]">AI Recommendation</p>
              </div>
              <p className={`text-sm font-semibold mb-1 ${tips.recommendation === 'recycle' ? 'text-[#2F6B5F]' : 'text-[#C65B4B]'}`}>
                {tips.recommendation === 'recycle' ? '♻ Recycle this item' : '🗑 Dispose this item safely'}
              </p>
              <p className="text-xs text-[#66706A] leading-relaxed">{tips.recommendationReason}</p>
            </motion.div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* Reuse opportunities */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="rounded-3xl bg-white border border-[#1B1F1D]/8 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#2F6B5F]/10 text-[#2F6B5F]">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-heading text-base font-semibold text-[#1B1F1D]">Reuse Opportunities</h2>
                <span className="ml-auto rounded-full bg-[#DCE8DD] text-[#2F6B5F] font-mono text-[10px] px-2.5 py-0.5">Top Choice</span>
              </div>
              {data.reuse?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {data.reuse.map((item: { title: string; desc: string; icon?: string }, i: number) => (
                    <div key={i} className="rounded-2xl bg-[#F6F8F5] border border-[#1B1F1D]/5 p-4 hover:border-[#2F6B5F]/25 transition-colors group">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#1B1F1D]/8 text-[#2F6B5F] mb-3 group-hover:scale-105 transition-transform shadow-sm">
                        {ICON_MAP[item.icon || ''] || <Sprout className="w-4 h-4" />}
                      </div>
                      <p className="font-semibold text-[#1B1F1D] text-sm mb-1">{item.title}</p>
                      <p className="text-[#66706A] text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#66706A] text-sm">No reuse options available for this item.</p>
              )}
            </motion.section>

            {/* Tabbed Recycle / Dispose */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-3xl bg-white border border-[#1B1F1D]/8 shadow-sm overflow-hidden">

              {/* Tab bar */}
              <div className="flex border-b border-[#1B1F1D]/8">
                <button
                  onClick={() => setActionMode('recycle')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all relative ${
                    actionMode === 'recycle'
                      ? 'text-[#2F6B5F] bg-[#2F6B5F]/4'
                      : 'text-[#66706A] hover:text-[#1B1F1D] hover:bg-[#F6F8F5]'
                  }`}
                >
                  <Recycle className="w-4 h-4" />
                  Recycle It
                  {tips.recommendation === 'recycle' && (
                    <span className="ml-1 rounded-full bg-[#2F6B5F] text-white font-mono text-[9px] px-1.5 py-0.5">Recommended</span>
                  )}
                  {actionMode === 'recycle' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6B5F]" />
                  )}
                </button>
                <button
                  onClick={() => setActionMode('dispose')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all relative ${
                    actionMode === 'dispose'
                      ? 'text-[#C65B4B] bg-[#C65B4B]/4'
                      : 'text-[#66706A] hover:text-[#1B1F1D] hover:bg-[#F6F8F5]'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Dispose It
                  {tips.recommendation === 'dispose' && (
                    <span className="ml-1 rounded-full bg-[#C65B4B] text-white font-mono text-[9px] px-1.5 py-0.5">Recommended</span>
                  )}
                  {actionMode === 'dispose' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C65B4B]" />
                  )}
                </button>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {actionMode === 'recycle' ? (
                  <motion.div key="recycle"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                    className="p-5 flex flex-col gap-4">

                    {/* Why recycle — pros/cons */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#2F6B5F]/6 border border-[#2F6B5F]/15 p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <ThumbsUp className="w-3.5 h-3.5 text-[#2F6B5F]" />
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#2F6B5F]">Why recycle</p>
                        </div>
                        <ul className="space-y-2">
                          {tips.recyclePros.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#1B1F1D]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B5F] shrink-0 mt-0.5" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl bg-[#1B1F1D]/4 border border-[#1B1F1D]/8 p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#66706A]" />
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#66706A]">Watch out for</p>
                        </div>
                        <ul className="space-y-2">
                          {tips.recycleCons.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#66706A]">
                              <span className="w-3.5 h-3.5 shrink-0 mt-0.5 text-center font-bold text-[#66706A]">!</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recycling instructions */}
                    <div className="rounded-2xl bg-[#F6F8F5] border border-[#1B1F1D]/5 p-4">
                      <p className="text-[#1B1F1D] text-sm leading-relaxed mb-3">{data.recycle}</p>
                      <Link to="/map">
                        <div className="rounded-2xl border border-[#2F6B5F]/20 bg-[#2F6B5F]/5 p-4 flex items-center gap-4 hover:bg-[#2F6B5F]/10 transition-colors cursor-pointer group mt-3">
                          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#2F6B5F]/15 text-[#2F6B5F] group-hover:scale-105 transition-transform">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1B1F1D] text-sm">Find Nearby Recycling Centers</p>
                            <p className="text-xs text-[#66706A] mt-0.5">View verified drop-off points and e-waste facilities near you</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-[#2F6B5F] shrink-0" />
                        </div>
                      </Link>
                    </div>

                    <TutorialSection tutorials={currentTutorials} loading={loadingTutorials}
                      title={`How to recycle ${itemTitle}`} accentColor="#2F6B5F" />
                  </motion.div>
                ) : (
                  <motion.div key="dispose"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                    className="p-5 flex flex-col gap-4">

                    {/* Why dispose — pros/cons */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#C65B4B]/6 border border-[#C65B4B]/15 p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <ThumbsUp className="w-3.5 h-3.5 text-[#C65B4B]" />
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#C65B4B]">Why dispose</p>
                        </div>
                        <ul className="space-y-2">
                          {tips.disposePros.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#1B1F1D]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#C65B4B] shrink-0 mt-0.5" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl bg-[#1B1F1D]/4 border border-[#1B1F1D]/8 p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <ThumbsDown className="w-3.5 h-3.5 text-[#66706A]" />
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#66706A]">Downsides</p>
                        </div>
                        <ul className="space-y-2">
                          {tips.disposeCons.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#66706A]">
                              <span className="w-3.5 h-3.5 shrink-0 mt-0.5 text-center font-bold">!</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Disposal steps */}
                    <div className="rounded-2xl bg-[#F6F8F5] border border-[#1B1F1D]/5 p-4 space-y-2.5">
                      {data.hazard && (
                        <div className="flex items-center gap-2 mb-3 rounded-xl bg-[#C65B4B]/8 border border-[#C65B4B]/20 px-3 py-2">
                          <AlertTriangle className="w-4 h-4 text-[#C65B4B] shrink-0" />
                          <p className="text-xs font-semibold text-[#C65B4B]">⚠ {data.hazard} Hazard — handle with care</p>
                        </div>
                      )}
                      {disposeTips.map((tip, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#C65B4B]/10 text-[#C65B4B] text-[10px] font-bold mt-0.5">{i + 1}</span>
                          <p className="text-[#1B1F1D] text-sm leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>

                    {/* Find disposal location */}
                    <Link to="/map">
                      <div className="rounded-2xl border border-[#C65B4B]/20 bg-[#C65B4B]/5 p-4 flex items-center gap-4 hover:bg-[#C65B4B]/10 transition-colors cursor-pointer group">
                        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#C65B4B]/15 text-[#C65B4B] group-hover:scale-105 transition-transform">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#1B1F1D] text-sm">Find Nearby Disposal Points</p>
                          <p className="text-xs text-[#66706A] mt-0.5">
                            {data.isEwaste
                              ? 'Locate certified e-waste drop-off centers near you'
                              : 'Find your nearest recycling or disposal facility'}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#C65B4B] shrink-0" />
                      </div>
                    </Link>

                    <TutorialSection tutorials={currentTutorials} loading={loadingTutorials}
                      title={`How to properly dispose ${itemTitle}`} accentColor="#C65B4B" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tutorial Section ─────────────────────────────────────────────────────────
function TutorialSection({ tutorials, loading, title, accentColor }:
  { tutorials: Tutorial[]; loading: boolean; title: string; accentColor: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Youtube className="w-3.5 h-3.5" style={{ color: accentColor }} />
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#66706A]">{title}</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden border border-[#1B1F1D]/8 animate-pulse">
              <div className="aspect-video bg-[#1B1F1D]/5" />
              <div className="p-2.5 space-y-1.5">
                <div className="h-2.5 bg-[#1B1F1D]/5 rounded w-3/4" />
                <div className="h-2.5 bg-[#1B1F1D]/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : tutorials.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {tutorials.map(t => (
            <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
              className="rounded-2xl overflow-hidden border border-[#1B1F1D]/8 hover:border-[#1B1F1D]/20 transition-all group shadow-sm bg-[#F6F8F5]">
              <div className="aspect-video relative overflow-hidden bg-[#1B1F1D]/5">
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Youtube className="w-6 h-6 text-[#66706A]/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
                    <Play className="w-3 h-3 text-[#1B1F1D] ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-[#1B1F1D] text-[11px] font-semibold line-clamp-2 leading-snug mb-1">{t.title}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[#66706A] text-[10px] truncate">{t.channelTitle}</p>
                  <ExternalLink className="w-2.5 h-2.5 text-[#66706A] shrink-0 ml-1" />
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#F6F8F5] border border-[#1B1F1D]/5 p-4 text-center">
          <Youtube className="w-6 h-6 text-[#66706A]/30 mx-auto mb-1.5" />
          <p className="text-[#66706A] text-xs mb-2">No video guides found for this item.</p>
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-[#2F6B5F] font-semibold hover:underline">
            Search on YouTube <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Disposal tips ────────────────────────────────────────────────────────────
function getDisposeTips(itemTitle: string, itemSubtitle: string): string[] {
  const name = (itemTitle + ' ' + itemSubtitle).toLowerCase();
  if (name.includes('phone') || name.includes('laptop') || name.includes('electronic') || name.includes('e-waste') || name.includes('battery')) {
    return [
      'Do NOT throw in regular household trash — electronics contain toxic heavy metals.',
      'Remove and separately bag any swollen or damaged batteries before transport.',
      'Wipe all personal data from the device before disposal.',
      'Bring to a certified e-waste drop-off point (SM Malls, Robinsons, or your city hall).',
    ];
  }
  if (name.includes('organic') || name.includes('food') || name.includes('peel') || name.includes('banana')) {
    return [
      'Place in the green/biodegradable waste bin — never mix with plastics or metals.',
      'If no green bin is available, bury in soil at least 6 inches deep as natural compost.',
      'Do not dispose of large quantities in drainage — it causes blockages and odor.',
      'Check if your barangay has a composting program that accepts organic waste.',
    ];
  }
  if (name.includes('glass')) {
    return [
      'Wrap broken glass in thick newspaper or cardboard before placing in the bin.',
      'Never place loose broken glass directly in trash bags — it can injure collectors.',
      'Intact glass bottles can be returned to stores or dropped at glass recycling points.',
    ];
  }
  if (name.includes('plastic')) {
    return [
      'Check the recycling number (1–7) on the bottom of the item.',
      'Rinse out any food or liquid residue before disposal.',
      'Flatten or crush to reduce volume in the bin.',
      'Place in the yellow/plastic recycling bin or bring to a junk shop.',
    ];
  }
  return [
    'Separate this item from regular household waste before disposal.',
    'Check if your barangay has a scheduled waste segregation collection day.',
    'Bring to your nearest Materials Recovery Facility (MRF) for proper sorting.',
    'When in doubt, contact your local government unit (LGU) for disposal guidance.',
  ];
}
