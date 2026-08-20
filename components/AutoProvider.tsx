"use client";

import React, { ReactNode } from 'react';
import { AuthProvider as ContextAuthProvider } from '@/lib/auth-context';

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <ContextAuthProvider>{children}</ContextAuthProvider>;
}

export { useAuth } from '@/lib/auth-context';
