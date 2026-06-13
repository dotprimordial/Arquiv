'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Country } from '@/components/CountrySelector';

interface CountryContextValue {
  country: Country | null;
  setCountry: (country: Country | null) => void;
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<Country | null>(null);
  return (
    <CountryContext.Provider value={{ country, setCountry }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used within CountryProvider');
  return ctx;
}
