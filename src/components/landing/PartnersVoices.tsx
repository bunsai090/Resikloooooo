import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '../Button';

const cards = [
  {
    eyebrow: 'For partners',
    title: 'List your facility on the RESIKLO map.',
    body:
      'Whether you run a recycling center, a repair café, a donation hub, or a barangay drop-off point — RESIKLO can route users directly to your facility. We verify listings and show real hours, accepted materials, and directions.',
    bullets: [
      'Free listing on the RESIKLO map',
      'Accepted materials and live hours shown',
      'Monthly impact reports for your facility',
      'A 10-minute partner questionnaire to get started',
    ],
    cta: 'Complete partner questionnaire',
    disclaimer: 'Takes ~10 minutes. We review applications monthly.',
  },
  {
    eyebrow: 'For voices',
    title: 'Help us build something that actually works.',
    body:
      'RESIKLO is shaped by the people who use it. If you\'ve ever been frustrated by confusing recycling rules, wished you knew where to donate something, or found a better way to reuse an item — we want to hear it. Your lived experience makes the system smarter.',
    bullets: [
      'Three short prompts, your own words',
      'Fully anonymous unless you choose to opt in',
      'Real product changes ship from your input',
      'You can stop and save your answers anytime',
    ],
    cta: 'Share your experience',
    disclaimer: 'Your answers stay yours. We never sell or share them.',
  },
];

export function PartnersVoices() {
  return (
    <section className="bg-white py-24 md:py-28">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-5">
            Get involved
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-[#1B1F1D] tracking-tight">
            We're looking for{' '}
            <span className="italic font-normal text-[#2F6B5F]">
              partners and voices
            </span>
          </h2>
          <p className="text-[#66706A] leading-relaxed mt-5 max-w-xl mx-auto">
            RESIKLO only works if the map is accurate and the product reflects
            real needs. That means we need facility partners to keep the data
            fresh, and community voices to keep the product honest.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-3xl bg-[#F6F8F5] border border-[#1B1F1D]/5 p-8 md:p-10 flex flex-col">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-5">
                {c.eyebrow}
              </p>
              <h3 className="font-heading text-2xl md:text-3xl font-semibold text-[#1B1F1D] tracking-tight leading-tight mb-4">
                {c.title}
              </h3>
              <p className="text-[#66706A] leading-relaxed mb-6">{c.body}</p>
              <ul className="space-y-3 mb-8">
                {c.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm text-[#1B1F1D]">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#7BAE7F]/15 text-[#2F6B5F] mt-0.5">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <Button className="rounded-full bg-[#1B1F1D] hover:bg-[#2F6B5F] text-white h-12 px-6 text-sm font-medium group transition-colors">
                  {c.cta}
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <p className="font-mono text-[10px] text-[#66706A] mt-4">
                  {c.disclaimer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}