import { normalize } from '../core/normalizer.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SonifyOptions {
    duration?: number;       // total duration in seconds (default: 3)
    sampleRate?: number;     // audio sample rate (default: 44100)
    format?: 'wav' | 'buffer'; // output format
}

// ---------------------------------------------------------------------------
// Musical constants
// ---------------------------------------------------------------------------

/** Scale definitions as semitone intervals from root */
const SCALES: number[][] = [
    [0, 2, 4, 7, 9],                // Pentatonic
    [0, 2, 4, 5, 7, 9, 11],         // Major
    [0, 2, 3, 5, 7, 8, 10],         // Natural minor
    [0, 2, 3, 5, 7, 8, 11],         // Harmonic minor
    [0, 2, 4, 6, 8, 10],            // Whole tone
    [0, 3, 5, 6, 7, 10],            // Blues
];

type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';
const WAVEFORMS: WaveformType[] = ['sine', 'square', 'sawtooth', 'triangle'];

// ---------------------------------------------------------------------------
// Audio synthesis helpers
// ---------------------------------------------------------------------------

interface Envelope {
    attack: number;
    sustain: number;
    release: number;
}

/** Compute ADSR envelope amplitude at time t */
function computeEnvelope(t: number, duration: number, env: Envelope): number {
    if (t < env.attack) {
        return t / env.attack; // Attack: ramp up
    }
    const releaseStart = duration - env.release;
    if (t > releaseStart) {
        const releaseT = (t - releaseStart) / env.release;
        return Math.max(0, env.sustain * (1 - releaseT));
    }
    return env.sustain; // Sustain
}

/** Generate a tone at a given frequency with an envelope */
function generateTone(
    frequency: number,
    duration: number,
    sampleRate: number,
    waveform: WaveformType,
    envelope: Envelope,
    volume: number = 0.3,
): Float32Array {
    const samples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const amplitude = computeEnvelope(t, duration, envelope) * volume;
        const phase = 2 * Math.PI * frequency * t;

        switch (waveform) {
            case 'sine':
                buffer[i] = amplitude * Math.sin(phase);
                break;
            case 'square':
                buffer[i] = amplitude * (Math.sin(phase) >= 0 ? 1 : -1) * 0.5;
                break;
            case 'sawtooth':
                buffer[i] = amplitude * (2 * (frequency * t % 1) - 1) * 0.5;
                break;
            case 'triangle':
                buffer[i] = amplitude * (4 * Math.abs(frequency * t % 1 - 0.5) - 1) * 0.5;
                break;
        }
    }
    return buffer;
}

/** Convert MIDI note number to frequency */
function midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Apply simple feedback delay effect */
function applyDelay(
    samples: Float32Array,
    sampleRate: number,
    delayTime: number, // seconds
    wetMix: number,    // 0–1
): Float32Array {
    const delaySamples = Math.floor(delayTime * sampleRate);
    const output = new Float32Array(samples.length);
    const feedback = 0.3;

    for (let i = 0; i < samples.length; i++) {
        output[i] = samples[i];
        if (i >= delaySamples) {
            output[i] += output[i - delaySamples] * wetMix * feedback;
        }
    }
    return output;
}

// ---------------------------------------------------------------------------
// WAV encoder (pure JS, zero deps)
// ---------------------------------------------------------------------------

function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

/** Encode Float32 samples to WAV (16-bit PCM, mono) */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const numSamples = samples.length;
    const bytesPerSample = 2; // 16-bit
    const dataSize = numSamples * bytesPerSample;
    const bufferSize = 44 + dataSize;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true); // File size - 8
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);           // Sub-chunk size (16 for PCM)
    view.setUint16(20, 1, true);            // Audio format (1 = PCM)
    view.setUint16(22, 1, true);            // Number of channels (mono)
    view.setUint32(24, sampleRate, true);    // Sample rate
    view.setUint32(28, sampleRate * bytesPerSample, true); // Byte rate
    view.setUint16(32, bytesPerSample, true); // Block align
    view.setUint16(34, 16, true);            // Bits per sample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);      // Data size

    // Write PCM samples (Float32 → Int16)
    for (let i = 0; i < numSamples; i++) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * bytesPerSample, Math.round(clamped * 0x7FFF), true);
    }

    return buffer;
}

// ---------------------------------------------------------------------------
// Byte-to-music mapping
// ---------------------------------------------------------------------------

interface MusicParams {
    scale: number[];
    rootMidi: number;
    tempo: number;       // BPM
    melodyPattern: number[];
    rhythmPattern: number[];
    waveform: WaveformType;
    delayTime: number;
    wetMix: number;
    chordIntervals: number[];
    envelope: Envelope;
}

/** Read two bytes as big-endian uint16 */
function uint16(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset] << 8) | bytes[offset + 1]) >>> 0;
}

