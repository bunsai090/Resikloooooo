import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../Button';

export function MailingCTA() {
  const [email, setEmail] = useState('');
  return (
    <section className="bg-[#1B1F1D] py-24 md:py-28">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7BAE7F] mb-6">
              Stay close
            </p>
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.05] mb-6">
              Stay close to{' '}
              <span className="text-[#7BAE7F]">RESIKLO.</span>
            </h2>
            <p className="text-[#9aa39d] leading-relaxed mb-4 max-w-lg">
              One quiet email a month — new material guides, new partner hubs
              added to the map, product updates, and small notes from the
              people building this. No noise, easy to leave.
            </p>
            <p className="text-[#9aa39d]/70 text-sm leading-relaxed max-w-lg">
              We'll also let you know when new features ship — like offline
              scanning, community repair events, and expanded facility coverage
              across the Philippines.
            </p>
          </div>

          <div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col sm:flex-row gap-2 max-w-md mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                aria-label="Email address"
                className="flex-1 h-12 rounded-full bg-white/5 border border-white/10 px-5 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#7BAE7F]/50 focus:ring-2 focus:ring-[#7BAE7F]/20 transition"
              />
              <Button
                type="submit"
                className="h-12 rounded-full bg-[#7BAE7F] hover:bg-[#7BAE7F]/90 text-[#1B1F1D] px-6 text-sm font-medium group">
                Join the mailing list
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>
            <p className="font-mono text-[10px] text-[#66706A]">
              We never share your email. Unsubscribe with a single click.
            </p>

            <div className="mt-8 pt-8 border-t border-white/8 grid grid-cols-3 gap-4">
              {[
                { value: '12,473', label: 'Items diverted' },
                { value: '329K+', label: 'Repairs & donations' },
                { value: '342K kg', label: 'CO₂ saved' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-2xl font-semibold text-white mb-1">
                    {s.value}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#7BAE7F]/70">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}