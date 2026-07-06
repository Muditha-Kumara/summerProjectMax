import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'fi', label: '🇫🇮', name: 'Suomi' },
    { code: 'sv', label: '🇸🇪', name: 'Svenska' },
    { code: 'en', label: '🇬🇧', name: 'English' }
  ];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`lang-btn text-2xl ${
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
