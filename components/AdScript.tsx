'use client';

import { useEffect } from 'react';

export default function AdScript() {
  useEffect(() => {
    // Carregar script de popunder apenas no cliente
    const script = document.createElement('script');
    script.src = 'https://wistfulseverely.com/3c/e1/ba/3ce1ba2b8db5311f0d273be3dee51a8a.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup opcional
      const existingScript = document.querySelector('script[src*="wistfulseverely.com"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  return null;
}
