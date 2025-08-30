const express = require('express');
const router = express.Router();
const ScheduledSanctuary = require('../models/ScheduledSanctuary');
const LiveSanctuarySession = require('../models/LiveSanctuarySession');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { generateRtcToken } = require('../utils/agoraTokenGenerator');
const { nanoid } = require('nanoid');

// Create scheduled sanctuary
router.post('/', 
  authMiddleware,
  [
    body('topic').isLength({ min: 5, max: 100 }).trim(),
    body('description').optional().isLength({ max: 500 }).trim(),
    body('scheduledDateTime').isISO8601().withMessage('Valid date time required'),
    body('estimatedDuration').optional().isInt({ min: 15, max: 480 }),
    body('maxParticipants').optional().isInt({ min: 2, max: 200 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const {
        topic,
        description,
        emoji,
        scheduledDateTime,
        estimatedDuration = 60,
        maxParticipants = 50,
        allowEarlyJoin = false,
        earlyJoinMinutes = 15,
        settings = {}
      } = req.body;

      // Validate scheduled time is in the future
      const scheduledTime = new Date(scheduledDateTime);
      if (scheduledTime <= new Date()) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
      }

      // Create scheduled sanctuary
      const scheduledSanctuary = new ScheduledSanctuary({
        topic: topic.trim(),
        description: description?.trim(),
        emoji: emoji || '🎙️',
        hostId: req.user.id,
        hostAlias: req.user.alias || `Host_${nanoid(4)}`,
        scheduledDateTime: scheduledTime,
        estimatedDuration,
        maxParticipants,
        allowEarlyJoin,
        earlyJoinMinutes,
        settings: {
          allowAnonymous: settings.allowAnonymous !== false,
          audioOnly: settings.audioOnly !== false,
          moderationEnabled: settings.moderationEnabled !== false,
          emergencyContactEnabled: settings.emergencyContactEnabled !== false,
          recordingEnabled: settings.recordingEnabled === true,
          voiceModulationEnabled: settings.voiceModulationEnabled !== false,
          requireAcknowledgment: settings.requireAcknowledgment !== false
        }
      });

      await scheduledSanctuary.save();

      console.log('✅ Scheduled sanctuary created:', {
        id: scheduledSanctuary.id,
        topic,
        scheduledDateTime,
        hostId: req.user.id
      });

      res.success({
        sanctuary: {
          id: scheduledSanctuary.id,
          topic: scheduledSanctuary.topic,
          description: scheduledSanctuary.description,
          emoji: scheduledSanctuary.emoji,
          scheduledDateTime: scheduledSanctuary.scheduledDateTime,
          estimatedDuration: scheduledSanctuary.estimatedDuration,
          maxParticipants: scheduledSanctuary.maxParticipants,
          invitationCode: scheduledSanctuary.invitationCode,
          status: scheduledSanctuary.status,
          settings: scheduledSanctuary.settings
        }
      }, 'Scheduled sanctuary created successfully');

    } catch (error) {
      console.error('❌ Scheduled sanctuary creation error:', error);
      res.error('Failed to create scheduled sanctuary: ' + error.message, 500);
    }
  }
);

// Get scheduled sanctuary by ID or invitation code
router.get('/:identifier', optionalAuthMiddleware, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by invitation code
    let sanctuary = await ScheduledSanctuary.findOne({ id: identifier });
    if (!sanctuary) {
      sanctuary = await ScheduledSanctuary.findOne({ invitationCode: identifier });
    }

    if (!sanctuary) {
      return res.error('Scheduled sanctuary not found', 404);
    }

    // Check join eligibility
    const joinStatus = sanctuary.canJoin();

    console.log('🔍 Scheduled sanctuary accessed:', {
      id: sanctuary.id,
      topic: sanctuary.topic,
      status: sanctuary.status,
      canJoin: joinStatus.canJoin
    });

    res.success({
      sanctuary: {
        id: sanctuary.id,
        topic: sanctuary.topic,
        description: sanctuary.description,
        emoji: sanctuary.emoji,
        hostAlias: sanctuary.hostAlias,
        scheduledDateTime: sanctuary.scheduledDateTime,
        estimatedDuration: sanctuary.estimatedDuration,
        maxParticipants: sanctuary.maxParticipants,
        registeredCount: sanctuary.registeredParticipants.length,
        status: sanctuary.status,
        liveSanctuarySessionId: sanctuary.liveSanctuarySessionId,
        settings: sanctuary.settings,
        joinStatus
      }
    }, 'Scheduled sanctuary retrieved');

  } catch (error) {
    console.error('❌ Get scheduled sanctuary error:', error);
    res.error('Failed to retrieve scheduled sanctuary', 500);
  }
});

