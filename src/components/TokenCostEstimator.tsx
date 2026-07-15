import React, { useMemo, useState, useEffect } from 'react';
import { Calculator, Coins, Activity } from 'lucide-react';
import { fetchUsage, UsageSnapshot } from '../utils/usage';

interface TokenCostEstimatorProps {
  promptText: string;
  type: 'image' | 'video' | 'text';
  pdfContextLength?: number;
  /** Show cumulative real usage pulled from /api/usage (default true). */
  showLiveUsage?: boolean;
}

export const TokenCostEstimator: React.FC<TokenCostEstimatorProps> = ({ promptText, type, pdfContextLength = 0, showLiveUsage = true }) => {
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  useEffect(() => {
    if (!showLiveUsage) return;
    let active = true;
    const load = () => fetchUsage().then((u) => { if (active) setUsage(u); });
    load();
    const id = setInterval(load, 15000);
    return () => { active = false; clearInterval(id); };
  }, [showLiveUsage]);

  const estimation = useMemo(() => {
    const charCount = promptText.length + pdfContextLength;
    const estimatedTokens = Math.ceil(charCount / 4); // roughly 4 characters per token
    
    let cost = 0;
    if (type === 'text') {
      cost = (estimatedTokens / 1000) * 0.0015; // e.g. $0.0015 per 1k tokens
    } else if (type === 'image') {
      cost = 0.04; // $0.04 per image
    } else if (type === 'video') {
      cost = 0.25; // $0.25 per video generation
    }

    return { tokens: estimatedTokens, cost: cost.toFixed(4) };
  }, [promptText, type, pdfContextLength]);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs mb-3 shadow-inner space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-cyan-400" />
          <span className="text-slate-300 font-mono text-[10px] uppercase tracking-wide">Schätzung ({type})</span>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[9px] uppercase tracking-wider">Tokens</span>
            <span className="text-white font-mono font-bold">~{estimation.tokens}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[9px] uppercase tracking-wider">Kosten</span>
            <span className="text-fcb-gold font-mono font-bold flex items-center gap-1">
              <Coins className="h-3 w-3" /> ${estimation.cost}
            </span>
          </div>
        </div>
      </div>

      {showLiveUsage && usage && (
        <div className="flex items-center justify-between border-t border-slate-800/70 pt-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300 font-mono text-[10px] uppercase tracking-wide">Ist kumuliert ({usage.calls} Calls)</span>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] uppercase tracking-wider">Tokens</span>
              <span className="text-white font-mono font-bold">{usage.totalTokens.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] uppercase tracking-wider">Kosten</span>
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Coins className="h-3 w-3" /> ${usage.estimatedCostUsd.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
