import React, { useState } from 'react';
import { Key, Shield, AlertTriangle, CheckCircle, Clock, Server, RefreshCw, Loader2, Database } from 'lucide-react';

export function SecretManagerQA() {
  const [secretId, setSecretId] = useState('');
  const [version, setVersion] = useState('latest');
  const [ttl, setTtl] = useState(300);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ value: string; source: string; ttlRemaining?: number } | null>(null);
  const [error, setError] = useState<{ message: string; code?: number } | null>(null);

  const fetchSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretId.trim()) return;
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s network timeout
      
      const res = await fetch('/api/secrets/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretId, version, ttl }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await res.json();
      
      if (!res.ok) {
        throw { message: data.error, code: data.code || res.status };
      }
      
      setResult(data);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError({ message: 'Network Timeout: The request took too long to complete.', code: 504 });
      } else {
        setError({ message: err.message || 'Unknown error occurred', code: err.code });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0b0e] p-6 text-slate-200 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">GCP Secret Manager QA Tool</h2>
              <p className="text-sm text-slate-400">Validate Application Default Credentials (ADC) and In-Memory Caching</p>
            </div>
          </div>

          <form onSubmit={fetchSecret} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Secret ID</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. projects/123456789/secrets/MY_SECRET or simply MY_SECRET"
                  value={secretId}
                  onChange={(e) => setSecretId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500/50 outline-none transition"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Version</label>
                <input 
                  type="text" 
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500/50 outline-none transition"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Cache Duration (TTL in sec)</label>
                <input 
                  type="number" 
                  min="0"
                  value={ttl}
                  onChange={(e) => setTtl(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500/50 outline-none transition"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {loading ? "Fetching..." : "Fetch & Decode Secret"}
            </button>
          </form>
        </div>

        {/* Results Area */}
        <div className="space-y-4">
          {loading && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p>Authenticating via ADC and retrieving payload...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-400 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-1">
                  Error {error.code ? `(${error.code})` : ''}
                </h3>
                <p className="text-sm text-red-300/80">{error.message}</p>
                
                {error.code === 403 && (
                  <p className="text-xs text-red-400/60 mt-2 font-mono">
                    Diagnostic: The Workload Identity / ADC principal lacks 'roles/secretmanager.secretAccessor'.
                  </p>
                )}
                {error.code === 404 && (
                  <p className="text-xs text-red-400/60 mt-2 font-mono">
                    Diagnostic: Secret or version not found. Verify the ID and GCP Project.
                  </p>
                )}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400">Secret Decoded Successfully</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">projects/../secrets/{secretId}/versions/{version}</p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${result.source === 'cache' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                  {result.source === 'cache' ? <RefreshCw className="h-3 w-3" /> : <Server className="h-3 w-3" />}
                  {result.source === 'cache' ? `RAM CACHE (TTL: ${result.ttlRemaining}s)` : 'GCP API'}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Decoded Payload</label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 break-all overflow-x-auto whitespace-pre-wrap">
                  {result.value}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
