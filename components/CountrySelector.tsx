'use client';

import React from 'react';

export interface Country {
  code: string;
  name: string;
}

export const countries: Country[] = [
  { code: 'BR', name: 'Brasil' },
  { code: 'PT', name: 'Portugal' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'FR', name: 'França' },
  { code: 'ES', name: 'Espanha' },
  { code: 'AO', name: 'Angola' },
  { code: 'MZ', name: 'Moçambique' },
];

interface CountrySelectorProps {
  onSelect: (country: Country) => void;
  selectedCountryName: string;
  activeCountryNames: string[];
}

export default function CountrySelector({ onSelect, selectedCountryName, activeCountryNames }: CountrySelectorProps) {
  const filteredCountries = countries.filter(c => activeCountryNames.includes(c.name));

  if (filteredCountries.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <div className="flex gap-4 min-w-max px-6 justify-center">
        {filteredCountries.map((country) => {
          const isSelected = selectedCountryName === country.name;
          return (
            <button
              key={country.code}
              onClick={() => onSelect(country)}
              className={`flex flex-col items-center justify-center w-28 h-32 rounded-2xl transition-all border-2 outline-none ${
                isSelected
                  ? 'bg-zinc-50 border-zinc-900 shadow-[0_0_0_1px_rgba(24,24,27,1)]'
                  : 'bg-white border-zinc-100 hover:border-zinc-200 text-zinc-500'
              }`}
            >
              <span className={`text-2xl font-bold mb-1 ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {country.code}
              </span>
              <span className={`text-xs font-medium ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                {country.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
