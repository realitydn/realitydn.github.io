import React from 'react';

// FormFields — the labelled controls both proposal forms are built from.
// Every field gets the full wiring the hand-rolled markup was missing:
// id ↔ htmlFor, aria-invalid + aria-describedby pointing at its error, the
// .field-error border, and a ref the form uses to focus it when its step
// fails validation. Choice groups are real <fieldset>/<legend>s so a screen
// reader announces "Languages, group" before the first checkbox.
//
// `form` is the object useProposalForm returns.

function Required() {
  // The asterisk is visual shorthand; aria-required carries the fact.
  return <span aria-hidden="true"> *</span>;
}

export function Field({
  form,
  name,
  label,
  required = false,
  type = 'text',
  rows,
  placeholder,
  autoComplete,
  inputMode,
}) {
  const id = `${form.idBase}-${name}`;
  const code = form.errors[name];
  const errId = `${id}-error`;
  const common = {
    id,
    name,
    ref: form.register(name),
    value: form.data[name],
    onChange: form.onInput,
    className: `field${code ? ' field-error' : ''}`,
    placeholder,
    autoComplete,
    'aria-required': required || undefined,
    'aria-invalid': code ? 'true' : undefined,
    'aria-describedby': code ? errId : undefined,
  };
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <Required />}
      </label>
      {rows ? (
        <textarea {...common} rows={rows} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} />
      )}
      {code && (
        <p id={errId} className="field-hint-error">
          {form.message(code)}
        </p>
      )}
    </div>
  );
}

// Radio (single) or checkbox (multiple) group. options: [{ value, label }].
export function ChoiceGroup({ form, name, legend, options, multiple = false, required = false }) {
  const code = form.errors[name];
  const errId = `${form.idBase}-${name}-error`;
  const value = form.data[name];
  return (
    <fieldset
      aria-describedby={code ? errId : undefined}
      aria-required={required || undefined}
    >
      <legend className="field-label mb-3">
        {legend}
        {required && <Required />}
      </legend>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              ref={i === 0 ? form.register(name) : undefined}
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              value={opt.value}
              checked={multiple ? value.includes(opt.value) : value === opt.value}
              onChange={(e) =>
                multiple
                  ? form.toggle(name, opt.value, e.target.checked)
                  : form.pick(name, opt.value)
              }
              aria-invalid={code ? 'true' : undefined}
              className="shrink-0"
            />
            <span className="font-body">{opt.label}</span>
          </label>
        ))}
      </div>
      {code && (
        <p id={errId} className="field-hint-error">
          {form.message(code)}
        </p>
      )}
    </fieldset>
  );
}

// The review step's summary box: rows of { label, value } (value already in
// words — never a raw option code). Empty values drop out.
export function ReviewList({ rows }) {
  return (
    <dl
      className="space-y-4 p-4"
      style={{ border: '2px solid var(--hairline)', background: 'var(--surface-2)' }}
    >
      {rows
        .filter((r) => r.value)
        .map((r) => (
          <div key={r.label}>
            <dt className="field-label mb-1 text-gray-600">{r.label}</dt>
            <dd className="font-body whitespace-pre-wrap">{r.value}</dd>
          </div>
        ))}
    </dl>
  );
}

// Step chrome shared by both forms: the stamped progress squares, the
// "Step n of 4" line, the restored-draft note and the submit alerts.
export function StepProgress({ form, t, ns }) {
  return (
    <>
      <div className="mb-8 flex justify-between items-center" aria-hidden="true">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-9 h-9 shrink-0 flex items-center justify-center font-title font-bold text-sm border-2 transition-colors ${
                form.step >= num
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-transparent text-ink/40 border-ink/25'
              }`}
              style={form.step === num ? { boxShadow: 'var(--sh-light)' } : undefined}
            >
              {num}
            </div>
            {num < 4 && (
              <div
                className={`h-[2px] mx-2 md:mx-3 flex-1 ${
                  form.step > num ? 'bg-ink' : 'bg-ink/20'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <p className="font-body text-sm text-gray-600">
          {t.use(`${ns}.step`)} {form.step} {t.use(`${ns}.of`)} 4
        </p>
      </div>

      {form.restored && form.status !== 'success' && (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 p-3 font-body text-sm"
          style={{ border: '2px solid var(--hairline)', background: 'var(--surface-2)' }}
        >
          <span>{t.use('formDraft.restored')}</span>
          <button type="button" onClick={form.startOver} className="btn-secondary px-3 py-2 text-xs">
            {t.use('formDraft.clear')}
          </button>
        </div>
      )}
    </>
  );
}

export function SubmitAlert({ form, t, ns, waUrl }) {
  if (form.status === 'success') {
    return (
      <div className="alert-success" role="status">
        <p className="flex items-center gap-2">
          <span aria-hidden="true">✓</span> {t.use(`${ns}.successMessage`)}
        </p>
      </div>
    );
  }
  if (form.status !== 'error' && form.status !== 'timeout') return null;
  return (
    <div className="alert-error" role="alert" ref={form.alertRef} tabIndex={-1}>
      <p>{form.status === 'timeout' ? t.use('formErrors.timeout') : t.use(`${ns}.errorMessage`)}</p>
      <p className="mt-2 text-sm">
        {t.use(`${ns}.fallbackMessage`)}{' '}
        <a href={waUrl} target="_blank" rel="noreferrer" className="font-title underline">
          WhatsApp
        </a>
      </p>
    </div>
  );
}

// Back / Next / Review for steps 1–3.
export function StepNav({ form, t, ns }) {
  if (form.step >= 4 || form.status === 'success') return null;
  return (
    <div className="flex gap-2 mt-8">
      {form.step > 1 && (
        <button type="button" onClick={form.back} className="btn-secondary px-5 py-3 text-sm">
          {t.use(`${ns}.back`)}
        </button>
      )}
      <button type="button" onClick={form.next} className="btn-primary px-5 py-3 text-sm">
        {form.step < 3 ? t.use(`${ns}.next`) : t.use(`${ns}.review`)}
      </button>
    </div>
  );
}

// The honeypot — the HTML name is deliberately not one of the common
// autofill targets (email/name/phone/website/address/...) so password
// managers and aggressive autofill (Brave/Cốc Cốc/iOS Safari, 1Password,
// LastPass) leave it alone. The data-* hints reinforce the opt-out for the
// major password managers. Bots that fill every input still trip the trap.
export function Honeypot({ form }) {
  return (
    <input
      type="text"
      name="hp_field"
      value={form.data.honeypot}
      onChange={(e) => form.setData((prev) => ({ ...prev, honeypot: e.target.value }))}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
      }}
      tabIndex="-1"
      autoComplete="off"
      aria-hidden="true"
      data-1p-ignore="true"
      data-lpignore="true"
    />
  );
}
