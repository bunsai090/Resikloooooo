import React from 'react';
import { Scan, BarChart3, MapPin, BookOpen, Zap, ShieldCheck, Wifi, Smartphone } from 'lucide-react';

const features = [
  {
    icon: Scan,
    title: 'AI-Powered Item Recognition',
    body:
      'Point your camera at any waste item — plastic bottles, old electronics, worn-out clothes, cardboard, glass — and RESIKLO identifies the material type, packaging code, and condition in seconds using Google Gemini AI.',
    tag: 'Core Feature',
  },
  {
    icon: BarChart3,
    title: 'Honest Waste Analysis',
    body:
      'After scanning, RESIKLO grades the item\'s condition and confidence level, then gives you three personalized next-step suggestions. It flags hazardous materials like batteries and e-waste so you never accidentally contaminate a recycling bin.',
    tag: 'Analysis',
  },
  {
    icon: MapPin,
    title: 'Real Nearby Facilities',
    body:
      'When recycling or donation is the right call, RESIKLO routes you to the closest verified drop-off center, repair café, or donation hub — complete with live hours, distance, and walking directions. No outdated lists.',
    tag: 'Map',
  },
  {
    icon: BookOpen,
    title: 'Material Education Guides',
    body:
      'Short, plain-language guides explain why each material behaves the way it does — PET plastics, HDPE, e-waste, fabric, paper. The more you learn, the faster and more confident your waste decisions become.',
    tag: 'Learn',
  },
  {
    icon: Zap,
    title: 'Dynamic Scan Questions',
    body:
      'RESIKLO doesn\'t just scan — it asks smart follow-up questions about the item\'s condition, age, and your situation. This two-step flow (initiate → finalize) produces a far more accurate and useful recommendation than a single-shot scan.',
    tag: 'Smart Flow',
  },
  {
    icon: ShieldCheck,
    title: 'E-Waste Specialist Mode',
    body:
      'Electronics and batteries get a dedicated analysis path. RESIKLO identifies hazard levels, explains why certain items can\'t go in regular bins, and connects you directly to certified e-waste collection centers near you.',
    tag: 'E-Waste',
  },
  {
    icon: Wifi,
    title: 'Works for Common Materials Offline',
    body:
      'Frequent materials like PET #1, HDPE #2, and cardboard are recognized even without a strong connection. No account is needed to try a scan — just open the camera and go.',
    tag: 'Accessibility',
  },
  {
    icon: Smartphone,
    title: 'Built for Real Life',
    body:
      'RESIKLO is designed for the moment you\'re standing over the bin with something in your hand. Fast, calm, and honest — it slows the decision down by just a few seconds so the right choice can win.',
    tag: 'Design',
  },
];

export function DarkIntro() {
  return (
    <section className="bg-[#1B1F1D] py-24 md:py-32">
      <div className="container">
        {/* Section header */}
        <div className="max-w-3xl mb-16 md:mb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7BAE7F] mb-6">
            Everything RESIKLO does
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-[1.15] tracking-tight mb-6">
            A complete waste intelligence platform — built for the Philippines.
          </h2>
          <p className="text-[15px] md:text-base text-[#9aa39d] leading-relaxed max-w-2xl">
            RESIKLO sits between the bin and the curb. Before you throw
            something away, it walks you through a quiet hierarchy — reuse,
            repair, donate, recycle, dispose — and tells you what actually
            makes sense for that one item, in your neighborhood, right now.
            No guilt. No scoreboard. Just clearer answers.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-white/[0.04] border border-white/8 p-6 hover:bg-white/[0.07] transition-colors group">
              <div className="flex items-start justify-between mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7BAE7F]/15 text-[#7BAE7F]">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#7BAE7F]/60 border border-[#7BAE7F]/20 rounded-full px-2 py-0.5">
                  {f.tag}
                </span>
              </div>
              <h3 className="font-heading text-base font-semibold text-white mb-2 leading-snug">
                {f.title}
              </h3>
              <p className="text-[13px] text-[#9aa39d] leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}