// Join scheduled sanctuary (acknowledgment step)
router.post('/:identifier/join', authMiddleware, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { acknowledged = false } = req.body;

    // Find scheduled sanctuary
    let sanctuary = await ScheduledSanctuary.findOne({ id: identifier });
    if (!sanctuary) {
      sanctuary = await ScheduledSanctuary.findOne({ invitationCode: identifier });
    }

    if (!sanctuary) {
      return res.error('Scheduled sanctuary not found', 404);
    }

    // Check if acknowledgment is required
    if (sanctuary.settings.requireAcknowledgment && !acknowledged) {
      return res.success({
        requiresAcknowledgment: true,
        acknowledgmentText: sanctuary.preJoinAcknowledgment,
        sanctuary: {
          topic: sanctuary.topic,
          description: sanctuary.description,
          scheduledDateTime: sanctuary.scheduledDateTime,
          estimatedDuration: sanctuary.estimatedDuration
        }
      }, 'Acknowledgment required');
    }

    // Check join eligibility
    const joinStatus = sanctuary.canJoin();
    if (!joinStatus.canJoin) {
      return res.error(joinStatus.reason, 400, { 
        countdown: joinStatus.countdown,
        scheduledDateTime: sanctuary.scheduledDateTime
      });
    }

    // Add user to registered participants
    await sanctuary.addParticipant(req.user.id, req.user.alias || 'Participant', req.user.email);

    // If session is live, redirect to live session
    if (sanctuary.status === 'live' && sanctuary.liveSanctuarySessionId) {
      return res.success({
        redirect: 'live',
        liveSanctuarySessionId: sanctuary.liveSanctuarySessionId,
        message: 'Session is live! Redirecting...'
      }, 'Joining live session');
    }

    // If waiting room scenario
    if (joinStatus.waitingRoom) {
      return res.success({
        status: 'waiting',
        message: 'You are registered! Session will begin at the scheduled time.',
        scheduledDateTime: sanctuary.scheduledDateTime,
        countdown: Math.ceil((new Date(sanctuary.scheduledDateTime).getTime() - new Date().getTime()) / 1000)
      }, 'Added to waiting room');
    }

    // Time to go live
    return res.success({
      status: 'ready',
      message: 'Ready to start the session!',
      sanctuary: {
        id: sanctuary.id,
        topic: sanctuary.topic,
        scheduledDateTime: sanctuary.scheduledDateTime
      }
    }, 'Ready to join live session');

  } catch (error) {
    console.error('❌ Join scheduled sanctuary error:', error);
    res.error('Failed to join scheduled sanctuary: ' + error.message, 500);
  }
});

