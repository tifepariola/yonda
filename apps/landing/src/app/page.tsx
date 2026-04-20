'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import YondaLogo from './logo.png';
import BannerImage from './banner.jpg';
const WHATSAPP_LINK = 'https://wa.me/2348065471334';
const QR_URL =
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fwa.me%2F2348065471334&color=1E2A38&bgcolor=ffffff&margin=10&qzone=2';

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
      style={{ background: '#f5fff9', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-2">
        <Image src={YondaLogo} alt="Yonda" className="h-10 w-auto" />
   
      </div>
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-full hover:bg-navy/80 transition-colors"
      >
        <WhatsAppIcon className="w-4 h-4" />
        Talk to Kai
      </a>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      className="grain relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-32 md:pb-40 overflow-hidden"
      style={{ background: '#f5fff9' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4a9eff 0%, transparent 70%)' }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-navy/10 border border-navy/20 rounded-full px-4 py-1.5 mb-8 text-navy/80 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          Now live — try it free
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-navy leading-[1.05] tracking-tight mb-6">
          China payments,{' '}
          <span className="relative inline-block">
            <span className="relative z-10">sorted.</span>
            <span
              className="absolute inset-x-0 bottom-1 h-3 -z-10 opacity-40 bg-navy/50 rounded"
              // style={{ background: '#4a9eff' }}
            />
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-md md:text-lg text-navy/70 max-w-2xl mx-auto leading-relaxed mb-12">
          Buy Chinese Yuan with Naira and get it delivered straight to your Alipay or WeChat Pay
          — in minutes, right from WhatsApp. No bank visits. No stress.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-navy text-white font-bold text-base px-8 py-4 rounded-full hover:bg-navy/80 transition-all hover:scale-105 shadow-lg"
          >
            <WhatsAppIcon className="w-5 h-5 text-green-600" />
            Talk to Kai on WhatsApp
          </a>
          <a
            href="#how-it-works"
            className="text-navy/60 text-sm font-medium hover:text-navy/90 transition-colors flex items-center gap-1"
          >
            See how it works
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M4 9l4 4 4-4" />
            </svg>
          </a>
        </div>

        {/* Chat preview
        <div className="mt-20 max-w-sm mx-auto">
          <ChatPreview />
        </div> */}
      </div>
    </section>
  );
}

function Banner() {
  const rafRef = useRef<number>(0);
  const [scrollLift, setScrollLift] = useState(0);
  const [overlapBasePx, setOverlapBasePx] = useState(-96);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const syncBase = () => setOverlapBasePx(mq.matches ? -144 : -96);
    syncBase();
    mq.addEventListener('change', syncBase);
    return () => mq.removeEventListener('change', syncBase);
  }, []);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      // Pull banner further up over the hero as the user scrolls (capped for stability).
      setScrollLift(Math.min(y * 0.22, 72));
    };
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section
      className="relative z-20"
      style={{
        // Use margin (not translateY): transforms don't change layout height, which left a
        // strip of background below the image. Extra lift from scroll stays in normal flow.
        marginTop: `${overlapBasePx - scrollLift}px`,
        background: '#f5fff9',
      }}
    >
      <div className="overflow-hidden rounded-t-3xl">
        <Image
          src={BannerImage}
          alt="Yonda"
          className="w-full h-auto"
          sizes="(max-width: 1200px) 100vw, 1152px"
          priority
        />
      </div>
    </section>
  );
}

