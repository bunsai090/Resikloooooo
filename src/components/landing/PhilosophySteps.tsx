import React from 'react';
import { RefreshCw, Wrench, Recycle, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    id: 1,
    title: 'Reuse',
    icon: RefreshCw,
    color: 'text-[#2F6B5F]',
    bg: 'bg-[#2F6B5F]/10',
    border: 'border-[#2F6B5F]/20',
    desc:
      'Before anything else, RESIKLO checks if the item can serve a new purpose at home. A plastic bottle becomes a planter. A worn shirt becomes a cleaning rag. Reuse is always the first and best option.',
  },
  {
    id: 2,
    title: 'Repair',
    icon: Wrench,
    color: 'text-[#7BAE7F]',
    bg: 'bg-[#7BAE7F]/10',
    border: 'border-[#7BAE7F]/20',
    desc:
      'If an item is broken but fixable, RESIKLO suggests repair steps or connects you to a nearby repair café. A cracked phone screen, a frayed cable, a broken zipper — many things are worth fixing before discarding.',
  },
  {
    id: 3,
    title: 'Recycle',
    icon: Recycle,
    color: 'text-[#66706A]',
    bg: 'bg-[#66706A]/10',
    border: 'border-[#66706A]/20',
    desc:
      'When reuse and repair aren\'t options, RESIKLO guides you to the right recycling stream. It identifies the material code (PET #1, HDPE #2, PP #5…) and routes you to the correct drop-off facility.',
  },
  {
    id: 4,
    title: 'Dispose',
    icon: Trash2,
    color: 'text-[#C65B4B]',
    bg: 'bg-[#C65B4B]/10',
    border: 'border-[#C65B4B]/20',
    desc:
      'Disposal is always the last resort. For hazardous items like batteries, broken electronics, and contaminated materials, RESIKLO explains the safe disposal method and warns you against putting them in regular bins.',
  },
];

export function PhilosophySteps() {
  return (
    <section className="py-24 md:py-32 bg-[#F6F8F5]">
      <div className="container">
        <div className="max-w-3xl mb-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-5">
            The RESIKLO philosophy
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-[#1B1F1D] tracking-tight leading-[1.1] mb-5">
            A hierarchy of sustainability — not just a recycling app.
          </h2>
          <p className="text-[#66706A] leading-relaxed max-w-2xl text-base">
            Most apps tell you to recycle. RESIKLO asks a harder question first:
            does this item even need to be recycled? We guide you through four
            levels of environmental priority — in order — so the best choice
            always comes first.
          </p>
        </div>

        <div className="relative max-w-5xl">
          {/* Connecting line desktop */}
          <div className="hidden md:block absolute top-[52px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-[#2F6B5F]/30 via-[#66706A]/20 to-[#C65B4B]/30 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-col items-center text-center group">
                <div
                  className={`w-[104px] h-[104px] rounded-3xl ${step.bg} ${step.color} flex flex-col items-center justify-center mb-5 transition-transform group-hover:scale-105 duration-300 shadow-sm border ${step.border} relative`}>
                  <div className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-[10px] font-mono font-bold text-[#1B1F1D] shadow-sm">
                    {step.id}
                  </div>
                  <step.icon className="w-8 h-8 mb-1" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#1B1F1D] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-[#66706A] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex items-center gap-4">
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 rounded-full bg-[#1B1F1D] hover:bg-[#2F6B5F] text-white px-6 h-12 text-sm font-medium transition-colors group">
            Try it on your next item
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="font-mono text-[11px] text-[#66706A]">
            No account needed · Free to use
          </p>
        </div>
      </div>
    </section>
  );
}