// Start scheduled sanctuary (host only)
router.post('/:identifier/start', authMiddleware, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find scheduled sanctuary
    let sanctuary = await ScheduledSanctuary.findOne({ id: identifier });
    if (!sanctuary) {
      sanctuary = await ScheduledSanctuary.findOne({ invitationCode: identifier });
    }

    if (!sanctuary) {
      return res.error('Scheduled sanctuary not found', 404);
    }

    // Verify user is host
    if (sanctuary.hostId !== req.user.id) {
      return res.error('Only the host can start the session', 403);
    }

    // Check if already live
    if (sanctuary.status === 'live') {
      return res.error('Session is already live', 400);
    }

    // Check if time is appropriate
    const now = new Date();
    const scheduledTime = new Date(sanctuary.scheduledDateTime);
    const earlyStartTime = new Date(scheduledTime.getTime() - (sanctuary.earlyJoinMinutes * 60 * 1000));

    if (now < earlyStartTime) {
      return res.error('Cannot start session too early', 400);
    }

    // Create live sanctuary session
    const sessionId = `live-sanctuary-${nanoid(8)}`;
    const channelName = `sanctuary_${sessionId}`;
    
    // Generate Agora tokens
    let agoraToken, hostToken;
    try {
      agoraToken = generateRtcToken(channelName, 0, 'subscriber', 3600 * 24);
      hostToken = generateRtcToken(channelName, req.user.id, 'publisher', 3600 * 24);
    } catch (agoraError) {
      console.warn('⚠️ Agora token generation failed:', agoraError.message);
      agoraToken = `temp_token_${nanoid(16)}`;
      hostToken = `temp_host_token_${nanoid(16)}`;
    }

    // Create live session
    const liveSession = new LiveSanctuarySession({
      id: sessionId,
      topic: sanctuary.topic,
      description: sanctuary.description,
      emoji: sanctuary.emoji,
      hostId: sanctuary.hostId,
      hostAlias: sanctuary.hostAlias,
      hostToken,
      agoraChannelName: channelName,
      agoraToken,
      expiresAt: new Date(Date.now() + (sanctuary.estimatedDuration * 60 * 1000)),
      scheduledAt: sanctuary.scheduledDateTime,
      maxParticipants: sanctuary.maxParticipants,
      allowAnonymous: sanctuary.settings.allowAnonymous,
      audioOnly: sanctuary.settings.audioOnly,
      moderationEnabled: sanctuary.settings.moderationEnabled,
      emergencyContactEnabled: sanctuary.settings.emergencyContactEnabled,
      isRecorded: sanctuary.settings.recordingEnabled,
      participants: [{
        id: req.user.id,
        alias: sanctuary.hostAlias,
        isHost: true,
        isModerator: true,
        isMuted: false,
        isBlocked: false,
        handRaised: false,
        joinedAt: new Date(),
        avatarIndex: req.user.avatarIndex || 1,
        connectionStatus: 'connected',
        audioLevel: 0,
        speakingTime: 0
      }],
      currentParticipants: 1,
      startTime: new Date(),
      status: 'active',
      estimatedDuration: sanctuary.estimatedDuration,
      tags: [],
      language: 'en'
    });

    await liveSession.save();

    // Update scheduled sanctuary status
    await sanctuary.goLive(sessionId);

    // Notify registered participants via socket
    req.app.get('io')?.emit('scheduled_sanctuary_live', {
      scheduledSanctuaryId: sanctuary.id,
      liveSanctuarySessionId: sessionId,
      topic: sanctuary.topic,
      hostAlias: sanctuary.hostAlias,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Scheduled sanctuary started:', {
      scheduledId: sanctuary.id,
      liveSessionId: sessionId,
      topic: sanctuary.topic
    });

    res.success({
      liveSession: {
        id: liveSession.id,
        agoraChannelName: liveSession.agoraChannelName,
        agoraToken: liveSession.agoraToken,
        hostToken: liveSession.hostToken
      },
      sanctuary: {
        id: sanctuary.id,
        topic: sanctuary.topic,
        registeredParticipants: sanctuary.registeredParticipants.length
      }
    }, 'Scheduled sanctuary started successfully');

  } catch (error) {
    console.error('❌ Start scheduled sanctuary error:', error);
    res.error('Failed to start scheduled sanctuary: ' + error.message, 500);
  }
});

// Get scheduled sanctuaries (for host)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status = 'all', limit = 20, page = 1 } = req.query;
    
    let query = { hostId: req.user.id };
    if (status !== 'all') {
      query.status = status;
    }

    const sanctuaries = await ScheduledSanctuary.find(query)
      .sort({ scheduledDateTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ScheduledSanctuary.countDocuments(query);

    res.success({
      sanctuaries: sanctuaries.map(s => ({
        id: s.id,
        topic: s.topic,
        description: s.description,
        emoji: s.emoji,
        scheduledDateTime: s.scheduledDateTime,
        estimatedDuration: s.estimatedDuration,
        registeredCount: s.registeredParticipants.length,
        maxParticipants: s.maxParticipants,
        status: s.status,
        invitationCode: s.invitationCode,
        liveSanctuarySessionId: s.liveSanctuarySessionId
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Scheduled sanctuaries retrieved');

  } catch (error) {
    console.error('❌ Get scheduled sanctuaries error:', error);
    res.error('Failed to retrieve scheduled sanctuaries', 500);
  }
});

module.exports = router;