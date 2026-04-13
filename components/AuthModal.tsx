'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import { useSearchParams } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AuthModalContent({ onClose }: { onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const signupParam = searchParams.get('signup');
    if (signupParam === 'success') {
      setIsLogin(true);
    }
  }, [searchParams]);

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
      <button
        onClick={onClose}
        className="absolute right-6 top-6 text-zinc-400 hover:text-zinc-900 transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {isLogin ? (
        <SignIn onToggle={() => setIsLogin(false)} onClose={onClose} />
      ) : (
        <SignUp onToggle={() => setIsLogin(true)} onClose={onClose} />
      )}
    </div>
  );
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md"
        >
          <Suspense fallback={<div className="bg-white p-10 rounded-3xl text-center">Carregando...</div>}>
            <AuthModalContent onClose={onClose} />
          </Suspense>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
