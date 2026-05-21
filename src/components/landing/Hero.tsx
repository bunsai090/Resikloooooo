import { useState, useEffect } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Hero() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async (e: React.MouseEvent) => {
    if (deferredPrompt) {
      e.preventDefault();
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Hero PWA install prompt outcome: ${outcome}`);
      setDeferredPrompt(null);
    }
  };

  return (
    <section className="relative bg-[#F6F8F5] overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#7BAE7F]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full bg-[#2F6B5F]/8 blur-3xl" />

      <div className="container relative py-10 md:py-28">

        {/* Badge — shorter text on mobile to prevent wrapping */}
        <div className="mb-6 md:mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2F6B5F]/25 bg-white px-3 py-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#2F6B5F] animate-pulse" />
            <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.15em] md:tracking-[0.2em] text-[#2F6B5F] whitespace-nowrap">
              <span className="md:hidden">AI · Waste · Philippines</span>
              <span className="hidden md:inline">AI-Powered · Waste Intelligence · Philippines</span>
            </span>
          </span>
        </div>

        {/* Main headline — smaller on mobile */}
        <div className="max-w-4xl mb-5 md:mb-6">
          <h1 className="font-heading font-semibold tracking-tight text-[#1B1F1D] leading-[1.05]">
            <span className="block text-4xl md:text-6xl lg:text-7xl">
              Think before
            </span>
            <span className="block text-4xl md:text-6xl lg:text-7xl">
              you throw.
            </span>
            <span className="block text-2xl md:text-4xl lg:text-5xl text-[#2F6B5F] font-normal italic mt-3 md:mt-4">
              RESIKLO guides every decision.
            </span>
          </h1>
        </div>

        {/* Divider */}
        <div className="w-10 md:w-12 h-[2px] bg-[#2F6B5F] mb-5 md:mb-8" />

        {/* Description */}
        <p className="text-sm md:text-lg text-[#66706A] leading-relaxed max-w-2xl mb-3">
          RESIKLO is more than a tool — it's a habit. A quiet discipline
          that builds over time. Before you throw something away, we walk
          you through a better path: reuse it, repair it, recycle it, or
          dispose of it responsibly.
        </p>
        <p className="text-xs md:text-sm text-[#66706A]/70 leading-relaxed max-w-xl mb-8 md:mb-12">
          Every scan is a small act of awareness. Every decision shapes
          how you see waste — and over time, how your community does too.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 md:mb-10">
          <Link to="/scan" onClick={deferredPrompt ? handleInstallClick : undefined}>
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#1B1F1D] hover:bg-[#2F6B5F] text-white px-7 py-3.5 text-sm font-semibold transition-colors group shadow-lg shadow-black/10">
              {deferredPrompt ? 'Download Resiklo App' : 'Start Scanning Free'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <Link to="/map">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#1B1F1D]/20 bg-white hover:bg-[#1B1F1D] text-[#1B1F1D] hover:text-white px-7 py-3.5 text-sm font-semibold transition-colors shadow-sm">
              <MapPin className="h-4 w-4" />
              Find Nearby Hubs
            </button>
          </Link>
        </div>

        {/* Fine print */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {['No account required', 'Works on any device', 'Free to use'].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 text-xs text-[#66706A] font-medium">
              <span className="h-1 w-1 rounded-full bg-[#2F6B5F]" />
              {item}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}