// ─── Chat preview mockup ──────────────────────────────────────────────────────
function ChatPreview() {
  return (
    <div
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* WhatsApp header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#1A2B3C' }}>
        <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
          K
        </div>
        <div className="text-left">
          <p className="text-white text-sm font-semibold leading-none">Kai by Yonda</p>
          <p className="text-green-400 text-xs mt-0.5">online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 py-5 space-y-3 text-sm">
        <div className="flex justify-start text-left">
          <div className="chat-bubble-kai text-white/90 px-4 py-2.5 max-w-[85%] leading-relaxed">
            Hi, I'm Kai. I help you buy Chinese Yuan with Naira. How much RMB do you need?
          </div>
        </div>
        <div className="flex justify-end text-right">
          <div className="chat-bubble-user text-white px-4 py-2.5 max-w-[80%] leading-relaxed">
            I need ¥2,000 to my Alipay
          </div>
        </div>
        <div className="flex justify-start text-left">
          <div className="chat-bubble-kai text-white/90 px-4 py-2.5 max-w-[85%] leading-relaxed">
            Got it. ¥2,000 RMB at today's rate comes to ₦462,000. What's your Alipay account?
          </div>
        </div>
        <div className="flex justify-end text-right">
          <div className="chat-bubble-user text-white px-4 py-2.5 max-w-[80%] leading-relaxed">
            +86 138 0013 8000
          </div>
        </div>
        <div className="flex justify-start text-left">
          <div className="chat-bubble-kai text-white/90 px-4 py-2.5 max-w-[85%] leading-relaxed">
            Perfect. Tap below to confirm and pay — your yuan will be delivered within 30 minutes.
          </div>
        </div>
        {/* CTA button in chat */}
        <div className="flex justify-start pl-0">
          <div
            className="rounded-2xl px-4 py-2.5 text-white/90 text-sm font-medium border border-white/20 flex items-center gap-2"
            style={{ background: '#2A3B4F' }}
          >
            <span>Confirm & Pay ₦462,000</span>
            <span className="text-xs opacity-60">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────
function TrustBar() {
  const stats = [
    { value: '2,000+', label: 'importers served' },
    { value: '₦3B+', label: 'processed' },
    { value: '< 30 min', label: 'delivery time' },
    { value: '4.9 ★', label: 'user satisfaction' },
  ];

  return (
    <section className="bg-cream py-10 px-6 border-b border-gray-200">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl md:text-3xl font-black text-navy">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Tell Kai what you need',
      body: 'Message Kai on WhatsApp with how much yuan you want to buy and where to send it — Alipay or WeChat Pay.',
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Pay with Naira',
      body: 'Kai sends you a secure payment link. Pay with your debit card or bank transfer — takes less than a minute.',
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 10h20" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Yuan hits your account',
      body: "Your RMB lands in your Alipay or WeChat Pay within 30 minutes. Kai will ping you the moment it's done.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-sm font-semibold text-navy/40 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl md:text-5xl font-black text-navy leading-tight">
            Three steps.
            <br />
            That's it.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="reveal relative"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="bg-cream rounded-3xl p-8 h-full hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-black text-navy/10 leading-none flex-1">{step.number}</span>
                  <div className="w-10 h-10 rounded-2xl bg-navy flex items-center justify-center text-white flex-shrink-0">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-navy mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{step.body}</p>
              </div>
              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why Yonda ────────────────────────────────────────────────────────────────
function WhyYonda() {
  const features = [
    {
      title: 'No bank visits',
      body: 'Everything happens in WhatsApp. Buy yuan from your phone, wherever you are.',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'Live rates, always',
      body: 'Kai quotes you the real NGN/CNY rate — updated throughout the day. No hidden markups.',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'Delivered in 30 minutes',
      body: 'Once you pay, your yuan lands in your Alipay or WeChat Pay account — fast.',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'Built for importers',
      body: "Whether you're buying ¥200 samples or ¥200,000 for a full shipment — Kai handles it.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'Fully secure',
      body: "Your identity is verified and your payment goes through Paystack — Nigeria's most trusted payment gateway.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'Alipay & WeChat Pay',
      body: 'Send yuan directly to the two accounts your Chinese suppliers actually use.',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: '#1E2A38' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-sm font-semibold text-white/30 uppercase tracking-widest mb-3">Why Yonda</p>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Everything you need,
            <br />
            nothing you don&apos;t.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="reveal rounded-2xl p-6 hover:bg-white/10 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                {f.icon}
              </div>
              <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Meet Kai ─────────────────────────────────────────────────────────────────
function MeetKai() {
  return (
    <section id="kai" className="bg-cream py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div className="reveal">
            <p className="text-sm font-semibold text-navy/40 uppercase tracking-widest mb-4">Meet Kai</p>
            <h2 className="text-4xl md:text-5xl font-black text-navy leading-tight mb-6">
              Your China payment
              <br />
              assistant, on WhatsApp.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Kai is the intelligence behind Yonda. Just message him on WhatsApp — tell him
              how much yuan you need, where to send it, and he handles everything from quote
              to delivery.
            </p>
            <p className="text-gray-500 leading-relaxed mb-10">
              No app to download. No account to create. If you have WhatsApp, you&apos;re ready.
            </p>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-navy text-white font-bold text-base px-8 py-4 rounded-full hover:bg-navy-light transition-all hover:scale-105 shadow-lg"
            >
              <WhatsAppIcon className="w-5 h-5 text-green-400" />
              Start talking to Kai
            </a>
          </div>

          {/* Right: QR + number */}
          <div className="reveal flex flex-col items-center md:items-end gap-6" style={{ transitionDelay: '150ms' }}>
            <div
              className="bg-white rounded-3xl p-8 shadow-xl flex flex-col items-center gap-5"
              style={{ border: '1px solid rgba(30,42,56,0.1)' }}
            >
              {/* QR */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '3px solid #1E2A38' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={QR_URL}
                  alt="QR code to open WhatsApp chat with Kai"
                  width={180}
                  height={180}
                  className="block"
                />
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                  Scan to chat on WhatsApp
                </p>
                <p className="text-navy font-bold text-base">+234 806 547 1334</p>
              </div>

              <div className="w-full flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <WhatsAppIcon className="w-4 h-4" />
                Open in WhatsApp
              </a>
            </div>

            <p className="text-xs text-gray-400 text-center max-w-[200px]">
              No app download needed. Works in WhatsApp on iOS and Android.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section
      className="py-28 px-6 relative overflow-hidden"
      style={{ background: '#1E2A38' }}
    >
      {/* Subtle glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #4a9eff 0%, transparent 70%)' }}
      />

      <div className="relative max-w-3xl mx-auto text-center reveal">
        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
          Ready to pay your
          <br />
          supplier in yuan?
        </h2>
        <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
          Message Kai on WhatsApp and get your first order done in minutes.
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-white text-navy font-bold text-lg px-10 py-5 rounded-full hover:bg-gray-100 transition-all hover:scale-105 shadow-2xl"
        >
          <WhatsAppIcon className="w-6 h-6 text-green-600" />
          Talk to Kai &mdash; it&apos;s free
        </a>
        <p className="text-white/30 text-sm mt-6">No app. No account. Just WhatsApp.</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      className="py-8 px-6 flex flex-col md:flex-row items-center justify-between gap-4"
      style={{ background: '#141D27', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-base tracking-tight">Yonda</span>
        <span className="text-white/20 text-sm">· China payments, sorted.</span>
      </div>
      <p className="text-white/30 text-xs">© {new Date().getFullYear()} Yonda. All rights reserved.</p>
      <div className="flex items-center gap-5">
        <a href={`mailto:hello@yonda.ng`} className="text-white/40 hover:text-white/70 text-xs transition-colors">
          hello@yonda.ng
        </a>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white/70 text-xs transition-colors flex items-center gap-1"
        >
          <WhatsAppIcon className="w-3 h-3" />
          WhatsApp
        </a>
      </div>
    </footer>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.527 5.855L0 24l6.335-1.652C8.05 23.292 9.984 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.847 0-3.575-.476-5.079-1.31l-.364-.216-3.762.981.999-3.671-.236-.375C2.49 15.782 2 13.959 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  useScrollReveal();

  return (
    <main>
      <Nav />
      <Hero />
      <Banner />
      <TrustBar />
      <HowItWorks />
      <WhyYonda />
      <MeetKai />
      <FinalCTA />
      <Footer />
    </main>
  );
}
