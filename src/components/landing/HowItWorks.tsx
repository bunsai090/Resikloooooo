import React, { useState } from 'react';
import { Camera, Cpu, MapPin, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01',
    icon: Camera,
    title: 'Scan the Item',
    subtitle: 'Take a photo or upload one',
    desc: 'Point your camera at any waste item — plastic, electronics, fabric, paper, glass. RESIKLO identifies the material type and packaging code in seconds.',
    bullets: ['Works on any device', 'No account needed', 'Offline for common materials'],
    color: '#2F6B5F',
    lightBg: 'bg-[#2F6B5F]/8',
    accent: 'text-[#2F6B5F]',
    border: 'border-[#2F6B5F]/20',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'AI Analyzes It',
    subtitle: 'Powered by Google Gemini',
    desc: 'RESIKLO grades the item\'s condition and confidence level, then walks you through the hierarchy: reuse → repair → recycle → dispose. No greenwashing.',
    bullets: ['Condition + confidence score', 'Flags hazardous materials', 'Personalized next steps'],
    color: '#7BAE7F',
    lightBg: 'bg-[#7BAE7F]/8',
    accent: 'text-[#7BAE7F]',
    border: 'border-[#7BAE7F]/20',
  },
  {
    number: '03',
    icon: MapPin,
    title: 'Take Action',
    subtitle: 'Find the right place nearby',
    desc: 'When recycling is the answer, RESIKLO routes you to the nearest verified drop-off center, repair café, or e-waste collection point — with real hours and directions.',
    bullets: ['Verified drop-off locations', 'Live hours & directions', 'E-waste specialist mode'],
    color: '#D9A441',
    lightBg: 'bg-[#D9A441]/8',
    accent: 'text-[#D9A441]',
    border: 'border-[#D9A441]/20',
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-4">
            How it works
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-[#1B1F1D] tracking-tight leading-[1.1] mb-4">
            Three steps to a smarter waste decision.
          </h2>
          <p className="text-[#66706A] leading-relaxed">
            From the moment you open the camera to the moment you walk out the
            door — a simple rhythm that turns guesswork into a confident choice.
          </p>
        </div>

        {/* Step tabs */}
        <div className="flex gap-2 mb-10">
          {steps.map((s, i) => (
            <button
              key={s.number}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                active === i
                  ? 'bg-[#1B1F1D] text-white shadow-md'
                  : 'bg-[#F6F8F5] text-[#66706A] hover:bg-[#1B1F1D]/5'
              }`}
            >
              <span className={`font-mono text-[10px] ${active === i ? 'text-white/60' : 'text-[#66706A]/60'}`}>
                {s.number}
              </span>
              {s.title}
            </button>
          ))}
        </div>

        {/* Active step detail */}
        <div
          key={active}
          className={`rounded-3xl border ${step.border} ${step.lightBg} p-8 md:p-10 grid md:grid-cols-2 gap-8 items-center
                      transition-all duration-300`}
        >
          {/* Left */}
          <div>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm mb-6`}
              style={{ color: step.color }}>
              <step.icon className="h-7 w-7" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#66706A] mb-2">
              {step.subtitle}
            </p>
            <h3 className="font-heading text-2xl md:text-3xl font-semibold text-[#1B1F1D] mb-4 leading-tight">
              {step.title}
            </h3>
            <p className="text-[#66706A] leading-relaxed mb-6">
              {step.desc}
            </p>
            <ul className="space-y-2.5">
              {step.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-[#1B1F1D]">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white shadow-sm"
                    style={{ color: step.color }}>
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — step number + nav */}
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="font-heading text-7xl font-bold leading-none" style={{ color: step.color }}>
                {active + 1}
              </span>
              {/* Progress ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="72" fill="none" stroke="#1B1F1D08" strokeWidth="4" />
                <circle
                  cx="80" cy="80" r="72" fill="none"
                  stroke={step.color} strokeWidth="4"
                  strokeDasharray={`${(active + 1) / 3 * 452} 452`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>

            {/* Prev / Next */}
            <div className="flex gap-3">
              <button
                onClick={() => setActive(Math.max(0, active - 1))}
                disabled={active === 0}
                className="h-10 w-10 rounded-full border border-[#1B1F1D]/10 flex items-center justify-center text-[#66706A] hover:bg-[#1B1F1D] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
              <button
                onClick={() => setActive(Math.min(2, active + 1))}
                disabled={active === 2}
                className="h-10 w-10 rounded-full border border-[#1B1F1D]/10 flex items-center justify-center text-[#66706A] hover:bg-[#1B1F1D] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex items-center gap-4">
          <Link to="/scan">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#1B1F1D] hover:bg-[#2F6B5F] text-white px-7 py-3.5 text-sm font-semibold transition-colors group">
              Try it now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </Link>
          <p className="font-mono text-[11px] text-[#66706A]">No account needed · Free to use</p>
        </div>
      </div>
    </section>
  );
}
