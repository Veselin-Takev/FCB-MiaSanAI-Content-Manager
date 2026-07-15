// Client-side helper for server-side speech-to-text, used as a robust fallback
// to the browser Web Speech API (which is unavailable in several browsers).
// Records microphone audio via MediaRecorder and posts it to /api/transcribe.

export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
}

export interface ServerTranscriptionController {
  /** Stops recording, uploads the audio and resolves with the transcript. */
  stop: () => Promise<string>;
  /** Aborts recording without transcribing. */
  cancel: () => void;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Starts recording microphone audio. The returned controller's `stop()`
 * finalises the recording, uploads it to the server and resolves the
 * transcript. Recording auto-stops after `maxMs` (default 15000 ms).
 *
 * Requires a secure context (HTTPS or localhost) for `getUserMedia`.
 */
export async function startServerTranscription(
  opts: { language?: string; maxMs?: number } = {}
): Promise<ServerTranscriptionController> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  let resolveDone: (text: string) => void;
  let rejectDone: (err: unknown) => void;
  const done = new Promise<string>((res, rej) => {
    resolveDone = res;
    rejectDone = rej;
  });

  const cleanup = () => stream.getTracks().forEach((t) => t.stop());

  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = async () => {
    cleanup();
    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const dataUrl = await blobToDataUrl(blob);
      const resp = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: dataUrl, mimeType: blob.type, language: opts.language }),
      });
      if (!resp.ok) throw new Error(`Transcribe endpoint returned ${resp.status}`);
      const data = await resp.json();
      resolveDone((data && data.text) || "");
    } catch (err) {
      rejectDone(err);
    }
  };

  recorder.start();
  const autoTimer = setTimeout(() => {
    if (recorder.state !== "inactive") recorder.stop();
  }, opts.maxMs ?? 15000);

  return {
    stop: () => {
      clearTimeout(autoTimer);
      if (recorder.state !== "inactive") recorder.stop();
      return done;
    },
    cancel: () => {
      clearTimeout(autoTimer);
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* no-op */
      }
      cleanup();
    },
  };
}
