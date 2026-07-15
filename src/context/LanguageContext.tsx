import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "../data/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations["de"]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check if there is a saved language in localStorage, default to 'de'
    const saved = localStorage.getItem("fcb_miasanai_lang");
    return (saved === "de" || saved === "en") ? saved : "de";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("fcb_miasanai_lang", lang);
  };

  const t = (key: keyof typeof translations["de"]): string => {
    return translations[language]?.[key] || translations["de"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
