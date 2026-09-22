import React from 'react';
import { URLS } from '../data/translations';
import { pathFor } from '../data/languages';
import useProposalForm, { isEmail } from '../hooks/useProposalForm';
import { Field, ChoiceGroup, ReviewList, StepProgress, SubmitAlert, StepNav, Honeypot } from './FormFields';

// EventProposalForm — the public AND private/paid event pitch (InfoHostSection
// mounts it for both tabs). `type` says which: it keys the saved draft and
// rides in the payload as eventType, so the Control Room can tell a private
// hire from a community event. The hub's proposal `kind` stays 'event' — its
// schema only accepts 'event' | 'art' (REALITYApp src/app/api/proposals).

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

export default function EventProposalForm({ t, lang, type = 'public', onSuccess }) {
  const form = useProposalForm({
    type: `event-${type}`,
    initial: INITIAL,
    validate,
    kind: 'event',
    extra: { eventType: type },
    workerPath: '/api/event-proposal',
    lang,
    t,
    onSuccess,
  });
  const f = (k) => t.use(`eventForm.${k}`);
  const opts = (group, values) => values.map((v) => ({ value: v, label: f(`${group}.${v}`) }));
  const { data, step } = form;

  const heading = (key) => (
    <h3
      ref={form.headingRef}
      tabIndex={-1}
      className="h-section text-xl md:text-2xl mb-6 scroll-mt-24"
    >
      {f(key)}
    </h3>
  );

  return (
    // Rules-on-paper (ink pass 22.08.26): the card-static shell grounded the
    // form against the old parallax collage; on the flat paper band the form
    // is fields on paper under a 2px ink rule — the inputs carry their own
    // ink borders.
    <form
      onSubmit={form.handleSubmit}
      noValidate
      className="pt-6 md:pt-8 max-w-2xl"
      style={{ borderTop: '2px solid var(--fg)' }}
    >
      <StepProgress form={form} t={t} ns="eventForm" />

      {/* Step 1: About You */}
      {step === 1 && (
        <div className="space-y-4">
          {heading('step1Title')}
          <Field form={form} name="email" type="email" required autoComplete="email" label={f('email')} placeholder={f('emailPlaceholder')} />
          <Field form={form} name="hostName" required autoComplete="name" label={f('hostName')} placeholder={f('hostNamePlaceholder')} />
          <Field form={form} name="organization" autoComplete="organization" label={f('organization')} placeholder={f('organizationPlaceholder')} />
          <Field form={form} name="contact" required label={f('contact')} placeholder={f('contactPlaceholder')} />
          <Honeypot form={form} />
        </div>
      )}

      {/* Step 2: About the Event */}
      {step === 2 && (
        <div className="space-y-4">
          {heading('step2Title')}
          <Field form={form} name="eventTitle" required label={f('eventTitle')} placeholder={f('eventTitlePlaceholder')} />
          <Field form={form} name="eventDescription" required rows="4" label={f('eventDescription')} placeholder={f('eventDescriptionPlaceholder')} />
          <ChoiceGroup form={form} name="recurrence" required legend={f('recurrenceLabel')} options={opts('recurrence', RECURRENCE)} />
          <Field form={form} name="daysAndTimes" required rows="3" label={f('daysAndTimes')} placeholder={f('daysAndTimesPlaceholder')} />
          <Field form={form} name="duration" required label={f('duration')} placeholder={f('durationPlaceholder')} />
          <Field form={form} name="eventCost" required label={f('eventCost')} placeholder={f('eventCostPlaceholder')} />
        </div>
      )}

      {/* Step 3: Logistics */}
      {step === 3 && (
        <div className="space-y-4">
          {heading('step3Title')}
          <ChoiceGroup form={form} name="languages" multiple required legend={f('languagesLabel')} options={opts('languages', LANGUAGES)} />
          <ChoiceGroup form={form} name="preferredSpace" multiple required legend={f('preferredSpaceLabel')} options={opts('preferredSpace', SPACES)} />
          <ChoiceGroup form={form} name="equipment" multiple legend={f('equipmentLabel')} options={opts('equipment', EQUIPMENT)} />
          <Field form={form} name="anythingElse" rows="3" label={f('anythingElse')} placeholder={f('anythingElsePlaceholder')} />
        </div>
      )}

      {/* Step 4: Review & Submit — values in words, never raw option codes */}
      {step === 4 && (
        <div className="space-y-4">
          {heading('step4Title')}

          <SubmitAlert form={form} t={t} ns="eventForm" waUrl={URLS.WA} />

          {form.status !== 'success' && (
            <>
              <ReviewList
                rows={[
                  { label: f('email'), value: data.email },
                  { label: f('hostName'), value: data.hostName },
                  { label: f('eventTitle'), value: data.eventTitle },
                  { label: f('recurrenceLabel'), value: data.recurrence && f(`recurrence.${data.recurrence}`) },
                  { label: f('languagesLabel'), value: data.languages.map((v) => f(`languages.${v}`)).join(', ') },
                  { label: f('preferredSpaceLabel'), value: data.preferredSpace.map((v) => f(`preferredSpace.${v}`)).join(', ') },
                ]}
              />

              <div className="flex gap-2">
                <button type="button" onClick={form.back} className="btn-secondary px-5 py-3 text-sm">
                  {f('back')}
                </button>
                <button
                  type="submit"
                  disabled={form.loading}
                  className="btn-primary px-5 py-3 text-sm disabled:opacity-50"
                >
                  {form.loading ? f('submitting') : f('submit')}
                </button>
              </div>

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
            </>
          )}
        </div>
      )}

      <StepNav form={form} t={t} ns="eventForm" />
    </form>
  );
}
