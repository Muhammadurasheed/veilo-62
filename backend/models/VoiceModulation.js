const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const voiceModulationSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => `voice-mod-${nanoid(10)}`,
    unique: true,
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    ref: 'LiveSanctuarySession'
  },
  participantId: {
    type: String,
    required: true
  },
  elevenLabsVoiceId: {
    type: String,
    required: true
  },
  voiceSettings: {
    stability: { type: Number, default: 0.5, min: 0, max: 1 },
    similarityBoost: { type: Number, default: 0.5, min: 0, max: 1 },
    style: { type: Number, default: 0, min: 0, max: 1 },
    useSpeakerBoost: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
voiceModulationSchema.index({ sessionId: 1, participantId: 1 });
voiceModulationSchema.index({ participantId: 1, lastUsed: -1 });

module.exports = mongoose.model('VoiceModulation', voiceModulationSchema);