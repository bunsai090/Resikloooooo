import React from 'react';
import { Leaf, Github, Zap, MapPin, Recycle, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

const team = [
  { name: 'RESIKLO Team', role: 'Zamboanga City, Philippines', initials: 'RT' },
];

const techStack = [
  { label: 'Frontend', value: 'React 18 + TypeScript + Vite' },
  { label: 'Styling', value: 'Tailwind CSS + Framer Motion' },
  { label: 'AI Vision', value: 'Google Gemini (multi-model fallback)' },
  { label: 'AI Fallback', value: 'OpenRouter (free vision models)' },
  { label: 'Map', value: 'Mapbox GL JS via react-map-gl' },
  { label: 'Database', value: 'Supabase (PostgreSQL)' },
  { label: 'Backend', value: 'Node.js + Express' },
  { label: 'Tutorials', value: 'YouTube Data API v3' },
];

const features = [
  { icon: Brain,   label: 'AI Waste Recognition',  desc: 'Google Gemini identifies any waste item in seconds.' },
  { icon: Recycle, label: 'Smart Disposal Guide',   desc: 'Reuse → Repair → Recycle → Dispose hierarchy.' },
  { icon: MapPin,  label: 'E-Waste Locator',        desc: 'Verified drop-off centers in Zamboanga City.' },
  { icon: Zap,     label: 'E-Waste Specialist Mode', desc: 'Dedicated path for hazardous electronics.' },
];

export function About() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F8F5]">
      <div className="container max-w-4xl py-14 px-4 md:px-6">

        {/* Header */}
        <div className="mb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-4">
            About
          </p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-[#1B1F1D] mb-4 leading-tight">
            What is RESIKLO?
          </h1>
          <p className="text-[#66706A] leading-relaxed text-base max-w-2xl mb-3">
            RESIKLO is an AI-powered waste decision assistant built for Zamboanga City,
            Philippines. It helps individuals, households, schools, and communities make
            smarter waste decisions — before anything reaches a landfill.
          </p>
          <p className="text-[#66706A] leading-relaxed text-sm max-w-2xl">
            The name comes from the Filipino word <em>resiklo</em> — to recycle. But
            RESIKLO goes further than recycling. It walks you through the full
            sustainability hierarchy: reuse, repair, recycle, and dispose responsibly.
          </p>
        </div>

        {/* Divider */}
        <div className="w-12 h-[2px] bg-[#2F6B5F] mb-12" />

        {/* Mission */}
        <div className="rounded-3xl bg-[#1B1F1D] p-8 mb-8 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#7BAE7F]/15 blur-3xl" />
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-5 h-5 text-[#7BAE7F]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7BAE7F]">Our mission</p>
          </div>
          <p className="text-white text-lg font-heading font-semibold leading-snug mb-3 max-w-xl">
            "Think before you throw."
          </p>
          <p className="text-[#9aa39d] text-sm leading-relaxed max-w-2xl">
            Most waste decisions happen in under 3 seconds — and most of them are wrong.
            RESIKLO is built to slow that decision down by just a few seconds, so the
            right choice can win. No guilt. No scoreboard. Just clearer answers when
            you need them most.
          </p>
        </div>

        {/* SDG 12 */}
        <div className="rounded-3xl bg-[#2F6B5F]/8 border border-[#2F6B5F]/20 p-7 mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-3">
            UN SDG 12 — Responsible Consumption &amp; Production
          </p>
          <p className="text-[#1B1F1D] text-sm leading-relaxed max-w-2xl">
            RESIKLO directly supports United Nations Sustainable Development Goal 12.
            Every scan is a measurable, traceable act of responsible consumption —
            contributing to reduced waste generation, improved recycling rates, and
            greater environmental awareness across communities.
          </p>
        </div>

        {/* Features */}
        <div className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-5">
            Core features
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-2xl bg-white border border-[#1B1F1D]/8 p-5 shadow-sm flex gap-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#2F6B5F]/10 text-[#2F6B5F]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-[#1B1F1D] text-sm mb-1">{label}</p>
                  <p className="text-[#66706A] text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-5">
            Tech stack
          </p>
          <div className="rounded-2xl bg-white border border-[#1B1F1D]/8 shadow-sm overflow-hidden">
            {techStack.map((t, i) => (
              <div key={t.label}
                className={`flex items-center justify-between px-5 py-3.5 text-sm ${
                  i < techStack.length - 1 ? 'border-b border-[#1B1F1D]/6' : ''
                }`}>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#66706A]">{t.label}</span>
                <span className="text-[#1B1F1D] font-medium text-xs">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/scan">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#1B1F1D] hover:bg-[#2F6B5F] text-white px-7 py-3.5 text-sm font-semibold transition-colors group">
              Try RESIKLO
              <Leaf className="h-4 w-4" />
            </button>
          </Link>
          <a
            href="https://github.com/bunsai090/Resikloooooo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#1B1F1D]/20 bg-white hover:bg-[#1B1F1D] text-[#1B1F1D] hover:text-white px-7 py-3.5 text-sm font-semibold transition-colors"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </div>

      </div>
    </div>
  );
}