/** Map 32 hash bytes to musical parameters */
function extractMusicParams(bytes: Uint8Array): MusicParams {
    // Bytes 0–1: Scale/mode
    const scaleIdx = uint16(bytes, 0) % SCALES.length;
    const scale = SCALES[scaleIdx];

    // Bytes 2–3: Root note (MIDI 48–72, i.e. C3 to C5)
    const rootMidi = 48 + (uint16(bytes, 2) % 25);

    // Bytes 4–5: Tempo (60–180 BPM)
    const tempo = 60 + (uint16(bytes, 4) % 121);

    // Bytes 6–8: Melody pattern (sequence of scale degree offsets)
    const melodyPattern = [bytes[6] % scale.length, bytes[7] % scale.length, bytes[8] % scale.length];
    // Extend to 8 notes by reflecting
    const fullMelody = [
        ...melodyPattern,
        melodyPattern[1],
        (melodyPattern[0] + 1) % scale.length,
        melodyPattern[2],
        (melodyPattern[1] + 2) % scale.length,
        melodyPattern[0],
    ];

    // Bytes 9–10: Rhythm pattern (relative note durations)
    const rhythmBase = [
        1 + (bytes[9] & 0x03),         // 1–4 beats
        1 + ((bytes[9] >> 2) & 0x03),
        1 + ((bytes[9] >> 4) & 0x03),
        1 + ((bytes[9] >> 6) & 0x03),
        1 + (bytes[10] & 0x03),
        1 + ((bytes[10] >> 2) & 0x03),
        1 + ((bytes[10] >> 4) & 0x03),
        1 + ((bytes[10] >> 6) & 0x03),
    ];

    // Bytes 11–12: Timbre (waveform + FM ratio)
    const waveform = WAVEFORMS[uint16(bytes, 11) % WAVEFORMS.length];

    // Bytes 13–14: Reverb/delay
    const delayTime = 0.05 + (bytes[13] / 255) * 0.35; // 50ms–400ms
    const wetMix = 0.1 + (bytes[14] / 255) * 0.5; // 10%–60%

    // Bytes 15–17: Chord voicing
    const chordIntervals: number[] = [];
    if (bytes[15] > 85) chordIntervals.push(scale[2 % scale.length]); // thirds
    if (bytes[16] > 85) chordIntervals.push(scale[4 % scale.length]); // fifths
    if (bytes[17] > 170) chordIntervals.push(scale[(scale.length - 1) % scale.length]); // sevenths

    // Bytes 18–19: Dynamics (ADSR envelope)
    const attack = 0.01 + (bytes[18] / 255) * 0.15;   // 10ms–160ms
    const release = 0.05 + (bytes[19] / 255) * 0.3;    // 50ms–350ms
    const sustain = 0.5 + ((bytes[18] ^ bytes[19]) / 255) * 0.5; // 50%–100%

    return {
        scale,
        rootMidi,
        tempo,
        melodyPattern: fullMelody,
        rhythmPattern: rhythmBase,
        waveform,
        delayTime,
        wetMix,
        chordIntervals,
        envelope: { attack, sustain, release },
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a hash string into a unique audio signature (melody).
 *
 * @param input - any string (hash, fingerprint, etc.)
 * @param options - duration, sample rate, format
 * @returns WAV ArrayBuffer (format='wav') or raw Float32 sample buffer
 */
export async function sonifyHash(
    input: string,
    options?: SonifyOptions,
): Promise<ArrayBuffer> {
    const duration = options?.duration ?? 3;
    const sampleRate = options?.sampleRate ?? 44100;
    const format = options?.format ?? 'wav';

    // Normalize input to 32 bytes
    const bytes = await normalize(input);
    const params = extractMusicParams(bytes);

    const totalSamples = Math.floor(duration * sampleRate);
    const mixBuffer = new Float32Array(totalSamples);

    // Calculate beat duration
    const beatDuration = 60 / params.tempo; // seconds per beat

    // Generate melody notes
    let currentTime = 0;
    const noteCount = params.melodyPattern.length;

    for (let n = 0; n < noteCount && currentTime < duration; n++) {
        const scaleDegree = params.melodyPattern[n];
        const semitoneOffset = params.scale[scaleDegree % params.scale.length];
        const midi = params.rootMidi + semitoneOffset;
        const freq = midiToFreq(midi);

        const rhythmBeats = params.rhythmPattern[n % params.rhythmPattern.length];
        const noteDuration = Math.min(beatDuration * rhythmBeats, duration - currentTime);

        if (noteDuration <= 0) break;

        // Generate root note
        const noteSamples = generateTone(freq, noteDuration, sampleRate, params.waveform, params.envelope);

        // Mix into output buffer
        const startSample = Math.floor(currentTime * sampleRate);
        for (let s = 0; s < noteSamples.length && startSample + s < totalSamples; s++) {
            mixBuffer[startSample + s] += noteSamples[s];
        }

        // Add chord intervals
        for (const interval of params.chordIntervals) {
            const chordFreq = midiToFreq(midi + interval);
            const chordSamples = generateTone(chordFreq, noteDuration, sampleRate, params.waveform, params.envelope, 0.15);
            for (let s = 0; s < chordSamples.length && startSample + s < totalSamples; s++) {
                mixBuffer[startSample + s] += chordSamples[s];
            }
        }

        currentTime += noteDuration;
    }

    // Apply delay effect
    const processed = applyDelay(mixBuffer, sampleRate, params.delayTime, params.wetMix);

    // Normalize to prevent clipping
    let maxAmp = 0;
    for (let i = 0; i < processed.length; i++) {
        const abs = Math.abs(processed[i]);
        if (abs > maxAmp) maxAmp = abs;
    }
    if (maxAmp > 0.95) {
        const scale = 0.9 / maxAmp;
        for (let i = 0; i < processed.length; i++) {
            processed[i] *= scale;
        }
    }

    if (format === 'buffer') {
        return processed.buffer as ArrayBuffer;
    }

    return encodeWav(processed, sampleRate);
}
