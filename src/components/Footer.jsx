import React from 'react';
import { Icons } from './Icons';
import Logo from './Logo';
import { URLS, STR } from '../data/translations';

export default function Footer({ lang }) {
  return (
    <footer className="section border-t border-ink/10 mt-10 bg-cream">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <Logo className="h-7 w-auto mb-3" color="#0d0906" />
          <p className="text-gray-700 font-body">86 Mai Thúc Lân, Đà Nẵng</p>
          <p className="text-gray-700 font-body">{STR[lang].hours}</p>
        </div>
        <div className="col-span-12 md:col-span-6 md:text-right">
          <div className="font-title text-xs tracking-[0.2em] text-gray-600">
            STAY IN TOUCH
          </div>
          <div className="mt-4 flex md:justify-end gap-3 flex-wrap">
            <a 
              href={URLS.WA} 
              target="_blank" 
              rel="noreferrer" 
              className="btn-primary px-5 py-3 flex items-center gap-2 font-title text-sm tracking-[0.15em]"
            >
              {Icons.whatsapp('#FFFBF2')} WhatsApp
            </a>
            <a 
              href={URLS.IG} 
              target="_blank" 
              rel="noreferrer" 
              className="btn-secondary px-5 py-3 flex items-center gap-2 font-title text-sm tracking-[0.15em]"
            >
              {Icons.instagram()} Instagram
            </a>
            <a 
              href={URLS.FB} 
              target="_blank" 
              rel="noreferrer" 
              className="btn-secondary px-5 py-3 flex items-center gap-2 font-title text-sm tracking-[0.15em]"
            >
              {Icons.facebook()} Facebook
            </a>
          </div>
        </div>
      </div>

      {/* QR Strip - WhatsApp Community */}
      <div className="border-t border-ink/10 bg-ink text-cream">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left side - Logo and tagline */}
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <Logo className="h-8 md:h-10 w-auto" color="#FFFBF2" />
              <div className="font-body text-gray-300 text-sm md:text-base">
                coffee / cocktails / community
              </div>
            </div>
            
            {/* Right side - QR Code */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="font-title text-xs tracking-[0.15em] text-gray-400">
                  JOIN OUR COMMUNITY
                </div>
                <div className="font-body text-sm text-gray-300">
                  Scan to join WhatsApp
                </div>
              </div>
              {/* QR Code placeholder - user should replace with actual QR */}
              <div 
                className="w-20 h-20 md:w-24 md:h-24 bg-cream flex items-center justify-center"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
              >
                <img 
                  src="/images/whatsapp-qr.png" 
                  alt="WhatsApp QR Code" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-ink text-xs font-body text-center px-2">QR Code</span>';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-ink text-cream border-t border-cream/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-400 font-body">
            © {new Date().getFullYear()} REALITY. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
