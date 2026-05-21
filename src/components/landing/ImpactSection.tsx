import React from 'react';
import { Leaf, Users, School, Home } from 'lucide-react';

const metrics = [
  { value: '12,473', label: 'Items diverted', desc: 'Kept out of landfills by RESIKLO users choosing to reuse or repair.' },
  { value: '342K kg', label: 'CO₂ avoided', desc: 'Equivalent to taking hundreds of cars off the road for a year.' },
  { value: '329K+', label: 'Responsible actions', desc: 'Logged through RESIKLO — recycling, repair, and safe e-waste disposal.' },
  { value: '1 in 10', label: 'Items reusable', desc: 'Household items that could be reused before they ever need recycling.' },
];

const audiences = [
  { icon: Home,    label: 'Households',   desc: 'Everyday waste decisions made smarter, one scan at a time.' },
  { icon: School,  label: 'Schools',      desc: 'Teach responsible consumption to the next generation.' },
  { icon: Users,   label: 'Communities',  desc: 'Barangay-level impact through shared drop-off awareness.' },
  { icon: Leaf,    label: 'Barangays',    desc: 'Support LGU waste segregation programs with real data.' },
];

export function ImpactSection() {
  return (
    <section className="bg-[#1B1F1D] py-24 md:py-32">
      <div className="container">

        {/* Header */}
        <div className="max-w-3xl mb-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7BAE7F] mb-5">
            Impact
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-[1.1] tracking-tight mb-5">
            Small decisions. Real impact.
          </h2>
          <p className="text-[#9aa39d] leading-relaxed max-w-2xl">
            RESIKLO is built around a simple belief: if you give people the right
            information at the right moment, they will make better choices. These
            numbers show what happens when they do.
          </p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {metrics.map((m) => (
            <div key={m.label}
              className="rounded-2xl bg-white/[0.04] border border-white/8 p-6 hover:bg-white/[0.07] transition-colors">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7BAE7F] mb-4">{m.label}</p>
              <p className="font-heading text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2">{m.value}</p>
              <p className="text-[13px] text-[#9aa39d] leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* SDG 12 callout */}
        <div className="rounded-3xl bg-[#2F6B5F]/20 border border-[#2F6B5F]/30 p-8 md:p-10 mb-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#7BAE7F]/15 border border-[#7BAE7F]/25 px-4 py-1.5 mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7BAE7F]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7BAE7F]">
                  United Nations SDG 12
                </span>
              </div>
              <h3 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-3 leading-tight">
                Responsible Consumption &amp; Production
              </h3>
              <p className="text-[#9aa39d] leading-relaxed">
                RESIKLO directly supports UN Sustainable Development Goal 12 by
                reducing waste at the source — before it ever reaches a landfill.
                Every scan is a measurable, traceable act of responsible consumption.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {audiences.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7BAE7F]/15 text-[#7BAE7F] mb-3">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-white text-sm mb-1">{label}</p>
                  <p className="text-[12px] text-[#9aa39d] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
