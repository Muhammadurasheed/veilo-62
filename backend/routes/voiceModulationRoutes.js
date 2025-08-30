const express = require('express');
const router = express.Router();
const VoiceModulation = require('../models/VoiceModulation');
const LiveSanctuarySession = require('../models/LiveSanctuarySession');
const elevenLabsService = require('../services/elevenLabsService');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get available voices for modulation
router.get('/voices', authMiddleware, async (req, res) => {
  try {
    const voices = elevenLabsService.getAvailableVoices();
    const healthStatus = await elevenLabsService.healthCheck();
    
    res.success({
      voices,
      serviceStatus: healthStatus,
      isEnabled: elevenLabsService.isEnabled
    }, 'Available voices retrieved');
  } catch (error) {
    console.error('❌ Get voices error:', error);
    res.error('Failed to retrieve available voices', 500);
  }
});

// Set voice modulation for a participant in a session
router.post('/sessions/:sessionId/modulation',
  authMiddleware,
  [
    body('voiceId').notEmpty().withMessage('Voice ID is required'),
    body('settings.stability').optional().isFloat({ min: 0, max: 1 }),
    body('settings.similarityBoost').optional().isFloat({ min: 0, max: 1 }),
    body('settings.style').optional().isFloat({ min: 0, max: 1 }),
    body('settings.useSpeakerBoost').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.error('Validation failed', 400, errors.array());
      }

      const { sessionId } = req.params;
      const { voiceId, settings = {} } = req.body;

      // Verify session exists and user is participant
      const session = await LiveSanctuarySession.findOne({ 
        id: sessionId, 
        isActive: true 
      });

      if (!session) {
        return res.error('Live sanctuary session not found or inactive', 404);
      }

      const isParticipant = session.participants.some(p => p.id === req.user.id);
      if (!isParticipant) {
        return res.error('You must be a participant to set voice modulation', 403);
      }

      // Verify voice ID is valid
      const availableVoices = elevenLabsService.getAvailableVoices();
      const selectedVoice = availableVoices.find(v => v.id === voiceId);
      if (!selectedVoice) {
        return res.error('Invalid voice ID selected', 400);
      }

      // Check or create voice modulation record
      let voiceModulation = await VoiceModulation.findOne({
        sessionId,
        participantId: req.user.id
      });

      if (voiceModulation) {
        // Update existing modulation
        voiceModulation.elevenLabsVoiceId = voiceId;
        voiceModulation.voiceSettings = {
          stability: settings.stability || 0.5,
          similarityBoost: settings.similarityBoost || 0.5,
          style: settings.style || 0,
          useSpeakerBoost: settings.useSpeakerBoost !== false
        };
        voiceModulation.lastUsed = new Date();
        voiceModulation.isActive = true;
      } else {
        // Create new modulation
        voiceModulation = new VoiceModulation({
          sessionId,
          participantId: req.user.id,
          elevenLabsVoiceId: voiceId,
          voiceSettings: {
            stability: settings.stability || 0.5,
            similarityBoost: settings.similarityBoost || 0.5,
            style: settings.style || 0,
            useSpeakerBoost: settings.useSpeakerBoost !== false
          }
        });
      }

      await voiceModulation.save();

      // Notify other participants via socket
      req.app.get('io')?.to(`audio_room_${sessionId}`).emit('voice_modulation_changed', {
        participantId: req.user.id,
        voiceName: selectedVoice.name,
        voiceDescription: selectedVoice.description,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Voice modulation set for user ${req.user.id} in session ${sessionId}:`, {
        voiceId,
        voiceName: selectedVoice.name
      });

      res.success({
        modulation: {
          id: voiceModulation.id,
          voiceId: voiceModulation.elevenLabsVoiceId,
          voiceName: selectedVoice.name,
          voiceDescription: selectedVoice.description,
          settings: voiceModulation.voiceSettings,
          isActive: voiceModulation.isActive
        }
      }, 'Voice modulation configured successfully');

    } catch (error) {
      console.error('❌ Voice modulation setup error:', error);
      res.error('Failed to configure voice modulation: ' + error.message, 500);
    }
  }
);

// Get current voice modulation for a session participant
router.get('/sessions/:sessionId/modulation', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const voiceModulation = await VoiceModulation.findOne({
      sessionId,
      participantId: req.user.id,
      isActive: true
    });

    if (!voiceModulation) {
      return res.success({ modulation: null }, 'No voice modulation configured');
    }

    const availableVoices = elevenLabsService.getAvailableVoices();
    const selectedVoice = availableVoices.find(v => v.id === voiceModulation.elevenLabsVoiceId);

    res.success({
      modulation: {
        id: voiceModulation.id,
        voiceId: voiceModulation.elevenLabsVoiceId,
        voiceName: selectedVoice?.name || 'Unknown Voice',
        voiceDescription: selectedVoice?.description || '',
        settings: voiceModulation.voiceSettings,
        isActive: voiceModulation.isActive
      }
    }, 'Voice modulation retrieved');

  } catch (error) {
    console.error('❌ Get voice modulation error:', error);
    res.error('Failed to retrieve voice modulation', 500);
  }
});

// Disable voice modulation
router.delete('/sessions/:sessionId/modulation', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await VoiceModulation.updateOne(
      {
        sessionId,
        participantId: req.user.id
      },
      {
        isActive: false,
        lastUsed: new Date()
      }
    );

    if (result.matchedCount === 0) {
      return res.error('No voice modulation found to disable', 404);
    }

    // Notify other participants via socket
    req.app.get('io')?.to(`audio_room_${sessionId}`).emit('voice_modulation_disabled', {
      participantId: req.user.id,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Voice modulation disabled for user ${req.user.id} in session ${sessionId}`);

    res.success({}, 'Voice modulation disabled successfully');

  } catch (error) {
    console.error('❌ Disable voice modulation error:', error);
    res.error('Failed to disable voice modulation', 500);
  }
});

// Process audio for voice modulation (real-time endpoint)
router.post('/sessions/:sessionId/process-audio',
  authMiddleware,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Check if user has voice modulation enabled
      const voiceModulation = await VoiceModulation.findOne({
        sessionId,
        participantId: req.user.id,
        isActive: true
      });

      if (!voiceModulation) {
        return res.error('Voice modulation not configured', 400);
      }

      // Check if audio data is provided
      if (!req.body.audioData) {
        return res.error('Audio data is required', 400);
      }

      // Convert base64 audio to buffer
      const audioBuffer = Buffer.from(req.body.audioData, 'base64');

      // Process audio through ElevenLabs
      try {
        const processedAudio = await elevenLabsService.voiceConversion(
          audioBuffer,
          null, // Source voice (auto-detect)
          voiceModulation.elevenLabsVoiceId,
          voiceModulation.voiceSettings
        );

        // Return processed audio as base64
        const processedBase64 = Buffer.from(processedAudio).toString('base64');

        res.success({
          processedAudio: processedBase64,
          timestamp: new Date().toISOString()
        }, 'Audio processed successfully');

      } catch (elevenLabsError) {
        console.warn('⚠️ ElevenLabs processing failed, returning original audio:', elevenLabsError.message);
        
        // Fallback: return original audio if ElevenLabs fails
        res.success({
          processedAudio: req.body.audioData,
          fallback: true,
          error: 'Voice modulation temporarily unavailable'
        }, 'Audio returned without processing (fallback)');
      }

    } catch (error) {
      console.error('❌ Audio processing error:', error);
      res.error('Failed to process audio: ' + error.message, 500);
    }
  }
);

module.exports = router;