import React, { useState } from 'react';

const WORKER_URL = '';

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

    if (formData.honeypot) {
      console.log('Honeypot triggered');
      return;
    }

    if (!validateStep(3)) return;

    setLoading(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`${WORKER_URL}/api/event-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
      {/* Progress indicator */}
      <div className="mb-8 flex justify-between items-center">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-title text-sm ${
                step >= num ? 'bg-ink text-cream' : 'bg-gray-300 text-gray-600'
              }`}
            >
              {num}
            </div>
            {num < 4 && (
              <div
                className={`h-1 mx-2 md:mx-4 w-12 md:w-16 ${
                  step > num ? 'bg-ink' : 'bg-gray-300'
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
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('eventForm.step1Title')}</h3>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.email')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.emailPlaceholder')}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.hostName')} *
            </label>
            <input
              type="text"
              name="hostName"
              value={formData.hostName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.hostNamePlaceholder')}
            />
            {errors.hostName && <p className="text-red-500 text-sm mt-1">{errors.hostName}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.organization')}
            </label>
            <input
              type="text"
              name="organization"
              value={formData.organization}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.organizationPlaceholder')}
            />
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.contact')} *
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.contactPlaceholder')}
            />
            {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact}</p>}
          </div>

          {/* Honeypot */}
          <input
            type="text"
            name="honeypot"
            value={formData.honeypot}
            onChange={handleInputChange}
            style={{ display: 'none' }}
            tabIndex="-1"
            autoComplete="off"
          />
        </div>
      )}

      {/* Step 2: About the Event */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('eventForm.step2Title')}</h3>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.eventTitle')} *
            </label>
            <input
              type="text"
              name="eventTitle"
              value={formData.eventTitle}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.eventTitlePlaceholder')}
            />
            {errors.eventTitle && <p className="text-red-500 text-sm mt-1">{errors.eventTitle}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.eventDescription')} *
            </label>
            <textarea
              name="eventDescription"
              value={formData.eventDescription}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.eventDescriptionPlaceholder')}
              rows="4"
            />
            {errors.eventDescription && <p className="text-red-500 text-sm mt-1">{errors.eventDescription}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-3">
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
                    className="w-4 h-4"
                  />
                  <span className="font-body">{t.use(`eventForm.recurrence.${option}`)}</span>
                </label>
              ))}
            </div>
            {errors.recurrence && <p className="text-red-500 text-sm mt-1">{errors.recurrence}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.daysAndTimes')} *
            </label>
            <textarea
              name="daysAndTimes"
              value={formData.daysAndTimes}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.daysAndTimesPlaceholder')}
              rows="3"
            />
            {errors.daysAndTimes && <p className="text-red-500 text-sm mt-1">{errors.daysAndTimes}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.duration')} *
            </label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.durationPlaceholder')}
            />
            {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.eventCost')} *
            </label>
            <input
              type="text"
              name="eventCost"
              value={formData.eventCost}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.eventCostPlaceholder')}
            />
            {errors.eventCost && <p className="text-red-500 text-sm mt-1">{errors.eventCost}</p>}
          </div>
        </div>
      )}

      {/* Step 3: Logistics */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('eventForm.step3Title')}</h3>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-3">
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
                    className="w-4 h-4"
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
                  className="w-4 h-4"
                />
                <span className="font-body">{t.use('eventForm.languages.other')}</span>
              </label>
            </div>
            {errors.languages && <p className="text-red-500 text-sm mt-1">{errors.languages}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-3">
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
                    className="w-4 h-4"
                  />
                  <span className="font-body">{t.use(`eventForm.preferredSpace.${space}`)}</span>
                </label>
              ))}
            </div>
            {errors.preferredSpace && <p className="text-red-500 text-sm mt-1">{errors.preferredSpace}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-3">
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
                    className="w-4 h-4"
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
                  className="w-4 h-4"
                />
                <span className="font-body">{t.use('eventForm.equipment.other')}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('eventForm.anythingElse')}
            </label>
            <textarea
              name="anythingElse"
              value={formData.anythingElse}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('eventForm.anythingElsePlaceholder')}
              rows="3"
            />
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('eventForm.step4Title')}</h3>

          {submitStatus === 'success' && (
            <div className="p-4 bg-green-100 text-green-800 font-body rounded-none">
              <p className="flex items-center gap-2">
                <span>✓</span> {t.use('eventForm.successMessage')}
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="p-4 bg-red-100 text-red-800 font-body rounded-none">
              <p>{t.use('eventForm.errorMessage')}</p>
              <p className="mt-2 text-sm">
                {t.use('eventForm.fallbackMessage')}{' '}
                <a href="https://wa.me/84123456789" className="font-title underline">
                  WhatsApp
                </a>
              </p>
            </div>
          )}

          {submitStatus !== 'success' && (
            <>
              <div className="space-y-4 bg-gray-50 p-4">
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('eventForm.email')}
                  </p>
                  <p className="font-body">{formData.email}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('eventForm.hostName')}
                  </p>
                  <p className="font-body">{formData.hostName}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('eventForm.eventTitle')}
                  </p>
                  <p className="font-body">{formData.eventTitle}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('eventForm.recurrenceLabel')}
                  </p>
                  <p className="font-body">{formData.recurrence}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('eventForm.languagesLabel')}
                  </p>
                  <p className="font-body">{formData.languages.join(', ')}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary px-4 py-2 font-title text-sm tracking-[0.15em]"
                >
                  {t.use('eventForm.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-4 py-2 font-title text-sm tracking-[0.15em] disabled:opacity-50"
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
              className="btn-secondary px-4 py-2 font-title text-sm tracking-[0.15em]"
            >
              {t.use('eventForm.back')}
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-4 py-2 font-title text-sm tracking-[0.15em]"
            >
              {t.use('eventForm.next')}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-4 py-2 font-title text-sm tracking-[0.15em]"
            >
              {t.use('eventForm.review')}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
