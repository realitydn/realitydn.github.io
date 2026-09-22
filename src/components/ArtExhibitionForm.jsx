import React from 'react';
import { URLS } from '../data/translations';
import useProposalForm, { isEmail, isUrl } from '../hooks/useProposalForm';
import { Field, ChoiceGroup, ReviewList, StepProgress, SubmitAlert, StepNav, Honeypot } from './FormFields';

// ArtExhibitionForm — the visual-art exhibition pitch. Same engine as
// EventProposalForm (useProposalForm + FormFields); only the fields differ.

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

export default function ArtExhibitionForm({ t, lang, onSuccess }) {
  const form = useProposalForm({
    type: 'art',
    initial: INITIAL,
    validate,
    kind: 'art',
    extra: {},
    workerPath: '/api/art-exhibition',
    lang,
    t,
    onSuccess,
  });
  const f = (k) => t.use(`artForm.${k}`);
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
    <form
      onSubmit={form.handleSubmit}
      noValidate
      className="pt-6 md:pt-8 max-w-2xl"
      style={{ borderTop: '2px solid var(--fg)' }}
    >
      <StepProgress form={form} t={t} ns="artForm" />

      {/* Step 1: About You */}
      {step === 1 && (
        <div className="space-y-4">
          {heading('step1Title')}
          <Field form={form} name="email" type="email" required autoComplete="email" label={f('email')} placeholder={f('emailPlaceholder')} />
          <Field form={form} name="name" required autoComplete="name" label={f('name')} placeholder={f('namePlaceholder')} />
          <Field form={form} name="artistCollectiveName" label={f('artistCollectiveName')} placeholder={f('artistCollectiveNamePlaceholder')} />
          <Field form={form} name="basedWhere" required label={f('basedWhere')} placeholder={f('basedWherePlaceholder')} />
          <Field form={form} name="contact" required label={f('contact')} placeholder={f('contactPlaceholder')} />
          <Field form={form} name="artistBio" required rows="4" label={f('artistBio')} placeholder={f('artistBioPlaceholder')} />
          <Field form={form} name="workLink" type="url" required inputMode="url" autoComplete="url" label={f('workLink')} placeholder={f('workLinkPlaceholder')} />
          <Honeypot form={form} />
        </div>
      )}

      {/* Step 2: About the Show */}
      {step === 2 && (
        <div className="space-y-4">
          {heading('step2Title')}
          <Field form={form} name="showDescription" required rows="5" label={f('showDescription')} placeholder={f('showDescriptionPlaceholder')} />
          <ChoiceGroup form={form} name="showAreas" multiple legend={f('showAreasLabel')} options={opts('showAreas', AREAS)} />
          <Field form={form} name="spaceAmount" required label={f('spaceAmount')} placeholder={f('spaceAmountPlaceholder')} />
          <Field form={form} name="technicalNeeds" rows="3" label={f('technicalNeeds')} placeholder={f('technicalNeedsPlaceholder')} />
        </div>
      )}

      {/* Step 3: Scheduling & Group Shows */}
      {step === 3 && (
        <div className="space-y-4">
          {heading('step3Title')}
          <Field form={form} name="preferredDate" required label={f('preferredDate')} placeholder={f('preferredDatePlaceholder')} />
          <ChoiceGroup form={form} name="flexibility" required legend={f('flexibilityLabel')} options={opts('flexibility', FLEXIBILITY)} />
          <ChoiceGroup form={form} name="isGroupShow" required legend={f('isGroupShowLabel')} options={opts('isGroupShow', GROUP)} />
          {data.isGroupShow === 'yes' && (
            <>
              <Field form={form} name="numArtists" required inputMode="numeric" label={f('numArtists')} placeholder={f('numArtistsPlaceholder')} />
              <Field form={form} name="curatorInfo" rows="3" label={f('curatorInfo')} placeholder={f('curatorInfoPlaceholder')} />
            </>
          )}
        </div>
      )}

      {/* Step 4: Review & Submit — values in words, never raw option codes */}
      {step === 4 && (
        <div className="space-y-4">
          {heading('step4Title')}

          <SubmitAlert form={form} t={t} ns="artForm" waUrl={URLS.WA} />

          {form.status !== 'success' && (
            <>
              <ReviewList
                rows={[
                  { label: f('email'), value: data.email },
                  { label: f('name'), value: data.name },
                  { label: f('basedWhere'), value: data.basedWhere },
                  { label: f('workLink'), value: data.workLink },
                  { label: f('flexibilityLabel'), value: data.flexibility && f(`flexibility.${data.flexibility}`) },
                  { label: f('isGroupShowLabel'), value: data.isGroupShow && f(`isGroupShow.${data.isGroupShow}`) },
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
            </>
          )}
        </div>
      )}

      <StepNav form={form} t={t} ns="artForm" />
    </form>
  );
}
