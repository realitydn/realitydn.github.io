import React from 'react';
import { Icons } from './Icons';
import Logo from './Logo';
import { URLS, STR } from '../data/translations';

export default function Footer({ lang }) {
  return (
    <footer className="section mt-10 bg-cream" style={{ borderTop: '3px solid var(--fg)' }}>
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <Logo className="h-7 w-auto mb-3" color="var(--fg)" />
          <p className="text-gray-700 font-body">86 Mai Thúc Lân, Đà Nẵng</p>
          <p className="text-gray-700 font-body">{STR[lang].hours}</p>
          <p className="text-gray-700 font-body">www.realitydn.com</p>
        </div>
        <div className="col-span-12 md:col-span-6 md:text-right">
          <div className="eyebrow text-gray-600">
            STAY IN TOUCH
          </div>
          <div className="mt-4 flex md:justify-end gap-3 flex-wrap">
            <a
              href={URLS.WA}
              target="_blank"
              rel="noreferrer"
              className="btn-primary px-5 py-3 text-sm flex items-center gap-2"
            >
              {Icons.whatsapp()} WhatsApp
            </a>
            <a
              href={URLS.IG}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary px-5 py-3 text-sm flex items-center gap-2"
            >
              {Icons.instagram()} Instagram
            </a>
            <a
              href={URLS.FB}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary px-5 py-3 text-sm flex items-center gap-2"
            >
              {Icons.facebook()} Facebook
            </a>
          </div>
        </div>
      </div>

      {/* Ticket strip — wordmark · tagline · QR, always in the Night scope */}
      <div
        className="scope-night"
        style={{
          backgroundColor: 'var(--bg)',
          color: 'var(--fg)',
          borderTop: '3px solid var(--fg)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left side - Logo and tagline */}
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <Logo className="h-8 md:h-10 w-auto" color="var(--fg)" />
              <div className="font-body text-sm md:text-base" style={{ color: 'var(--fg-dim)' }}>
                coffee / cocktails / community
              </div>
            </div>

            {/* Right side - QR Code */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="eyebrow text-[11px]" style={{ color: 'var(--fg-dim)' }}>
                  JOIN OUR COMMUNITY
                </div>
                <div className="font-body text-sm" style={{ color: 'var(--fg-dim)' }}>
                  Scan to join WhatsApp
                </div>
              </div>
              <div
                className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center"
                style={{
                  backgroundColor: '#fffbf1',
                  border: '2px solid var(--fg)',
                  boxShadow: 'var(--sh-default)',
                }}
              >
                <img
                  src="/images/whatsapp-qr.png"
                  alt="Scan to join the REALITY WhatsApp community"
                  className="w-full h-full object-contain p-1"
                  loading="lazy"
                  decoding="async"
                  width="96"
                  height="96"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span style="color:#0d0905" class="text-xs font-body text-center px-2">QR Code</span>';
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{ borderTop: '1px solid var(--hairline)' }}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-center text-xs font-body" style={{ color: 'var(--fg-faint)' }}>
              © {new Date().getFullYear()} REALITY · 86 Mai Thúc Lân, Đà Nẵng · www.realitydn.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
