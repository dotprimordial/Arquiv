'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
}

export function RateLimitModal({ isOpen, onClose, onSignUp }: RateLimitModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Limite de buscas atingido
                    </h3>
                    <p className="text-emerald-100 text-sm">
                      Crie uma conta para continuar pesquisando
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-zinc-600 leading-relaxed">
                  Você atingiu seu limite de <span className="font-bold text-zinc-900">5 buscas gratuitas por dia</span>.
                </p>

                <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-zinc-700">
                      <span className="font-semibold">50 buscas por dia</span> para usuários autenticados
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-zinc-700">
                      Acesso a <span className="font-semibold">todas as funcionalidades</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-zinc-700">
                      <span className="font-semibold">100% gratuito</span> - sem cartão de crédito
                    </p>
                  </div>
                </div>

                <button
                  onClick={onSignUp}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Criar conta gratuita
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 text-zinc-500 hover:text-zinc-700 text-sm font-medium transition-colors"
                >
                  Talvez mais tarde
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
