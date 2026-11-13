import { OcrEngine } from '../../application/ports/OcrEngine.js';
import { createWorker } from 'tesseract.js';
// Optional full-text adapter: callers must supply locally hosted worker, core and language paths.
// The UI uses OfflineNumericOcrEngine, which requires no downloaded language model.
export class TesseractOcrEngine extends OcrEngine {
 constructor(options) { super(); this.options = options; }
 async recognize(file) {
  if (!this.options?.workerPath || !this.options?.corePath || !this.options?.langPath) throw new Error('Local Tesseract assets must be configured before use.');
  const worker=await createWorker('eng',1,this.options);
  try { const {data}=await worker.recognize(file); return {rawText:data.text,confidence:data.confidence}; }
  finally { await worker.terminate(); }
 }
}
