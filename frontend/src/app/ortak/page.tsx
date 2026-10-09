"use client";

import React from 'react';
import CompareView from '../../components/CompareView';

export default function OrtakPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20 relative">
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          <CompareView />
        </div>
      </main>
    </div>
  );
}
