import React, { useState, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check } from 'lucide-react';
import {
  ScanScreen,
  AnalyzeScreen,
  MapScreen,
  LearnScreen } from
'./PhoneScreens';
gsap.registerPlugin(ScrollTrigger);
const steps = [
{
  eyebrow: 'Step 01',
  title: 'Start with a scan or a photo.',
  body: 'Point your camera at the item or upload a photo. RESIKLO identifies the material in seconds — plastics, electronics, fabrics, paper, and more.',
  bullets: [
  'Works offline for common materials',
  'Recognizes packaging codes (PET, HDPE, PP…)',
  'No account needed to try it']

},
{
  eyebrow: 'Step 02',
  title: 'See an honest analysis.',
  body: 'We grade the condition, confidence, and the best next step — reuse, repair, donate, recycle, or dispose. No greenwashing, no fake scores.',
  bullets: [
  'Condition + confidence shown clearly',
  'Three personal next-step suggestions',
  'Flags hazards like batteries and e-waste']

},
{
  eyebrow: 'Step 03',
  title: 'Find the right place nearby.',
  body: 'When recycling really is the answer, we route you to the closest drop-off, repair café, or donation hub — with real hours and opening info.',
  bullets: [
  'Drop-offs, repair cafés, donation hubs',
  'Live hours and walking directions',
  'Saves your favorites for later']

},
{
  eyebrow: 'Step 04',
  title: 'Learn while you go.',
  body: 'Short, honest guides explain why each material behaves the way it does — so over time, the decisions get faster and the bin gets lighter.',
  bullets: [
  'Plain-language material guides',
  'Bookmark articles for later',
  'New guides every few weeks']

}];

