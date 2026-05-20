import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sprout,
  Wrench,
  Recycle,
  ArrowRight,
  Leaf,
  AlertCircle } from
'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { mockSuggestions } from '../lib/mockData';

export function Analysis() {
  const location = useLocation();
  const state = location.state || {};
  const dynamicAnalysis = state.analysis;
  const image = state.imageUrl || 'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&q=80&w=800';

  const data = dynamicAnalysis || mockSuggestions.plasticBottle;

  // Split safely in case there's no dot separator
  const itemTitle = data.item ? (data.item.includes('·') ? data.item.split('·')[0].trim() : data.item) : 'Detected Item';
  const itemSubtitle = data.item && data.item.includes('·') ? data.item.split('·')[1].trim() : 'Recyclable';

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
                  Sandbox Heuristics
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

          {/* Demo toggle to see e-waste */}
          <Link to="/analysis/ewaste">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-[#C65B4B]/30 text-[#C65B4B] hover:bg-[#C65B4B]/5 w-fit">
              <AlertCircle className="w-3 h-3 mr-2" />
              View E-Waste Demo
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Item Details */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              className="bg-white rounded-3xl p-2 shadow-sm border border-border/50 overflow-hidden">
              
              <div className="aspect-square rounded-2xl overflow-hidden relative bg-gray-100">
                <img
                  src={image}
                  alt="Scanned item"
                  className="w-full h-full object-cover" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-white font-bold text-xl mb-1">
                    {itemTitle}
                  </h2>
                  <p className="text-white/80 text-sm font-mono">
                    {itemSubtitle}
                  </p>
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 gap-4">
                <div className="bg-[#F6F8F5] rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#66706A] mb-1">
                    Condition
                  </p>
                  <p className="font-medium text-[#1B1F1D] flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-[#2F6B5F]" />{' '}
                    {data.condition}
                  </p>
                </div>
                <div className="bg-[#F6F8F5] rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#66706A] mb-1">
                    Confidence
                  </p>
                  <p className="font-medium text-[#1B1F1D]">
                    {data.confidence}%
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.1
              }}
              className="bg-[#2F6B5F] text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
              
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <Leaf className="w-6 h-6 text-[#7BAE7F] mb-4" />
              <h3 className="font-bold text-lg mb-2">Environmental Impact</h3>
              <p className="text-white/80 text-sm mb-4 leading-relaxed">
                By choosing to reuse this item instead of throwing it away, you
                save approximately{' '}
                <strong className="text-white">{data.impact} kg of CO₂</strong>{' '}
                emissions.
              </p>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Recommendations */}
          <div className="lg:col-span-8 space-y-8">
            {/* REUSE SECTION */}
            <motion.section
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.2
              }}>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#2F6B5F]/10 text-[#2F6B5F] flex items-center justify-center">
                  <RefreshIcon className="w-4 h-4" />
                </div>
                <h2 className="font-heading text-xl font-bold text-[#1B1F1D]">
                  Reuse Opportunities
                </h2>
                <Badge
                  variant="outline"
                  className="ml-auto border-[#2F6B5F]/20 text-[#2F6B5F] bg-[#2F6B5F]/5">
                  
                  Top Choice
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.reuse.map((item: { title: string; desc: string }, i: number) =>
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-border/50 hover:border-[#2F6B5F]/30 transition-colors group cursor-pointer">
                  
                    <div className="w-10 h-10 rounded-xl bg-[#F6F8F5] text-[#2F6B5F] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {i === 0 ?
                    <Sprout className="w-5 h-5" /> :
                    i === 1 ?
                    <Leaf className="w-5 h-5" /> :

                    <Wrench className="w-5 h-5" />
                    }
                    </div>
                    <h3 className="font-bold text-[#1B1F1D] mb-1">
                      {item.title}
                    </h3>
                    <p className="text-[#66706A] text-sm mb-4">{item.desc}</p>
                    <div className="flex items-center text-[#2F6B5F] text-xs font-bold uppercase tracking-wider">
                      View DIY Guide{' '}
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                )}
              </div>
            </motion.section>

            {/* RECYCLE SECTION */}
            <motion.section
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.4
              }}>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#66706A]/10 text-[#66706A] flex items-center justify-center">
                  <Recycle className="w-4 h-4" />
                </div>
                <h2 className="font-heading text-xl font-bold text-[#1B1F1D]">
                  Recycling Guidance
                </h2>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
                <p className="text-[#1B1F1D] font-medium mb-4">
                  {data.recycle}
                </p>
                <Link to="/map" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl">
                    Find Nearby Recycling Centers
                  </Button>
                </Link>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>);

}
// Helper icon
function RefreshIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}>
      
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>);

}