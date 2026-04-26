import React, { useState } from 'react';

const WORKER_URL = '';

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

    if (formData.honeypot) {
      console.log('Honeypot triggered');
      return;
    }

    if (!validateStep(3)) return;

    setLoading(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`${WORKER_URL}/api/art-exhibition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
          {t.use('artForm.step')} {step} {t.use('artForm.of')} 4
        </p>
      </div>

      {/* Step 1: About You */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('artForm.step1Title')}</h3>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.email')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.emailPlaceholder')}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.name')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.namePlaceholder')}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.artistCollectiveName')}
            </label>
            <input
              type="text"
              name="artistCollectiveName"
              value={formData.artistCollectiveName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.artistCollectiveNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.basedWhere')} *
            </label>
            <input
              type="text"
              name="basedWhere"
              value={formData.basedWhere}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.basedWherePlaceholder')}
            />
            {errors.basedWhere && <p className="text-red-500 text-sm mt-1">{errors.basedWhere}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.contact')} *
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.contactPlaceholder')}
            />
            {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.artistBio')} *
            </label>
            <textarea
              name="artistBio"
              value={formData.artistBio}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.artistBioPlaceholder')}
              rows="4"
            />
            {errors.artistBio && <p className="text-red-500 text-sm mt-1">{errors.artistBio}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.workLink')} *
            </label>
            <input
              type="url"
              name="workLink"
              value={formData.workLink}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.workLinkPlaceholder')}
            />
            {errors.workLink && <p className="text-red-500 text-sm mt-1">{errors.workLink}</p>}
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

      {/* Step 2: About the Show */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('artForm.step2Title')}</h3>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.showDescription')} *
            </label>
            <textarea
              name="showDescription"
              value={formData.showDescription}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.showDescriptionPlaceholder')}
              rows="5"
            />
            {errors.showDescription && <p className="text-red-500 text-sm mt-1">{errors.showDescription}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-3">
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
                    className="w-4 h-4"
                  />
                  <span className="font-body">{t.use(`artForm.showAreas.${area}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.spaceAmount')} *
            </label>
            <input
              type="text"
              name="spaceAmount"
              value={formData.spaceAmount}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.spaceAmountPlaceholder')}
            />
            {errors.spaceAmount && <p className="text-red-500 text-sm mt-1">{errors.spaceAmount}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.technicalNeeds')}
            </label>
            <textarea
              name="technicalNeeds"
              value={formData.technicalNeeds}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.technicalNeedsPlaceholder')}
              rows="3"
            />
          </div>
        </div>
      )}

      {/* Step 3: Scheduling & Group Shows */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('artForm.step3Title')}</h3>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-2">
              {t.use('artForm.preferredDate')} *
            </label>
            <input
              type="text"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
              placeholder={t.use('artForm.preferredDatePlaceholder')}
            />
            {errors.preferredDate && <p className="text-red-500 text-sm mt-1">{errors.preferredDate}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-3">
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
                    className="w-4 h-4"
                  />
                  <span className="font-body">{t.use(`artForm.flexibility.${option}`)}</span>
                </label>
              ))}
            </div>
            {errors.flexibility && <p className="text-red-500 text-sm mt-1">{errors.flexibility}</p>}
          </div>

          <div>
            <label className="block font-title text-sm tracking-[0.1em] mb-3">
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
                    className="w-4 h-4"
                  />
                  <span className="font-body">{t.use(`artForm.isGroupShow.${option}`)}</span>
                </label>
              ))}
            </div>
            {errors.isGroupShow && <p className="text-red-500 text-sm mt-1">{errors.isGroupShow}</p>}
          </div>

          {formData.isGroupShow === 'yes' && (
            <>
              <div>
                <label className="block font-title text-sm tracking-[0.1em] mb-2">
                  {t.use('artForm.numArtists')} *
                </label>
                <input
                  type="text"
                  name="numArtists"
                  value={formData.numArtists}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
                  placeholder={t.use('artForm.numArtistsPlaceholder')}
                />
                {errors.numArtists && <p className="text-red-500 text-sm mt-1">{errors.numArtists}</p>}
              </div>

              <div>
                <label className="block font-title text-sm tracking-[0.1em] mb-2">
                  {t.use('artForm.curatorInfo')}
                </label>
                <textarea
                  name="curatorInfo"
                  value={formData.curatorInfo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-ink/20 bg-cream text-ink font-body focus:border-ink focus:outline-none transition-colors"
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
          <h3 className="font-title text-xl md:text-2xl mb-6">{t.use('artForm.step4Title')}</h3>

          {submitStatus === 'success' && (
            <div className="p-4 bg-green-100 text-green-800 font-body rounded-none">
              <p className="flex items-center gap-2">
                <span>✓</span> {t.use('artForm.successMessage')}
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="p-4 bg-red-100 text-red-800 font-body rounded-none">
              <p>{t.use('artForm.errorMessage')}</p>
              <p className="mt-2 text-sm">
                {t.use('artForm.fallbackMessage')}{' '}
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
                    {t.use('artForm.email')}
                  </p>
                  <p className="font-body">{formData.email}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('artForm.name')}
                  </p>
                  <p className="font-body">{formData.name}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('artForm.basedWhere')}
                  </p>
                  <p className="font-body">{formData.basedWhere}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('artForm.flexibilityLabel')}
                  </p>
                  <p className="font-body">{formData.flexibility}</p>
                </div>
                <div>
                  <p className="font-title text-sm tracking-[0.1em] text-gray-600 mb-1">
                    {t.use('artForm.isGroupShowLabel')}
                  </p>
                  <p className="font-body">{formData.isGroupShow}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary px-4 py-2 font-title text-sm tracking-[0.15em]"
                >
                  {t.use('artForm.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-4 py-2 font-title text-sm tracking-[0.15em] disabled:opacity-50"
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
              className="btn-secondary px-4 py-2 font-title text-sm tracking-[0.15em]"
            >
              {t.use('artForm.back')}
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-4 py-2 font-title text-sm tracking-[0.15em]"
            >
              {t.use('artForm.next')}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary px-4 py-2 font-title text-sm tracking-[0.15em]"
            >
              {t.use('artForm.review')}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
