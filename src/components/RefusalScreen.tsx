'use client';

import { ShieldAlert } from 'lucide-react';

interface Props {
  reason: string;
  onReset: () => void;
}

export default function RefusalScreen({ reason, onReset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-center px-6 py-10">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mb-4">
        <ShieldAlert size={28} className="text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-red-400 mb-2">Trip Blocked</h2>
      <p className="text-sm text-stone-400 leading-relaxed mb-6 max-w-sm">{reason}</p>
      <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 mb-6 max-w-sm">
        <p className="text-xs text-red-300">
          This recommendation has been blocked by an automatic safety check. This decision cannot be overridden.
        </p>
      </div>
      <button
        onClick={onReset}
        className="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-medium transition-colors"
      >
        Modify Search
      </button>
    </div>
  );
}
