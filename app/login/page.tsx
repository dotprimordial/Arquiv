'use client';

import React, { Suspense } from 'react';
import SignIn from '@/components/SignIn';
import SignUp from '@/components/SignUp';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const [isLogin, setIsLogin] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    document.title = 'Entrar | Arquiv';
    const signupParam = searchParams.get('signup');
    if (signupParam === 'success') {
      setIsLogin(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {isLogin ? (
          <SignIn onToggle={() => setIsLogin(false)} />
        ) : (
          <SignUp onToggle={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
