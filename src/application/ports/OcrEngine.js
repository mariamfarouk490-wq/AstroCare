/** Port: reads text from a photo of a device display. */
export class OcrEngine {
  /** @returns {Promise<{ rawText: string, confidence: number, engine: string }>} */
  // eslint-disable-next-line no-unused-vars
  async recognize(image) {
    throw new Error('OcrEngine.recognize must be implemented');
  }
}
