import React from 'react';
import { pathFor } from '../data/languages';
import { isEmail } from '../hooks/useProposalForm';
import ProposalForm from './ProposalForm';

// EventProposalForm — the public AND private/paid event pitch (InfoHostSection
// mounts it for both tabs). `type` says which: it keys the saved draft and
// rides in the payload as eventType, so the Control Room can tell a private
// hire from a community event. The hub's proposal `kind` stays 'event' — its
// schema only accepts 'event' | 'art' (REALITYApp src/app/api/proposals).
//
// A config over ProposalForm (see there for the spec format): the fields,
// steps, validation and review rows below are all that is event-specific.

const INITIAL = {
  email: '',
  hostName: '',
  organization: '',
  contact: '',
  eventTitle: '',
  eventDescription: '',
  recurrence: '',
  daysAndTimes: '',
  duration: '',
  eventCost: '',
  languages: [],
  preferredSpace: [],
  equipment: [],
  anythingElse: '',
  honeypot: '',
};

const RECURRENCE = ['one-time', 'weekly', 'biweekly', 'monthly', 'discuss'];
const LANGUAGES = ['english', 'vietnamese', 'russian', 'ukrainian', 'other'];
const SPACES = ['1l', '2l', '2e', '3p', 'unsure'];
const EQUIPMENT = ['projector', 'microphones', 'laptop', 'dj', 'piano', 'seating', 'none', 'other'];

// Error CODES, not sentences — the form renders formErrors.<code> in the
// visitor's language. Insertion order = reading order = focus order.
function validate(step, d) {
  const e = {};
  if (step === 1) {
    if (!d.email.trim()) e.email = 'required';
    else if (!isEmail(d.email)) e.email = 'email';
    if (!d.hostName.trim()) e.hostName = 'required';
    if (!d.contact.trim()) e.contact = 'required';
  } else if (step === 2) {
    if (!d.eventTitle.trim()) e.eventTitle = 'required';
    if (!d.eventDescription.trim()) e.eventDescription = 'required';
    if (!d.recurrence) e.recurrence = 'pickOption';
    if (!d.daysAndTimes.trim()) e.daysAndTimes = 'required';
    if (!d.duration.trim()) e.duration = 'required';
    if (!d.eventCost.trim()) e.eventCost = 'required';
  } else if (step === 3) {
    if (d.languages.length === 0) e.languages = 'pickOne';
    if (d.preferredSpace.length === 0) e.preferredSpace = 'pickOne';
  }
  return e;
}

const SPEC = {
  ns: 'eventForm',
  kind: 'event',
  workerPath: '/api/event-proposal',
  initial: INITIAL,
  validate,
  steps: [
    // 1: About You
    [
      { name: 'email', type: 'email', required: true, autoComplete: 'email' },
      { name: 'hostName', required: true, autoComplete: 'name' },
      { name: 'organization', autoComplete: 'organization' },
      { name: 'contact', required: true },
    ],
    // 2: About the Event
    [
      { name: 'eventTitle', required: true },
      { name: 'eventDescription', required: true, rows: '4' },
      { name: 'recurrence', choice: RECURRENCE, required: true },
      { name: 'daysAndTimes', required: true, rows: '3' },
      { name: 'duration', required: true },
      { name: 'eventCost', required: true },
    ],
    // 3: Logistics
    [
      { name: 'languages', choice: LANGUAGES, multiple: true, required: true },
      { name: 'preferredSpace', choice: SPACES, multiple: true, required: true },
      { name: 'equipment', choice: EQUIPMENT, multiple: true },
      { name: 'anythingElse', rows: '3' },
    ],
  ],
  review: ['email', 'hostName', 'eventTitle', 'recurrence', 'languages', 'preferredSpace'],
};

export default function EventProposalForm({ t, lang, type = 'public', onSuccess }) {
  const f = (k) => t.use(`eventForm.${k}`);
  return (
    <ProposalForm
      spec={SPEC}
      type={`event-${type}`}
      extra={{ eventType: type }}
      t={t}
      lang={lang}
      onSuccess={onSuccess}
      reviewFooter={
        <p className="font-body text-sm text-gray-600 mt-4">
          {f('guidelinesPrefix')}{' '}
          <a
            href={pathFor(lang, '/event-guidelines')}
            target="_blank"
            rel="noreferrer"
            className="font-title underline"
          >
            {f('guidelinesLink')}
          </a>
        </p>
      }
    />
  );
}
