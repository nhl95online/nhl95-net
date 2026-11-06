"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CoachProfileView from '@/components/CoachProfileView';

function ManagersPageContent() {
  const searchParams = useSearchParams();
  const coachParam = searchParams.get('coach') || searchParams.get('q') || '';
  const coachIdParam = searchParams.get('coachId');

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-3 sm:p-5">
      <CoachProfileView
        initialCoachId={coachIdParam ? Number(coachIdParam) : null}
        initialCoachName={coachParam}
      />
    </div>
  );
}

export default function ManagersPage() {
  return (
    <Suspense fallback={<div className="p-10 font-serif text-sm italic">Loading Coach Profile...</div>}>
      <ManagersPageContent />
    </Suspense>
  );
}
