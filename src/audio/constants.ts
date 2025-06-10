import { RtAudioFormat } from "audify";

// Audio processing constants
export const TARGET_SAMPLE_RATE = 16000; // Sample rate expected by Gemini
export const TARGET_CHANNELS = 1; // Mono audio expected by Gemini
export const TARGET_FORMAT = RtAudioFormat.RTAUDIO_SINT16; // Signed 16-bit integer PCM
export const FRAME_SIZE_MS = 40; // Process audio in 40ms chunks
export const FRAME_SIZE_SAMPLES = (TARGET_SAMPLE_RATE * FRAME_SIZE_MS) / 1000; // Calculate frame size in samples
