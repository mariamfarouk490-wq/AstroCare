import { parseDeviceText } from '../../domain/ocr/parsers.js';

/** Read a device display from a photo. Returns candidates for the crew to confirm; nothing is saved. */
export async function readFromImage(ctx, image) {
  const result = await ctx.ocr.recognize(image);
  return { ...result, readings: parseDeviceText(result.rawText, ctx.seed.metrics) };
}
