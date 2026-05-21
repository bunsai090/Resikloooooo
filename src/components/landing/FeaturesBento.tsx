import React from 'react';
import { Scan, BarChart3, MapPin, Zap, Wifi, ShieldCheck } from 'lucide-react';

export function FeaturesBento() {
  return (
    <section className="bg-[#F6F8F5] py-24 md:py-32">
      <div className="container">
        <div className="max-w-2xl mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-4">
            Features
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-[#1B1F1D] tracking-tight leading-[1.1]">
            Everything you need to make the right call.
          </h2>
        </div>

        {/* Row 1: AI Recognition (wide) + E-Waste (narrow) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

          {/* AI Recognition — spans 2 cols */}
          <div className="md:col-span-2 rounded-3xl bg-[#1B1F1D] p-8 relative overflow-hidden min-h-[220px] flex flex-col justify-between">
            <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#7BAE7F]/15 blur-3xl" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7BAE7F]/15 text-[#7BAE7F]">
                  <Scan className="h-6 w-6" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#7BAE7F]/60 border border-[#7BAE7F]/20 rounded-full px-2.5 py-1">
                  Core Feature
                </span>
              </div>
              <h3 className="font-heading text-xl font-semibold text-white mb-2">
                AI Waste Recognition
              </h3>
              <p className="text-[#9aa39d] text-sm leading-relaxed max-w-md">
                Powered by Google Gemini. Identifies plastics (PET, HDPE, PP), electronics,
                fabric, paper, glass, and more — with material code, condition grade, and
                confidence score in seconds.
              </p>
            </div>
          </div>

          {/* E-Waste Specialist */}
          <div className="rounded-3xl bg-[#C65B4B]/8 border border-[#C65B4B]/20 p-7 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C65B4B]/15 text-[#C65B4B]">
                <Zap className="h-5 w-5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#C65B4B]/70 border border-[#C65B4B]/20 rounded-full px-2.5 py-1">
                E-Waste
              </span>
            </div>
            <h3 className="font-heading text-lg font-semibold text-[#1B1F1D] mb-2">
              E-Waste Specialist Mode
            </h3>
            <p className="text-[#66706A] text-sm leading-relaxed flex-1">
              Dedicated path for electronics and batteries. Identifies hazard levels and
              connects you to certified collection centers.
            </p>
          </div>
        </div>

        {/* Row 2: Smart Analysis + E-Waste Locator + SDG 12 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

          {/* Smart Disposal */}
          <div className="rounded-3xl bg-white border border-[#1B1F1D]/8 p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2F6B5F]/10 text-[#2F6B5F]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#66706A] border border-[#1B1F1D]/10 rounded-full px-2.5 py-1">
                Analysis
              </span>
            </div>
            <h3 className="font-heading text-lg font-semibold text-[#1B1F1D] mb-2">
              Smart Disposal Decision
            </h3>
            <p className="text-[#66706A] text-sm leading-relaxed">
              Follows the sustainability hierarchy: Reuse → Repair → Recycle → Dispose.
              No greenwashing, no fake scores.
            </p>
          </div>

          {/* E-Waste Locator */}
          <div className="rounded-3xl bg-white border border-[#1B1F1D]/8 p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7BAE7F]/15 text-[#2F6B5F]">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#66706A] border border-[#1B1F1D]/10 rounded-full px-2.5 py-1">
                Map
              </span>
            </div>
            <h3 className="font-heading text-lg font-semibold text-[#1B1F1D] mb-2">
              E-Waste Locator
            </h3>
            <p className="text-[#66706A] text-sm leading-relaxed">
              Shows verified nearby drop-off centers with live hours, accepted materials,
              and walking directions.
            </p>
          </div>

          {/* SDG 12 */}
          <div className="rounded-3xl bg-[#2F6B5F] p-7 relative overflow-hidden">
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/60 border border-white/20 rounded-full px-2.5 py-1">
                SDG 12
              </span>
            </div>
            <h3 className="font-heading text-lg font-semibold text-white mb-2">
              UN SDG 12 Aligned
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Directly supports Responsible Consumption &amp; Production. Every scan is a
              measurable step toward reducing waste at the source.
            </p>
          </div>
        </div>

        {/* Row 3: Offline — full width */}
        <div className="rounded-3xl bg-white border border-[#1B1F1D]/8 p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[#D9A441]/10 text-[#D9A441]">
              <Wifi className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="font-heading text-lg font-semibold text-[#1B1F1D]">
                  Works Offline for Common Items
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#66706A] border border-[#1B1F1D]/10 rounded-full px-2.5 py-1">
                  Accessibility
                </span>
              </div>
              <p className="text-[#66706A] text-sm leading-relaxed max-w-2xl">
                PET #1, HDPE #2, cardboard, and other frequent materials are recognized
                without a strong connection. No account required to scan — just open the
                camera and go.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
