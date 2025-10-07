// public/audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleBuffer = [];
    this.CHUNK_SIZE = 2048;
    this.processedCount = 0;
    this.chunksSent = 0;
    this.lastAudioTime = 0;
    this.SILENCE_THRESHOLD = 0.008; // ✅ ENHANCED: Slightly higher threshold

    // ✅ NEW: Duration and token management
    this.MAX_AUDIO_DURATION = 15000; // 15 seconds max to prevent token overflow
    this.startTime = Date.now();
    this.audioChunksSent = 0;
    this.MAX_CHUNKS = 300; // Limit total chunks to prevent excessive data

    console.log(
      "🎤 AudioProcessor initialized with enhanced VAD and duration limits"
    );
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (!input || input.length === 0 || !input[0]) {
      return true;
    }

    // ✅ NEW: Check duration limit to prevent token overflow
    const currentTime = Date.now();
    if (currentTime - this.startTime > this.MAX_AUDIO_DURATION) {
      console.log(
        "⏰ MAX DURATION REACHED - Stopping to prevent token overflow"
      );
      this.port.postMessage({
        type: "duration_limit_reached",
        duration: currentTime - this.startTime,
        chunksSent: this.chunksSent,
      });
      return true; // Keep processor alive but stop processing
    }

    // ✅ NEW: Check chunk limit
    if (this.audioChunksSent >= this.MAX_CHUNKS) {
      console.log("📊 MAX CHUNKS REACHED - Stopping to prevent token overflow");
      this.port.postMessage({
        type: "chunk_limit_reached",
        chunksSent: this.chunksSent,
      });
      return true;
    }

    const inputChannel = input[0];
    this.processedCount++;

    // Add incoming samples to buffer
    this.sampleBuffer.push(...inputChannel);

    // ✅ ENHANCED: Better voice activity detection
    let hasAudio = false;
    let maxAmplitude = 0;
    let avgAmplitude = 0;
    let audioSampleCount = 0;
    let significantAudioCount = 0; // Count of samples above higher threshold

    for (let i = 0; i < inputChannel.length; i++) {
      const amplitude = Math.abs(inputChannel[i]);
      maxAmplitude = Math.max(maxAmplitude, amplitude);
      avgAmplitude += amplitude;

      // ✅ ENHANCED: Multi-threshold detection
      if (amplitude > this.SILENCE_THRESHOLD) {
        hasAudio = true;
        audioSampleCount++;
        this.lastAudioTime = this.processedCount;
      }

      // Count samples above higher threshold for quality check
      if (amplitude > 0.015) {
        significantAudioCount++;
      }
    }

    avgAmplitude = avgAmplitude / inputChannel.length;

    // ✅ ENHANCED: More sophisticated audio detection
    const audioRatio = audioSampleCount / inputChannel.length;
    const significantRatio = significantAudioCount / inputChannel.length;

    hasAudio =
      hasAudio &&
      audioRatio > 0.12 &&
      (maxAmplitude > 0.01 || significantRatio > 0.05);

    // ✅ ENHANCED: Better logging with duration info
    if (this.processedCount % 50 === 0) {
      const elapsed = (currentTime - this.startTime) / 1000;
      console.log(
        `🔄 Processed ${this.processedCount} chunks, buffer: ${this.sampleBuffer.length} samples, ` +
          `elapsed: ${elapsed.toFixed(1)}s, maxAmp: ${maxAmplitude.toFixed(
            4
          )}, ` +
          `hasAudio: ${hasAudio}, audioRatio: ${audioRatio.toFixed(
            2
          )}, sigRatio: ${significantRatio.toFixed(2)}`
      );
    }

    // Send chunks when buffer reaches target size
    while (this.sampleBuffer.length >= this.CHUNK_SIZE) {
      const chunk = this.sampleBuffer.splice(0, this.CHUNK_SIZE);

      // ✅ ENHANCED: Better chunk analysis
      const chunkHasAudio = this.analyzeChunkForAudio(chunk);

      if (!chunkHasAudio) {
        // ✅ IMPROVED: Less verbose logging for silent chunks
        if (this.chunksSent % 20 === 0) {
          console.log(`⏭️ Skipping silent chunk (${this.chunksSent + 1})`);
        }
        continue;
      }

      const pcmData = this.convertToPCM16(chunk);

      if (pcmData && pcmData.buffer) {
        this.port.postMessage({
          type: "pcm16",
          data: pcmData,
          metadata: {
            chunkNumber: this.chunksSent + 1,
            elapsed: (currentTime - this.startTime) / 1000,
            maxAmplitude: this.getChunkMaxAmplitude(chunk),
          },
        });

        this.chunksSent++;
        this.audioChunksSent++;

        // ✅ REDUCED: Less frequent logging for performance
        if (this.chunksSent % 10 === 0 || chunkHasAudio) {
          console.log(
            `📤 Sent audio chunk #${this.chunksSent}: ${pcmData.length} samples ` +
              `(${pcmData.byteLength} bytes), elapsed: ${(
                (currentTime - this.startTime) /
                1000
              ).toFixed(1)}s`
          );
        }
      }
    }

    return true;
  }

  // ✅ ENHANCED: More sophisticated chunk analysis
  analyzeChunkForAudio(floatSamples) {
    let audioSamples = 0;
    let maxAmplitude = 0;
    let avgAmplitude = 0;
    let peakSamples = 0; // Samples above a high threshold

    for (let i = 0; i < floatSamples.length; i++) {
      const amplitude = Math.abs(floatSamples[i]);
      maxAmplitude = Math.max(maxAmplitude, amplitude);
      avgAmplitude += amplitude;

      if (amplitude > this.SILENCE_THRESHOLD) {
        audioSamples++;
      }

      if (amplitude > 0.02) {
        // High threshold for clear speech
        peakSamples++;
      }
    }

    avgAmplitude = avgAmplitude / floatSamples.length;
    const audioRatio = audioSamples / floatSamples.length;
    const peakRatio = peakSamples / floatSamples.length;

    // ✅ ENHANCED: More selective criteria
    // Consider it meaningful audio if:
    // 1. Max amplitude is significant, AND
    // 2. At least 10% of samples are above threshold, AND
    // 3. Average amplitude shows energy, AND
    // 4. Either high max amplitude OR good peak ratio
    return (
      maxAmplitude > this.SILENCE_THRESHOLD &&
      audioRatio > 0.08 &&
      avgAmplitude > 0.002 &&
      (maxAmplitude > 0.015 || peakRatio > 0.03)
    );
  }

  // ✅ NEW: Get max amplitude of a chunk for metadata
  getChunkMaxAmplitude(floatSamples) {
    let maxAmplitude = 0;
    for (let i = 0; i < floatSamples.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(floatSamples[i]));
    }
    return maxAmplitude;
  }

  // ✅ NEW: Reset duration tracking for new recording sessions
  resetSession() {
    this.startTime = Date.now();
    this.chunksSent = 0;
    this.audioChunksSent = 0;
    this.processedCount = 0;
    this.sampleBuffer = [];
    console.log("🔄 AudioProcessor session reset - ready for new recording");
  }

  convertToPCM16(floatSamples) {
    if (!floatSamples || floatSamples.length === 0) {
      return new Int16Array(0);
    }

    const pcmSamples = new Int16Array(floatSamples.length);

    for (let i = 0; i < floatSamples.length; i++) {
      let sample = Math.max(-1, Math.min(1, floatSamples[i]));

      if (isNaN(sample)) {
        sample = 0;
      }

      pcmSamples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return pcmSamples;
  }
}

registerProcessor("audio-processor", AudioProcessor);
