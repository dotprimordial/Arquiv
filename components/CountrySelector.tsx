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
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-2 lg:gap-4 min-w-max px-6 lg:justify-center">
        {filteredCountries.map((country) => {
          const isSelected = selectedCountryName === country.name;
          return (
            <button
              key={country.code}
              onClick={() => onSelect(country)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border-2 outline-none
                lg:flex-col lg:w-28 lg:h-32 lg:rounded-2xl lg:gap-0 lg:px-0 lg:py-0
                ${isSelected
                  ? 'bg-[#1e293b] text-white border-[#1e293b] lg:bg-zinc-50 lg:text-zinc-900 lg:border-zinc-900 lg:shadow-[0_0_0_1px_rgba(24,24,27,1)]'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 lg:border-zinc-100 lg:hover:border-zinc-200'
                }`}
            >
              <span className="lg:hidden">{country.code} {country.name}</span>
              <span className={`hidden lg:block text-2xl font-bold mb-1 ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {country.code}
              </span>
              <span className={`hidden lg:block text-xs font-medium ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                {country.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
