'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const perfil = localStorage.getItem('userProfile');
    if (!perfil) {
      router.replace('/onboarding');
      return;
    }
    try {
      const user = JSON.parse(perfil);
      router.replace(user.onboardingCompleto ? '/plan' : '/onboarding');
    } catch {
      router.replace('/onboarding');
    }
  }, [router]);

  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: 'var(--color-fondo)' }}
    >
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
