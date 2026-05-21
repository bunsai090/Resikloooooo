import React from 'react';
import { AlertTriangle, Trash2, Zap, HelpCircle } from 'lucide-react';

const problems = [
  {
    icon: HelpCircle,
    stat: '93%',
    label: 'of people',
    desc: 'don\'t know the correct bin for mixed waste items before throwing them away.',
    color: 'text-[#D9A441]',
    bg: 'bg-[#D9A441]/8',
    border: 'border-[#D9A441]/20',
  },
  {
    icon: Zap,
    stat: '53M',
    label: 'tons yearly',
    desc: 'of e-waste generated globally — the fastest growing waste stream on the planet.',
    color: 'text-[#C65B4B]',
    bg: 'bg-[#C65B4B]/8',
    border: 'border-[#C65B4B]/20',
  },
  {
    icon: Trash2,
    stat: '91%',
    label: 'of plastic',
    desc: 'is never recycled. Most recyclable waste ends up in landfills due to wrong disposal.',
    color: 'text-[#66706A]',
    bg: 'bg-[#66706A]/8',
    border: 'border-[#66706A]/20',
  },
  {
    icon: AlertTriangle,
    stat: '0',
    label: 'guidance',
    desc: 'Most households receive zero guidance on what to do with an item before throwing it.',
    color: 'text-[#2F6B5F]',
    bg: 'bg-[#2F6B5F]/8',
    border: 'border-[#2F6B5F]/20',
  },
];

export function ProblemSection() {
  return (
    <section className="bg-[#1B1F1D] py-24 md:py-32">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — problem framing */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7BAE7F] mb-5">
              The problem
            </p>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-[1.1] tracking-tight mb-6">
              Most waste decisions happen in under{' '}
              <span className="text-[#7BAE7F]">3 seconds.</span>
              <br />Most of them are wrong.
            </h2>
            <p className="text-[#9aa39d] leading-relaxed text-base mb-6 max-w-lg">
              People don't throw things away carelessly — they just don't know
              better. There's no guidance at the moment it matters most: when
              you're standing over the bin with something in your hand.
            </p>
            <p className="text-[#9aa39d]/70 text-sm leading-relaxed max-w-lg">
              E-waste leaches toxins into soil. Recyclables contaminate bins.
              Reusable items get buried in landfills. The problem isn't
              attitude — it's the absence of a decision layer.
            </p>
          </div>

          {/* Right — stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {problems.map((p) => (
              <div
                key={p.stat}
                className={`rounded-2xl ${p.bg} border ${p.border} p-5 flex flex-col gap-3`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ${p.color}`}>
                  <p.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className={`font-heading text-3xl font-bold ${p.color} leading-none mb-0.5`}>
                    {p.stat}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mb-2">
                    {p.label}
                  </p>
                  <p className="text-[13px] text-[#9aa39d] leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
