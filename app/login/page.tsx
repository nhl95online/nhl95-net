"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-center p-8">
      <p className="font-bold text-sm text-neutral-600">Redirecting to homepage...</p>
    </div>
  );
}