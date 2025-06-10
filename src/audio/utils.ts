import type { Blob as GenAIBlob } from "@google/genai";
import { audioLogger } from "../utils/logger";

/**
 * Converts a Node.js Buffer to a GenAI Blob format for sending to Gemini API
 * @param buffer The audio buffer to convert
 * @param mimeType The MIME type of the audio data
 */
export function bufferToGenAIBlob(buffer: Buffer, mimeType: string): GenAIBlob {
  const base64Data = buffer.toString("base64");
  return {
    mimeType,
    data: base64Data,
  };
}

/**
 * Helper function to create a WAV header
 */
export function createWavHeader(
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
  dataLength: number,
): Buffer {
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const subChunk2Size = dataLength;
  const chunkSize = 36 + subChunk2Size; // 4 + (8 + 16) + (8 + subChunk2Size)

  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(subChunk2Size, 40);

  return buffer;
}

/**
 * Mixes two mono Int16 PCM audio buffers, handling potentially slightly different lengths
 */
export function mixChunks(mic: Buffer, system: Buffer): Buffer {
  // Ensure both buffers exist and contain some data
  if (!mic || !system || mic.length === 0 || system.length === 0) {
    audioLogger.warn("Invalid or empty buffers provided to mixChunks. Returning empty buffer.");
    return Buffer.alloc(0);
  }

  // Determine the length to mix (use the shorter buffer length)
  // Also ensure the length is even for Int16 processing
  const length = Math.min(mic.length, system.length);
  const mixLength = length % 2 === 0 ? length : length - 1; // Ensure even length

  if (mixLength <= 0) {
    audioLogger.warn("Zero mixable length after adjusting for Int16. Returning empty buffer.");
    return Buffer.alloc(0);
  }

  const mixed = Buffer.alloc(mixLength);

  for (let i = 0; i < mixLength; i += 2) {
    const micSample = mic.readInt16LE(i);
    const sysSample = system.readInt16LE(i);

    // Simple addition and clamping
    let mixedSample = micSample + sysSample;
    mixedSample = Math.max(-32768, Math.min(32767, mixedSample)); // Clamp to Int16 range

    mixed.writeInt16LE(mixedSample, i);
  }
  return mixed;
}

/**
 * Compute peak audio level (0.0 to 1.0) for a mono Int16 PCM buffer
 */
export function getPeakLevel(buffer: Buffer): number {
  let peak = 0;
  // Iterate through Int16 samples
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i));
    if (sample > peak) peak = sample;
  }
  // Avoid division by zero if buffer is silent
  return peak > 0 ? peak / 32767 : 0;
}
