'use client';

import { ReasoningStep } from '@/types';
import { Brain, Zap, Eye } from 'lucide-react';

interface Props {
  steps: ReasoningStep[];
  loading: boolean;
}

export default function ReasoningTrace({ steps, loading }: Props) {
  if (steps.length === 0 && !loading) return null;

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Agent Reasoning</span>
        {loading && (
          <span className="ml-auto flex gap-1">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {steps.map((step, i) => (
          <div key={i} className="space-y-1.5">
            {step.thought && (
              <div className="flex gap-2">
                <Brain size={12} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300 leading-relaxed">{step.thought}</p>
              </div>
            )}
            {step.action && (
              <div className="flex gap-2">
                <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                <code className="text-xs text-amber-300 font-mono bg-stone-800 px-1 rounded break-all">{step.action}</code>
              </div>
            )}
            {step.observation && (
              <div className="flex gap-2">
                <Eye size={12} className="text-green-400 mt-0.5 shrink-0" />
                <p className="text-xs text-green-300 leading-relaxed line-clamp-3">{step.observation}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
