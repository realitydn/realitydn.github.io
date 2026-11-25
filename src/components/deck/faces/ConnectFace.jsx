import React from 'react';
import DeckCard from '../DeckCard';
import { fill } from '../parts';
import { Icons } from '../../Icons';

// 08 · Get connected — the ways in, by name: four chips on the wide card, a
// list of four names on the phone card (four bare icons said nothing there).
// The links themselves are in the opened card
// (./sections/ConnectSection.jsx), which is where to add one.
export const WAYS_IN = [
  { key: 'app', icon: 'app' },
  { key: 'instagram', icon: 'instagram', label: 'Instagram' },
  { key: 'facebook', icon: 'facebook', label: 'Facebook' },
  { key: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp' },
];

export default function ConnectFace({ card, no, t }) {
  return (
    <DeckCard card={card} no={no} t={t} meta={fill(t.use('deck.connect.ways'), { n: WAYS_IN.length })}>
      <span className="dk-chips">
        {WAYS_IN.map((w) => (
          <span key={w.key}>
            {Icons[w.icon]()}
            <span>{w.label || t.use('deck.connect.app')}</span>
          </span>
        ))}
      </span>
      <span className="dk-fact dk-x dk-clamp2">{t.use('getApp.blurb')}</span>
    </DeckCard>
  );
}
