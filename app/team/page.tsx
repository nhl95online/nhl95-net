'use client';
import { Suspense } from 'react';
import AllTeamsContent from './AllTeamsContent';

export default function AllTeamsPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading league directory...</div>}>
      <AllTeamsContent />
    </Suspense>
  );
}