export function PhonePractice() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  useLayoutEffect(() => {
    if (!sectionRef.current) return;
    const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      // Init screens: first visible, others hidden
      screenRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, {
          opacity: i === 0 ? 1 : 0,
          y: i === 0 ? 0 : 20
        });
      });
      if (prefersReduced) return;
      ScrollTrigger.matchMedia({
        '(min-width: 768px)': () => {
          let currentIdx = 0;
          const trigger = ScrollTrigger.create({
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (self) => {
              // Update rail
              if (railRef.current) {
                gsap.set(railRef.current, {
                  scaleY: self.progress
                });
              }
              // Compute active screen 0..3
              const idx = Math.min(3, Math.floor(self.progress * 3.9999));
              if (idx !== currentIdx) {
                const prev = screenRefs.current[currentIdx];
                const next = screenRefs.current[idx];
                if (prev) {
                  gsap.to(prev, {
                    opacity: 0,
                    y: -20,
                    duration: 0.45,
                    ease: 'power2.out'
                  });
                }
                if (next) {
                  gsap.fromTo(
                    next,
                    {
                      opacity: 0,
                      y: 20
                    },
                    {
                      opacity: 1,
                      y: 0,
                      duration: 0.5,
                      ease: 'power2.out'
                    }
                  );
                }
                currentIdx = idx;
                setActiveIdx(idx);
              }
            }
          });
          // Fade-in each step block as it enters
          const blocks =
          sectionRef.current?.querySelectorAll('[data-step-block]');
          blocks?.forEach((el) => {
            gsap.fromTo(
              el,
              {
                opacity: 0.3,
                y: 30
              },
              {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: el,
                  start: 'top 75%',
                  end: 'top 40%',
                  scrub: 0.5
                }
              }
            );
          });
          return () => {
            trigger.kill();
          };
        }
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={sectionRef}
      className="relative bg-white py-20 md:py-24">
      
      {/* Section intro */}
      <div className="container mb-12 md:mb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F6B5F] mb-4">
          How it works
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-end">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-[#1B1F1D] tracking-tight leading-[1.1] max-w-xl">
            How RESIKLO works in practice.
          </h2>
          <p className="text-[#66706A] leading-relaxed max-w-md md:justify-self-end">
            From the moment you open the camera to the moment you walk out the
            door — a four-step rhythm that turns guesswork into a quiet,
            confident decision.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 relative">
          {/* Progress rail */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none">
            <div className="absolute inset-0 bg-[#1B1F1D]/5" />
            <div
              ref={railRef}
              className="absolute top-0 left-0 right-0 bg-[#2F6B5F] origin-top"
              style={{
                height: '100%',
                transform: 'scaleY(0)'
              }} />
            
          </div>

          {/* Left: step blocks */}
          <div className="space-y-24 md:space-y-48">
            {steps.map((step, i) =>
            <div
              key={step.eyebrow}
              data-step-block
              className="md:min-h-[60vh] flex flex-col justify-center">
              
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7BAE7F] mb-4">
                  {step.eyebrow}
                </p>
                <h3 className="font-heading text-2xl md:text-3xl lg:text-4xl font-semibold text-[#1B1F1D] tracking-tight leading-tight mb-4">
                  {step.title}
                </h3>
                <p className="text-[#66706A] leading-relaxed mb-6 max-w-md">
                  {step.body}
                </p>
                <ul className="space-y-3">
                  {step.bullets.map((b) =>
                <li
                  key={b}
                  className="flex items-start gap-3 text-sm text-[#1B1F1D]">
                  
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#7BAE7F]/15 text-[#2F6B5F] mt-0.5">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                )}
                </ul>

                {/* Mobile inline phone for this step */}
                <div className="md:hidden mt-10 flex justify-center">
                  <PhoneFrame>
                    {i === 0 && <ScanScreen />}
                    {i === 1 && <AnalyzeScreen />}
                    {i === 2 && <MapScreen />}
                    {i === 3 && <LearnScreen />}
                  </PhoneFrame>
                </div>
              </div>
            )}
          </div>

          {/* Right: sticky phone (desktop) — uses CSS sticky so the phone
              stays fully visible in viewport while the left column scrolls */}
          <div className="hidden md:block">
            <div
              className="sticky flex justify-center items-center"
              style={{
                top: 'calc(50vh - 330px)',
                height: '660px',
              }}>
              
              <div className="relative">
                <PhoneFrame>
                  <div
                    ref={(el) => screenRefs.current[0] = el}
                    className="absolute inset-0">
                    
                    <ScanScreen />
                  </div>
                  <div
                    ref={(el) => screenRefs.current[1] = el}
                    className="absolute inset-0">
                    
                    <AnalyzeScreen />
                  </div>
                  <div
                    ref={(el) => screenRefs.current[2] = el}
                    className="absolute inset-0">
                    
                    <MapScreen />
                  </div>
                  <div
                    ref={(el) => screenRefs.current[3] = el}
                    className="absolute inset-0">
                    
                    <LearnScreen />
                  </div>
                </PhoneFrame>

                {/* Step indicator dots */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {steps.map((_, i) =>
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? 'w-6 bg-[#2F6B5F]' : 'w-1.5 bg-[#1B1F1D]/15'}`} />

                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

}
function PhoneFrame({ children }: {children: React.ReactNode;}) {
  return (
    <div className="relative">
      {/* Side button hint */}
      <div className="absolute -right-[3px] top-28 h-16 w-[3px] rounded-r bg-[#1B1F1D]" />
      <div className="absolute -left-[3px] top-20 h-8 w-[3px] rounded-l bg-[#1B1F1D]" />
      <div className="absolute -left-[3px] top-32 h-12 w-[3px] rounded-l bg-[#1B1F1D]" />
      <div className="absolute -left-[3px] top-48 h-12 w-[3px] rounded-l bg-[#1B1F1D]" />

      {/* Outer shell */}
      <div className="relative w-[290px] h-[600px] rounded-[3rem] bg-[#1B1F1D] p-[10px] shadow-[0_30px_80px_-20px_rgba(27,31,29,0.5),0_15px_30px_-10px_rgba(27,31,29,0.3)]">
        {/* Inner screen */}
        <div className="relative w-full h-full rounded-[2.4rem] bg-black overflow-hidden">
          {children}

          {/* Dynamic island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-6 w-[90px] rounded-full bg-black z-50 flex items-center justify-end pr-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#1B1F1D] ring-1 ring-[#7BAE7F]/40" />
          </div>
        </div>
      </div>
    </div>);

}