const axios = require('axios');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      console.warn('⚠️ ElevenLabs API key not configured - voice modulation disabled');
    }
  }

  // Available voice IDs for anonymous masking
  getAvailableVoices() {
    return [
      { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', gender: 'female', description: 'Calm and supportive' },
      { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'male', description: 'Warm and understanding' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', description: 'Gentle and empathetic' },
      { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', description: 'Professional and caring' },
      { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'neutral', description: 'Neutral and balanced' },
      { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', description: 'Deep and reassuring' },
      { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'male', description: 'Young and friendly' },
      { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'neutral', description: 'Smooth and calming' }
    ];
  }

  // Text-to-speech for real-time voice modulation
  async synthesizeSpeech(text, voiceId, voiceSettings = {}) {
    if (!this.isEnabled) {
      throw new Error('ElevenLabs service not available');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_turbo_v2_5', // Low latency model for real-time
          voice_settings: {
            stability: voiceSettings.stability || 0.5,
            similarity_boost: voiceSettings.similarityBoost || 0.5,
            style: voiceSettings.style || 0,
            use_speaker_boost: voiceSettings.useSpeakerBoost !== false
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ ElevenLabs synthesis error:', error.response?.data || error.message);
      throw new Error('Voice synthesis failed');
    }
  }

  // Voice-to-voice conversion for real-time masking
  async voiceConversion(audioBuffer, sourceVoiceId, targetVoiceId, settings = {}) {
    if (!this.isEnabled) {
      throw new Error('ElevenLabs service not available');
    }

    try {
      const formData = new FormData();
      formData.append('audio', new Blob([audioBuffer]), 'audio.wav');
      formData.append('target_voice_id', targetVoiceId);
      formData.append('voice_settings', JSON.stringify({
        stability: settings.stability || 0.5,
        similarity_boost: settings.similarityBoost || 0.5,
        style: settings.style || 0,
        use_speaker_boost: settings.useSpeakerBoost !== false
      }));

      const response = await axios.post(
        `${this.baseUrl}/voice-conversion`,
        formData,
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ ElevenLabs voice conversion error:', error.response?.data || error.message);
      throw new Error('Voice conversion failed');
    }
  }

  // Get voice information
  async getVoiceInfo(voiceId) {
    if (!this.isEnabled) {
      throw new Error('ElevenLabs service not available');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ ElevenLabs voice info error:', error.response?.data || error.message);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    if (!this.isEnabled) {
      return { status: 'disabled', reason: 'API key not configured' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      return { 
        status: 'healthy', 
        subscription: response.data.subscription,
        charactersUsed: response.data.subscription?.character_count || 0,
        charactersLimit: response.data.subscription?.character_limit || 0
      };
    } catch (error) {
      console.error('❌ ElevenLabs health check failed:', error.response?.data || error.message);
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = new ElevenLabsService();