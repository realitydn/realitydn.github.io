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

export default function ArtExhibitionForm({ t, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
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
      if (!formData.name) newErrors.name = 'Name is required';
      if (!formData.basedWhere) newErrors.basedWhere = 'Location information is required';
      if (!formData.contact) newErrors.contact = 'Contact is required';
      if (!formData.artistBio) newErrors.artistBio = 'Artist bio is required';
      if (!formData.workLink) newErrors.workLink = 'Link to your work is required';
    } else if (stepNum === 2) {
      if (!formData.showDescription) newErrors.showDescription = 'Show description is required';
      if (!formData.spaceAmount) newErrors.spaceAmount = 'Space amount is required';
    } else if (stepNum === 3) {
      if (!formData.preferredDate) newErrors.preferredDate = 'Preferred date is required';
      if (!formData.flexibility) newErrors.flexibility = 'Timeline flexibility is required';
      if (!formData.isGroupShow) newErrors.isGroupShow = 'Please specify if group show';
      if (formData.isGroupShow === 'yes' && !formData.numArtists) {
        newErrors.numArtists = 'Number of artists is required';
      }
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
      fetch('/api/art-exhibition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).catch(() => {});

      const response = await fetch(`${HUB}/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'art', ...formData, turnstileToken }),
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
        });
        setStep(1);
        // Hand off to parent — section-level thank-you replaces the form.
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
          {t.use('artForm.step')} {step} {t.use('artForm.of')} 4
        </p>
      </div>

      {/* Step 1: About You */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('artForm.step1Title')}</h3>

          <div>
            <label className="field-label">
              {t.use('artForm.email')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.emailPlaceholder')}
            />
            {errors.email && <p className="field-hint-error">{errors.email}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.name')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.namePlaceholder')}
            />
            {errors.name && <p className="field-hint-error">{errors.name}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.artistCollectiveName')}
            </label>
            <input
              type="text"
              name="artistCollectiveName"
              value={formData.artistCollectiveName}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.artistCollectiveNamePlaceholder')}
            />
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.basedWhere')} *
            </label>
            <input
              type="text"
              name="basedWhere"
              value={formData.basedWhere}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.basedWherePlaceholder')}
            />
            {errors.basedWhere && <p className="field-hint-error">{errors.basedWhere}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.contact')} *
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.contactPlaceholder')}
            />
            {errors.contact && <p className="field-hint-error">{errors.contact}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.artistBio')} *
            </label>
            <textarea
              name="artistBio"
              value={formData.artistBio}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.artistBioPlaceholder')}
              rows="4"
            />
            {errors.artistBio && <p className="field-hint-error">{errors.artistBio}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.workLink')} *
            </label>
            <input
              type="url"
              name="workLink"
              value={formData.workLink}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.workLinkPlaceholder')}
            />
            {errors.workLink && <p className="field-hint-error">{errors.workLink}</p>}
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

      {/* Step 2: About the Show */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('artForm.step2Title')}</h3>

          <div>
            <label className="field-label">
              {t.use('artForm.showDescription')} *
            </label>
            <textarea
              name="showDescription"
              value={formData.showDescription}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.showDescriptionPlaceholder')}
              rows="5"
            />
            {errors.showDescription && <p className="field-hint-error">{errors.showDescription}</p>}
          </div>

          <div>
            <label className="field-label mb-3">
              {t.use('artForm.showAreasLabel')}
            </label>
            <div className="space-y-2">
              {['floor1', 'floor2l', 'floor2e', 'rooftop'].map((area) => (
                <label key={area} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={area}
                    checked={formData.showAreas.includes(area)}
                    onChange={(e) => handleCheckboxChange(e, 'showAreas')}
                    className="shrink-0"
                  />
                  <span className="font-body">{t.use(`artForm.showAreas.${area}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.spaceAmount')} *
            </label>
            <input
              type="text"
              name="spaceAmount"
              value={formData.spaceAmount}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.spaceAmountPlaceholder')}
            />
            {errors.spaceAmount && <p className="field-hint-error">{errors.spaceAmount}</p>}
          </div>

          <div>
            <label className="field-label">
              {t.use('artForm.technicalNeeds')}
            </label>
            <textarea
              name="technicalNeeds"
              value={formData.technicalNeeds}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.technicalNeedsPlaceholder')}
              rows="3"
            />
          </div>
        </div>
      )}

      {/* Step 3: Scheduling & Group Shows */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('artForm.step3Title')}</h3>

          <div>
            <label className="field-label">
              {t.use('artForm.preferredDate')} *
            </label>
            <input
              type="text"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleInputChange}
              className="field"
              placeholder={t.use('artForm.preferredDatePlaceholder')}
            />
            {errors.preferredDate && <p className="field-hint-error">{errors.preferredDate}</p>}
          </div>

          <div>
            <label className="field-label mb-3">
              {t.use('artForm.flexibilityLabel')} *
            </label>
            <div className="space-y-2">
              {['veryFlexible', 'somewhat', 'fixed'].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="flexibility"
                    value={option}
                    checked={formData.flexibility === option}
                    onChange={handleRadioChange}
                    className="shrink-0"
                  />
                  <span className="font-body">{t.use(`artForm.flexibility.${option}`)}</span>
                </label>
              ))}
            </div>
            {errors.flexibility && <p className="field-hint-error">{errors.flexibility}</p>}
          </div>

          <div>
            <label className="field-label mb-3">
              {t.use('artForm.isGroupShowLabel')} *
            </label>
            <div className="space-y-2">
              {['yes', 'no'].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isGroupShow"
                    value={option}
                    checked={formData.isGroupShow === option}
                    onChange={handleRadioChange}
                    className="shrink-0"
                  />
                  <span className="font-body">{t.use(`artForm.isGroupShow.${option}`)}</span>
                </label>
              ))}
            </div>
            {errors.isGroupShow && <p className="field-hint-error">{errors.isGroupShow}</p>}
          </div>

          {formData.isGroupShow === 'yes' && (
            <>
              <div>
                <label className="field-label">
                  {t.use('artForm.numArtists')} *
                </label>
                <input
                  type="text"
                  name="numArtists"
                  value={formData.numArtists}
                  onChange={handleInputChange}
                  className="field"
                  placeholder={t.use('artForm.numArtistsPlaceholder')}
                />
                {errors.numArtists && <p className="field-hint-error">{errors.numArtists}</p>}
              </div>

              <div>
                <label className="field-label">
                  {t.use('artForm.curatorInfo')}
                </label>
                <textarea
                  name="curatorInfo"
                  value={formData.curatorInfo}
                  onChange={handleInputChange}
                  className="field"
                  placeholder={t.use('artForm.curatorInfoPlaceholder')}
                  rows="3"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="h-section text-xl md:text-2xl mb-6">{t.use('artForm.step4Title')}</h3>

          {submitStatus === 'success' && (
            <div className="alert-success">
              <p className="flex items-center gap-2">
                <span>✓</span> {t.use('artForm.successMessage')}
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="alert-error">
              <p>{t.use('artForm.errorMessage')}</p>
              <p className="mt-2 text-sm">
                {t.use('artForm.fallbackMessage')}{' '}
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
                    {t.use('artForm.email')}
                  </p>
                  <p className="font-body">{formData.email}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('artForm.name')}
                  </p>
                  <p className="font-body">{formData.name}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('artForm.basedWhere')}
                  </p>
                  <p className="font-body">{formData.basedWhere}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('artForm.flexibilityLabel')}
                  </p>
                  <p className="font-body">{formData.flexibility}</p>
                </div>
                <div>
                  <p className="field-label mb-1 text-gray-600">
                    {t.use('artForm.isGroupShowLabel')}
                  </p>
                  <p className="font-body">{formData.isGroupShow}</p>
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
                  {t.use('artForm.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-3 text-sm disabled:opacity-50"
                >
                  {loading ? t.use('artForm.submitting') : t.use('artForm.submit')}
                </button>
              </div>
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
              {t.use('artForm.back')}
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-5 py-3 text-sm"
            >
              {t.use('artForm.next')}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-5 py-3 text-sm"
            >
              {t.use('artForm.review')}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
