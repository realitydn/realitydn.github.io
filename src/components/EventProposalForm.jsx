import React, { useEffect, useState } from 'react';
import { URLS } from '../data/translations';

// Proposals now POST cross-origin to the hub (Plan B). The hub's
// /api/proposals route CORS-allows realitydn.com and is dormant-safe
// (no Turnstile secret yet → accepts + flags the submission).
const HUB = (import.meta.env.VITE_HUB_URL || 'https://app.realitydn.com').replace(/\/$/, '');

// Cloudflare Turnstile. Falsy site key → render nothing and submit with no
// token; the hub accepts unverified submissions until TURNSTILE_SECRET is set.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const TURNSTILE_API_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

export default function EventProposalForm({ t, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
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
  });

  // Load the Turnstile script once, only when a site key is configured.
  // When no key is set the widget renders nothing and we submit without a
  // token (the hub accepts unverified submissions in that case).
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (document.querySelector(`script[src="${TURNSTILE_API_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = TURNSTILE_API_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const validateStep = (stepNum) => {
    const newErrors = {};

    if (stepNum === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.hostName) newErrors.hostName = 'Host name is required';
      if (!formData.contact) newErrors.contact = 'Contact is required';
    } else if (stepNum === 2) {
      if (!formData.eventTitle) newErrors.eventTitle = 'Event title is required';
      if (!formData.eventDescription) newErrors.eventDescription = 'Description is required';
      if (!formData.recurrence) newErrors.recurrence = 'Recurrence is required';
      if (!formData.daysAndTimes) newErrors.daysAndTimes = 'Days and times are required';
      if (!formData.duration) newErrors.duration = 'Duration is required';
      if (!formData.eventCost) newErrors.eventCost = 'Event cost is required';
    } else if (stepNum === 3) {
      if (formData.languages.length === 0) newErrors.languages = 'Please select at least one language';
      if (formData.preferredSpace.length === 0) newErrors.preferredSpace = 'Please select at least one space';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleCheckboxChange = (e, fieldName) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [fieldName]: checked
        ? [...prev[fieldName], value]
        : prev[fieldName].filter((item) => item !== value),
    }));
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: '',
      }));
    }
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Honeypot tripped: fake a success so bots don't retry, but never POST.
    // Browsers like Brave/Cốc Cốc/iOS Safari and password managers can
    // autofill hidden fields, so a silent return would block real users too —
    // showing the thank-you screen at least keeps them moving.
    if (formData.honeypot) {
      setSubmitStatus('success');
      setStep(1);
      if (typeof onSuccess === 'function') onSuccess();
      return;
    }

    if (!validateStep(3)) return;

    setLoading(true);
    setSubmitStatus(null);

    try {
      const turnstileToken =
        (TURNSTILE_SITE_KEY && window.turnstile?.getResponse()) || undefined;

      // Notion-era pipeline stays live as a backup while the hub beds in —
      // fire-and-forget to the same-origin worker (Notion + Sheets + the Resend
      // confirmation email). Sent first so a hub outage can't lose the pitch;
      // only the hub response below drives the success/error UX.
      fetch('/api/event-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).catch(() => {});

      const response = await fetch(`${HUB}/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'event', ...formData, turnstileToken }),
      });

      // Guard against the SPA catch-all serving index.html if a misconfigured
      // origin ever returns it — a 200 with text/html would otherwise look
      // like a successful submit.
      const contentType = response.headers.get('content-type') || '';
      const gotJson = contentType.includes('application/json');

      if (response.ok && gotJson) {
        setSubmitStatus('success');
        setFormData({
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
        });
        setStep(1);
        // Hand off to parent — renders a full-size thank-you in place of the
        // form so the user stays on the main page instead of staring at a
        // half-collapsed step 4.
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-static p-6 md:p-8 max-w-2xl">
      {/* Progress indicator — stamped squares on a rule */}
      <div className="mb-8 flex justify-between items-center">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-9 h-9 shrink-0 flex items-center justify-center font-title font-bold text-sm border-2 transition-colors ${
                step >= num
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-transparent text-ink/40 border-ink/25'
              }`}
              style={step === num ? { boxShadow: 'var(--sh-light)' } : undefined}
              aria-current={step === num ? 'step' : undefined}
            >
              {num}
            </div>
            {num < 4 && (
              <div
                className={`h-[2px] mx-2 md:mx-3 flex-1 ${
                  step > num ? 'bg-ink' : 'bg-ink/20'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <p className="font-body text-sm text-gray-600">
          {t.use('eventForm.step')} {step} {t.use('eventForm.of')} 4
        </p>
      </div>

      {/* Step 1: About You */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('eventForm.step1Title')}</h3>

          <div>
            <label className="field-label">
              {t.use('eventForm.email')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.emailPlaceholder')}
            />
            {errors.email && <p className="field-hint-error">{errors.email}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.hostName')} *
            </label>
            <input
              type="text"
              name="hostName"
              value={formData.hostName}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.hostNamePlaceholder')}
            />
            {errors.hostName && <p className="field-hint-error">{errors.hostName}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.organization')}
            </label>
            <input
              type="text"
              name="organization"
              value={formData.organization}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.organizationPlaceholder')}
            />
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.contact')} *
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.contactPlaceholder')}
            />
            {errors.contact && <p className="field-hint-error">{errors.contact}</p>}
          </div>

          {/* Honeypot — the HTML name is deliberately not one of the common
              autofill targets (email/name/phone/website/address/...) so
              password managers and aggressive autofill (Brave/Cốc Cốc/iOS
              Safari, 1Password, LastPass) leave it alone. The data-* hints
              reinforce the opt-out for the major password managers. Bots
              that fill every input still trip the trap. */}
          <input
            type="text"
            name="hp_field"
            value={formData.honeypot}
            onChange={(e) => setFormData((prev) => ({ ...prev, honeypot: e.target.value }))}
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
        </div>
      )}

      {/* Step 2: About the Event */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('eventForm.step2Title')}</h3>

          <div>
            <label className="field-label">
              {t.use('eventForm.eventTitle')} *
            </label>
            <input
              type="text"
              name="eventTitle"
              value={formData.eventTitle}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.eventTitlePlaceholder')}
            />
            {errors.eventTitle && <p className="field-hint-error">{errors.eventTitle}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.eventDescription')} *
            </label>
            <textarea
              name="eventDescription"
              value={formData.eventDescription}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.eventDescriptionPlaceholder')}
              rows="4"
            />
            {errors.eventDescription && <p className="field-hint-error">{errors.eventDescription}</p>}
          </div>

          <div>
            <label className="field-label mb-3">
              {t.use('eventForm.recurrenceLabel')} *
            </label>
            <div className="space-y-2">
              {['one-time', 'weekly', 'biweekly', 'monthly', 'discuss'].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recurrence"
                    value={option}
                    checked={formData.recurrence === option}
                    onChange={handleRadioChange}
                    className="shrink-0"
                  />
                  <span className="font-body">{t.use(`eventForm.recurrence.${option}`)}</span>
                </label>
              ))}
            </div>
            {errors.recurrence && <p className="field-hint-error">{errors.recurrence}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.daysAndTimes')} *
            </label>
            <textarea
              name="daysAndTimes"
              value={formData.daysAndTimes}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.daysAndTimesPlaceholder')}
              rows="3"
            />
            {errors.daysAndTimes && <p className="field-hint-error">{errors.daysAndTimes}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.duration')} *
            </label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.durationPlaceholder')}
            />
            {errors.duration && <p className="field-hint-error">{errors.duration}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.eventCost')} *
            </label>
            <input
              type="text"
              name="eventCost"
              value={formData.eventCost}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.eventCostPlaceholder')}
            />
            {errors.eventCost && <p className="field-hint-error">{errors.eventCost}</p>}
          </div>
        </div>
      )}

      {/* Step 3: Logistics */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('eventForm.step3Title')}</h3>

          <div>
            <label className="field-label mb-3">
              {t.use('eventForm.languagesLabel')} *
            </label>
            <div className="space-y-2">
              {['english', 'vietnamese', 'russian', 'ukrainian'].map((lang) => (
                <label key={lang} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={lang}
                    checked={formData.languages.includes(lang)}
                    onChange={(e) => handleCheckboxChange(e, 'languages')}
                    className="shrink-0"
                  />
                  <span className="font-body">{t.use(`eventForm.languages.${lang}`)}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  value="other"
                  checked={formData.languages.includes('other')}
                  onChange={(e) => handleCheckboxChange(e, 'languages')}
                  className="shrink-0"
                />
                <span className="font-body">{t.use('eventForm.languages.other')}</span>
              </label>
            </div>
            {errors.languages && <p className="field-hint-error">{errors.languages}</p>}
          </div>

          <div>
            <label className="field-label mb-3">
              {t.use('eventForm.preferredSpaceLabel')} *
            </label>
            <div className="space-y-2">
              {['1l', '2l', '2e', '3p', 'unsure'].map((space) => (
                <label key={space} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={space}
                    checked={formData.preferredSpace.includes(space)}
                    onChange={(e) => handleCheckboxChange(e, 'preferredSpace')}
                    className="shrink-0"
                  />
                  <span className="font-body">{t.use(`eventForm.preferredSpace.${space}`)}</span>
                </label>
              ))}
            </div>
            {errors.preferredSpace && <p className="field-hint-error">{errors.preferredSpace}</p>}
          </div>

          <div>
            <label className="field-label mb-3">
              {t.use('eventForm.equipmentLabel')}
            </label>
            <div className="space-y-2">
              {['projector', 'microphones', 'laptop', 'dj', 'piano', 'seating', 'none'].map((equip) => (
                <label key={equip} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={equip}
                    checked={formData.equipment.includes(equip)}
                    onChange={(e) => handleCheckboxChange(e, 'equipment')}
                    className="shrink-0"
                  />
                  <span className="font-body">{t.use(`eventForm.equipment.${equip}`)}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  value="other"
                  checked={formData.equipment.includes('other')}
                  onChange={(e) => handleCheckboxChange(e, 'equipment')}
                  className="shrink-0"
                />
                <span className="font-body">{t.use('eventForm.equipment.other')}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="field-label">
              {t.use('eventForm.anythingElse')}
            </label>
            <textarea
              name="anythingElse"
              value={formData.anythingElse}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('eventForm.anythingElsePlaceholder')}
              rows="3"
            />
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('eventForm.step4Title')}</h3>

          {submitStatus === 'success' && (
            <div className="alert-success">
              <p className="flex items-center gap-2">
                <span>✓</span> {t.use('eventForm.successMessage')}
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="alert-error">
              <p>{t.use('eventForm.errorMessage')}</p>
              <p className="mt-2 text-sm">
                {t.use('eventForm.fallbackMessage')}{' '}
                <a href={URLS.WA} target="_blank" rel="noreferrer" className="font-title underline">
                  WhatsApp
                </a>
              </p>
            </div>
          )}

          {submitStatus !== 'success' && (
            <>
              <div
                className="space-y-4 p-4"
                style={{ border: '2px solid var(--hairline)', background: 'var(--surface-2)' }}
              >
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('eventForm.email')}
                  </p>
                  <p className="font-body">{formData.email}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('eventForm.hostName')}
                  </p>
                  <p className="font-body">{formData.hostName}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('eventForm.eventTitle')}
                  </p>
                  <p className="font-body">{formData.eventTitle}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('eventForm.recurrenceLabel')}
                  </p>
                  <p className="font-body">{formData.recurrence}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('eventForm.languagesLabel')}
                  </p>
                  <p className="font-body">{formData.languages.join(', ')}</p>
                </div>
              </div>

              {/* Cloudflare Turnstile — renders only when a site key is set.
                  Without one the widget is absent and the form submits without
                  a token; the hub accepts unverified submissions until the
                  TURNSTILE_SECRET is configured server-side. */}
              {TURNSTILE_SITE_KEY && (
                <div
                  className="cf-turnstile"
                  data-sitekey={TURNSTILE_SITE_KEY}
                />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary px-5 py-3 text-sm"
                >
                  {t.use('eventForm.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-3 text-sm disabled:opacity-50"
                >
                  {loading ? t.use('eventForm.submitting') : t.use('eventForm.submit')}
                </button>
              </div>

              <p className="font-body text-sm text-gray-600 mt-4">
                {t.use('eventForm.guidelinesPrefix')}{' '}
                <a href="/event-guidelines" className="font-title underline">
                  {t.use('eventForm.guidelinesLink')}
                </a>
              </p>
            </>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      {step < 4 && submitStatus !== 'success' && (
        <div className="flex gap-2 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary px-5 py-3 text-sm"
            >
              {t.use('eventForm.back')}
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-5 py-3 text-sm"
            >
              {t.use('eventForm.next')}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-5 py-3 text-sm"
            >
              {t.use('eventForm.review')}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
