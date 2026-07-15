import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is available (using unpkg or cdnjs as standard fallback)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PdfRagUploaderProps {
  onTextExtracted: (text: string) => void;
}

export const PdfRagUploader: React.FC<PdfRagUploaderProps> = ({ onTextExtracted }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Bitte wähle eine gültige PDF-Datei aus.');
      return;
    }

    setFileName(file.name);
    setIsExtracting(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + "\n";
      }

      onTextExtracted(fullText);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Extrahieren des PDF-Inhalts.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemove = () => {
    setFileName(null);
    setError(null);
    onTextExtracted("");
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-2 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wide">
          <FileText className="h-3.5 w-3.5 text-amber-400" /> Styleguide / RAG Kontext
        </div>
        {fileName && (
          <button onClick={handleRemove} className="text-slate-500 hover:text-rose-400">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!fileName ? (
        <label className="border border-dashed border-slate-700 bg-slate-950 hover:bg-slate-900 transition-colors rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer">
          <Upload className="h-5 w-5 text-slate-500 mb-2" />
          <span className="text-xs text-slate-300 font-medium">PDF-Styleguide hochladen</span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">Textinhalt wird als System-Instruktion genutzt</span>
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
        </label>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
          {isExtracting ? (
            <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          )}
          <div className="flex-1 overflow-hidden">
            <div className="text-xs text-slate-200 font-medium truncate">{fileName}</div>
            <div className="text-[10px] text-slate-500 font-mono">
              {isExtracting ? 'Extrahiere Text...' : 'Aktiv: Wird an Prompt angehängt'}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-rose-400 text-[10px] font-mono">{error}</div>
      )}
    </div>
  );
};
