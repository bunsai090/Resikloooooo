import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';

// Scrolls to a section on the landing page.
// If already on '/', scrolls directly. Otherwise navigates to '/' then scrolls.
function useLandingScroll() {
  const navigate = useNavigate();
  const location = useLocation();

  return (sectionId: string) => {
    const scroll = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (location.pathname === '/') {
      scroll();
    } else {
      navigate('/');
      // Wait for navigation + render before scrolling
      setTimeout(scroll, 120);
    }
  };
}

const NAV_LINKS = [
  { label: 'How It Works', section: 'how-it-works' },
  { label: 'Features',     section: 'features' },
  { label: 'Impact',       section: 'impact' },
];

export function TopNav() {
  const location = useLocation();
  const scrollTo = useLandingScroll();
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1B1F1D]/8 bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            RESIKLO
          </span>
        </Link>

        {/* Mobile PWA Install Button */}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="md:hidden flex items-center justify-center gap-1.5 rounded-full border border-[#2F6B5F]/20 bg-[#2F6B5F]/5 text-[#2F6B5F] px-3.5 py-1.5 text-xs font-semibold transition-colors active:bg-[#2F6B5F]/10"
          >
            Install App
          </button>
        )}

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">

          {/* Landing section anchors */}
          {NAV_LINKS.map(({ label, section }) => (
            <button
              key={section}
              onClick={() => scrollTo(section)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-secondary-foreground transition-colors hover:text-primary hover:bg-[#F6F8F5]">
              {label}
            </button>
          ))}

          {/* Divider */}
          <span className="w-px h-4 bg-[#1B1F1D]/10 mx-1" />

          {/* App pages */}
          <Link
            to="/map"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-primary hover:bg-[#F6F8F5] ${
              location.pathname.includes('/map') ? 'text-primary bg-[#F6F8F5]' : 'text-secondary-foreground'
            }`}>
            Map
          </Link>

          {/* About page */}
          <Link
            to="/about"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-primary hover:bg-[#F6F8F5] ${
              location.pathname === '/about' ? 'text-primary bg-[#F6F8F5]' : 'text-secondary-foreground'
            }`}>
            About
          </Link>
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6B5F]/20 bg-[#2F6B5F]/5 hover:bg-[#2F6B5F]/10 text-[#2F6B5F] px-4 py-2 text-xs font-semibold transition-colors"
            >
              📥 Install App
            </button>
          )}
          <Link to="/scan">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#1B1F1D] hover:bg-[#2F6B5F] text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm">
              Start Scanning →
            </button>
          </Link>
        </div>

      </div>
    </header>
  );
}
