import React from 'react';
import { isEmail, isUrl } from '../hooks/useProposalForm';
import ProposalForm from './ProposalForm';

// ArtExhibitionForm — the visual-art exhibition pitch. A config over
// ProposalForm (see there for the spec format), like EventProposalForm; only
// the fields differ.

const INITIAL = {
  email: '',
  name: '',
  artistCollectiveName: '',
  basedWhere: '',
  contact: '',
  artistBio: '',
  workLink: '',
  showDescription: '',
  showAreas: [],
  spaceAmount: '',
  technicalNeeds: '',
  preferredDate: '',
  flexibility: '',
  isGroupShow: '',
  numArtists: '',
  curatorInfo: '',
  honeypot: '',
};

const AREAS = ['floor1', 'floor2l', 'floor2e', 'rooftop'];
const FLEXIBILITY = ['veryFlexible', 'somewhat', 'fixed'];
const GROUP = ['yes', 'no'];

// Error CODES, not sentences — rendered as formErrors.<code> in the
// visitor's language. Insertion order = reading order = focus order.
function validate(step, d) {
  const e = {};
  if (step === 1) {
    if (!d.email.trim()) e.email = 'required';
    else if (!isEmail(d.email)) e.email = 'email';
    if (!d.name.trim()) e.name = 'required';
    if (!d.basedWhere.trim()) e.basedWhere = 'required';
    if (!d.contact.trim()) e.contact = 'required';
    if (!d.artistBio.trim()) e.artistBio = 'required';
    if (!d.workLink.trim()) e.workLink = 'required';
    else if (!isUrl(d.workLink)) e.workLink = 'url';
  } else if (step === 2) {
    if (!d.showDescription.trim()) e.showDescription = 'required';
    if (!d.spaceAmount.trim()) e.spaceAmount = 'required';
  } else if (step === 3) {
    if (!d.preferredDate.trim()) e.preferredDate = 'required';
    if (!d.flexibility) e.flexibility = 'pickOption';
    if (!d.isGroupShow) e.isGroupShow = 'pickOption';
    if (d.isGroupShow === 'yes' && !d.numArtists.trim()) e.numArtists = 'required';
  }
  return e;
}

// The group-show follow-ups only appear once "yes" is picked.
const groupShow = (d) => d.isGroupShow === 'yes';

const SPEC = {
  ns: 'artForm',
  kind: 'art',
  workerPath: '/api/art-exhibition',
  initial: INITIAL,
  validate,
  steps: [
    // 1: About You
    [
      { name: 'email', type: 'email', required: true, autoComplete: 'email' },
      { name: 'name', required: true, autoComplete: 'name' },
      { name: 'artistCollectiveName' },
      { name: 'basedWhere', required: true },
      { name: 'contact', required: true },
      { name: 'artistBio', required: true, rows: '4' },
      { name: 'workLink', type: 'url', required: true, inputMode: 'url', autoComplete: 'url' },
    ],
    // 2: About the Show
    [
      { name: 'showDescription', required: true, rows: '5' },
      { name: 'showAreas', choice: AREAS, multiple: true },
      { name: 'spaceAmount', required: true },
      { name: 'technicalNeeds', rows: '3' },
    ],
    // 3: Scheduling & Group Shows
    [
      { name: 'preferredDate', required: true },
      { name: 'flexibility', choice: FLEXIBILITY, required: true },
      { name: 'isGroupShow', choice: GROUP, required: true },
      { name: 'numArtists', required: true, inputMode: 'numeric', when: groupShow },
      { name: 'curatorInfo', rows: '3', when: groupShow },
    ],
  ],
  review: ['email', 'name', 'basedWhere', 'workLink', 'flexibility', 'isGroupShow'],
};

export default function ArtExhibitionForm({ t, lang, onSuccess }) {
  return <ProposalForm spec={SPEC} type="art" t={t} lang={lang} onSuccess={onSuccess} />;
}
