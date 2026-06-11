import { motion } from 'framer-motion';

const loadingSteps = [
  'Procurando normas...',
  'Analisando consulta...',
  'Lendo artigos...',
  'Extraindo trechos relevantes...',
  'Rankeando por relevância...',
  'Preparando resultados...'
];

interface SearchLoadingProps {
  currentStep?: number;
}

export function SearchLoading({ currentStep = 0 }: SearchLoadingProps) {
  const visibleSteps = loadingSteps.slice(0, Math.min(currentStep + 1, loadingSteps.length));

  return (
    <div className="py-12 px-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="space-y-4">
          {visibleSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                index === visibleSteps.length - 1 
                  ? 'bg-emerald-500 animate-pulse' 
                  : 'bg-emerald-100'
              }`}>
                {index === visibleSteps.length - 1 ? (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                ) : (
                  <span className="text-emerald-700 text-sm font-bold">✓</span>
                )}
              </div>
              <span className={`text-sm ${
                index === visibleSteps.length - 1 
                  ? 'text-emerald-700 font-semibold' 
                  : 'text-gray-500'
              }`}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
