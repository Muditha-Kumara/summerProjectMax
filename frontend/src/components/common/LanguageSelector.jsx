import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  // Keep local state in sync with i18n (handles async language changes)
  useEffect(() => {
    const handler = () => setCurrentLang(i18n.language);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, [i18n]);

  const languages = [
    { code: 'fi', label: '🇫🇮', name: 'Suomi' },
    { code: 'sv', label: '🇸🇪', name: 'Svenska' },
    { code: 'en', label: '🇬🇧', name: 'English' }
  ];

  const changeLanguage = (code) => {
    // Manually persist to localStorage as fallback
    // (some Android browsers silently block i18next's cache)
    try {
      localStorage.setItem('i18nextLng', code);
    } catch (e) {
      // localStorage unavailable (private mode, etc.)
    }
    i18n.changeLanguage(code).then(() => {
      setCurrentLang(code);
    });
  };

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`lang-btn text-2xl sm:text-3xl w-14 h-14 sm:w-16 sm:h-16 ${
            i18n.language === lang.code ? 'active' : ''
          }`}
          aria-label={lang.name}
          title={lang.name}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
