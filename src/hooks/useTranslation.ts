import { useState, useEffect } from "react";
import catalan from "../locales/ca.json";

type NestedKeys<T> = {
  [K in keyof T]: T[K] extends object
    ? `${K & string}.${NestedKeys<T[K]> & string}`
    : K;
}[keyof T];

type TranslationKeys = NestedKeys<typeof catalan>;

export function useTranslation() {
  const [translations, setTranslations] = useState(catalan);

  const t = (key: TranslationKeys): string => {
    const keys = key.split(".");
    let value: any = translations;

    for (const k of keys) {
      if (value[k] === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      value = value[k];
    }

    return value as string;
  };

  return { t };
}
