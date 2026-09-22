import React from 'react';
import { URLS } from '../data/translations';
import useProposalForm, { LAST_STEP } from '../hooks/useProposalForm';
import { Field, ChoiceGroup, ReviewList, StepProgress, SubmitAlert, StepNav, Honeypot } from './FormFields';

// ProposalForm — the one four-step proposal form. EventProposalForm and
// ArtExhibitionForm are configs over it: their fields, steps, validation and
// review rows are data (a `spec`); everything else — the state machine
// (useProposalForm: drafts, validation + focus, the hub + worker submit), the
// step chrome, the review step and the submit/alert UI — lives here once.
//
// spec = {
//   ns          locale namespace. Every string is derived from it:
//                 ns.<name> / ns.<name>Placeholder   text field label / placeholder
//                 ns.<name>Label / ns.<name>.<value> choice legend / option label
//                 ns.step<n>Title                    step heading (n = 1…4)
//   kind        the hub's proposal kind ('event' | 'art')
//   workerPath  the backup worker route
//   initial     the empty form data (module-level: drafts are read against it)
//   validate    (step, data) → { field: errorCode }
//   steps       three arrays of field specs, in reading order:
//                 { name, required?, type?, rows?, autoComplete?, inputMode? }  → <Field>
//                 { name, choice: [values], multiple?, required? }              → <ChoiceGroup>
//               either may carry when: (data) => bool to show it conditionally.
//               Step 1 always ends with the honeypot.
//   review      field names for the step-4 summary; choices print their
//               option labels, never the raw codes
// }
// Per-instance props: type (draft key + id prefix), extra (payload fields),
// reviewFooter (optional node under the submit buttons).

export default function ProposalForm({ spec, type, extra = {}, reviewFooter = null, t, lang, onSuccess }) {
  const form = useProposalForm({
    type,
    initial: spec.initial,
    validate: spec.validate,
    kind: spec.kind,
    extra,
    workerPath: spec.workerPath,
    lang,
    t,
    onSuccess,
  });
  const f = (k) => t.use(`${spec.ns}.${k}`);
  const { data, step } = form;

  const heading = (n) => (
    <h3
      ref={form.headingRef}
      tabIndex={-1}
      className="h-section text-xl md:text-2xl mb-6 scroll-mt-24"
    >
      {f(`step${n}Title`)}
    </h3>
  );

  const control = ({ name, choice, when, ...props }) => {
    if (when && !when(data)) return null;
    if (choice) {
      return (
        <ChoiceGroup
          key={name}
          form={form}
          name={name}
          legend={f(`${name}Label`)}
          options={choice.map((v) => ({ value: v, label: f(`${name}.${v}`) }))}
          {...props}
        />
      );
    }
    return (
      <Field key={name} form={form} name={name} label={f(name)} placeholder={f(`${name}Placeholder`)} {...props} />
    );
  };

  // Review rows — values in words: a choice prints its option label(s).
  const fieldSpecs = Object.fromEntries(spec.steps.flat().map((s) => [s.name, s]));
  const reviewRow = (name) => {
    const s = fieldSpecs[name] || {};
    const v = data[name];
    if (!s.choice) return { label: f(name), value: v };
    return {
      label: f(`${name}Label`),
      value: s.multiple ? v.map((x) => f(`${name}.${x}`)).join(', ') : v && f(`${name}.${v}`),
    };
  };

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
      <StepProgress form={form} t={t} ns={spec.ns} />

      {/* Steps 1–3: the spec's fields */}
      {spec.steps.map((fields, i) =>
        step === i + 1 ? (
          <div key={i} className="space-y-4">
            {heading(i + 1)}
            {fields.map(control)}
            {i === 0 && <Honeypot form={form} />}
          </div>
        ) : null
      )}

      {/* Step 4: Review & Submit */}
      {step === LAST_STEP && (
        <div className="space-y-4">
          {heading(LAST_STEP)}

          <SubmitAlert form={form} t={t} ns={spec.ns} waUrl={URLS.WA} />

          {form.status !== 'success' && (
            <>
              <ReviewList rows={spec.review.map(reviewRow)} />

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

              {reviewFooter}
            </>
          )}
        </div>
      )}

      <StepNav form={form} t={t} ns={spec.ns} />
    </form>
  );
}
