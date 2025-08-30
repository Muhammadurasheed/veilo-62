const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const LiveSanctuarySession = require('../models/LiveSanctuarySession');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { generateRtcToken } = require('../utils/agoraTokenGenerator');

// Enhanced Live Sanctuary session creation with better error handling and structure
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      topic,
      description,
      emoji,
      maxParticipants = 50,
      audioOnly = true,
      allowAnonymous = true,
      moderationEnabled = true,
      emergencyContactEnabled = true,
      expireHours = 24
    } = req.body;

    console.log('🎙️ Creating live sanctuary session:', { 
      topic, 
      hostId: req.user.id,
      maxParticipants,
      audioOnly 
    });

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    // Generate unique session ID and channel name
    const sessionId = `live-sanctuary-${nanoid(8)}`;
    const channelName = `sanctuary_${sessionId}`;
    const hostAlias = req.user.alias || `Host_${nanoid(4)}`;
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expireHours);
    
    // Generate Agora tokens with proper error handling
    let agoraToken, hostToken;
    try {
      agoraToken = generateRtcToken(channelName, 0, 'subscriber', 3600 * expireHours);
      hostToken = generateRtcToken(channelName, req.user.id, 'publisher', 3600 * expireHours);
      console.log('✅ Agora tokens generated successfully');
    } catch (agoraError) {
      console.warn('⚠️ Agora token generation failed, using placeholder:', agoraError.message);
      agoraToken = `temp_token_${nanoid(16)}`;
      hostToken = `temp_host_token_${nanoid(16)}`;
    }

    // Create session document
    const session = new LiveSanctuarySession({
      id: sessionId,
      topic: topic.trim(),
      description: description?.trim(),
      emoji: emoji || '🎙️',
      hostId: req.user.id,
      hostAlias,
      hostToken,
      agoraChannelName: channelName,
      agoraToken,
      expiresAt,
      isActive: true,
      participants: [{
        id: req.user.id,
        alias: hostAlias,
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
      maxParticipants,
      currentParticipants: 1,
      allowAnonymous,
      audioOnly,
      moderationEnabled,
      emergencyContactEnabled,
      startTime: new Date(),
      isRecorded: false,
      recordingConsent: [req.user.id],
      breakoutRooms: [],
      moderationLevel: moderationEnabled ? 'medium' : 'low',
      emergencyProtocols: emergencyContactEnabled,
      aiMonitoring: moderationEnabled,
      estimatedDuration: expireHours * 60,
      tags: [],
      language: 'en',
      status: 'active'
    });

    await session.save();

    console.log('✅ Live sanctuary session created successfully:', {
      sessionId,
      channelName,
      hostId: req.user.id,
      expiresAt
    });

    // Return response with consistent structure for frontend
    // Enhanced response with consistent structure for frontend
    const sessionResponse = {
      id: session.id,
      _id: session.id, // Also include _id as fallback
      topic: session.topic,
      description: session.description,
      emoji: session.emoji,
      hostId: session.hostId,
      hostAlias: session.hostAlias,
      agoraChannelName: session.agoraChannelName,
      agoraToken: session.agoraToken,
      hostToken: session.hostToken,
      expiresAt: session.expiresAt,
      maxParticipants: session.maxParticipants,
      currentParticipants: session.currentParticipants,
      allowAnonymous: session.allowAnonymous,
      audioOnly: session.audioOnly,
      moderationEnabled: session.moderationEnabled,
      emergencyContactEnabled: session.emergencyContactEnabled,
      status: session.status,
      isActive: session.isActive,
      participants: session.participants
    };

    console.log('📦 Sending live sanctuary response:', {
      sessionId: sessionResponse.id,
      hasId: !!sessionResponse.id,
      responseKeys: Object.keys(sessionResponse)
    });

    res.status(200).json({
      success: true,
      data: {
        session: sessionResponse,
        id: sessionResponse.id,
        hostToken: sessionResponse.hostToken
      },
      message: 'Live sanctuary session created successfully'
    });

  } catch (error) {
    console.error('❌ Live sanctuary creation error:', error);
    res.error('Failed to create live sanctuary session: ' + error.message, 500);
  }
});

// Get live sanctuary session
router.get('/:sessionId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('🔍 Fetching live sanctuary session:', sessionId);
    
    const session = await LiveSanctuarySession.findOne({ id: sessionId });
    
    if (!session) {
      return res.error('Live sanctuary session not found', 404);
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      session.status = 'ended';
      session.isActive = false;
      await session.save();
      return res.error('Live sanctuary session has expired', 410);
    }

    console.log('✅ Live sanctuary session found:', {
      sessionId,
      status: session.status,
      participants: session.currentParticipants
    });

    res.success({
      session: {
        id: session.id,
        topic: session.topic,
        description: session.description,
        emoji: session.emoji,
        hostId: session.hostId,
        hostAlias: session.hostAlias,
        agoraChannelName: session.agoraChannelName,
        agoraToken: session.agoraToken,
        expiresAt: session.expiresAt,
        maxParticipants: session.maxParticipants,
        currentParticipants: session.currentParticipants,
        allowAnonymous: session.allowAnonymous,
        audioOnly: session.audioOnly,
        moderationEnabled: session.moderationEnabled,
        emergencyContactEnabled: session.emergencyContactEnabled,
        status: session.status,
        isActive: session.isActive,
        participants: session.participants,
        breakoutRooms: session.breakoutRooms
      }
    }, 'Live sanctuary session retrieved');

  } catch (error) {
    console.error('❌ Live sanctuary fetch error:', error);
    res.error('Failed to fetch live sanctuary session: ' + error.message, 500);
  }
});

// Join live sanctuary session
router.post('/:sessionId/join', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { alias, isAnonymous = false, voiceModulation } = req.body;
    
    console.log('🚪 User joining live sanctuary:', {
      sessionId,
      userId: req.user.id,
      alias: alias || req.user.alias
    });

    const session = await LiveSanctuarySession.findOne({ id: sessionId });
    
    if (!session) {
      return res.error('Live sanctuary session not found', 404);
    }

    if (!session.isActive || session.status !== 'active') {
      return res.error('Live sanctuary session is not active', 400);
    }

    if (new Date() > session.expiresAt) {
      return res.error('Live sanctuary session has expired', 410);
    }

    if (session.currentParticipants >= session.maxParticipants) {
      return res.error('Live sanctuary session is full', 400);
    }

    // Check if user is already in session
    const existingParticipant = session.participants.find(p => p.id === req.user.id);
    if (existingParticipant) {
      return res.error('User already in session', 400);
    }

    // Add participant
    const participantAlias = alias || req.user.alias || `Participant_${nanoid(4)}`;
    const participant = {
      id: req.user.id,
      alias: participantAlias,
      isHost: false,
      isModerator: false,
      isMuted: !session.allowAnonymous, // Auto-mute non-anonymous joins
      isBlocked: false,
      handRaised: false,
      joinedAt: new Date(),
      avatarIndex: req.user.avatarIndex || Math.floor(Math.random() * 12) + 1,
      connectionStatus: 'connected',
      audioLevel: 0,
      speakingTime: 0
    };

    session.participants.push(participant);
    session.currentParticipants = session.participants.length;
    await session.save();

    console.log('✅ User joined live sanctuary:', {
      sessionId,
      userId: req.user.id,
      participantCount: session.currentParticipants
    });

    res.success({
      session: {
        id: session.id,
        agoraChannelName: session.agoraChannelName,
        agoraToken: session.agoraToken,
        participant
      }
    }, 'Successfully joined live sanctuary session');

  } catch (error) {
    console.error('❌ Live sanctuary join error:', error);
    res.error('Failed to join live sanctuary session: ' + error.message, 500);
  }
});

// Leave live sanctuary session
router.post('/:sessionId/leave', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('🚪 User leaving live sanctuary:', {
      sessionId,
      userId: req.user.id
    });

    const session = await LiveSanctuarySession.findOne({ id: sessionId });
    
    if (!session) {
      return res.error('Live sanctuary session not found', 404);
    }

    // Remove participant
    const participantIndex = session.participants.findIndex(p => p.id === req.user.id);
    if (participantIndex === -1) {
      return res.error('User not in session', 400);
    }

    const isHost = session.participants[participantIndex].isHost;
    session.participants.splice(participantIndex, 1);
    session.currentParticipants = session.participants.length;

    // If host leaves, end session or transfer to another moderator
    if (isHost) {
      const newHost = session.participants.find(p => p.isModerator);
      if (newHost) {
        newHost.isHost = true;
        session.hostId = newHost.id;
        session.hostAlias = newHost.alias;
      } else {
        // No moderators left, end session
        session.status = 'ended';
        session.isActive = false;
      }
    }

    await session.save();

    console.log('✅ User left live sanctuary:', {
      sessionId,
      userId: req.user.id,
      wasHost: isHost,
      participantCount: session.currentParticipants
    });

    res.success({
      sessionEnded: !session.isActive
    }, 'Successfully left live sanctuary session');

  } catch (error) {
    console.error('❌ Live sanctuary leave error:', error);
    res.error('Failed to leave live sanctuary session: ' + error.message, 500);
  }
});

// Get active live sanctuary sessions
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    console.log('📋 Fetching active live sanctuary sessions');
    
    const sessions = await LiveSanctuarySession.find({
      isActive: true,
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await LiveSanctuarySession.countDocuments({
      isActive: true,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    res.success({
      sessions: sessions.map(session => ({
        id: session.id,
        topic: session.topic,
        description: session.description,
        emoji: session.emoji,
        hostAlias: session.hostAlias,
        currentParticipants: session.currentParticipants,
        maxParticipants: session.maxParticipants,
        allowAnonymous: session.allowAnonymous,
        audioOnly: session.audioOnly,
        moderationEnabled: session.moderationEnabled,
        emergencyContactEnabled: session.emergencyContactEnabled,
        status: session.status,
        createdAt: session.createdAt,
        estimatedDuration: session.estimatedDuration,
        tags: session.tags,
        language: session.language
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Active live sanctuary sessions retrieved');

  } catch (error) {
    console.error('❌ Live sanctuary sessions fetch error:', error);
    res.error('Failed to fetch live sanctuary sessions: ' + error.message, 500);
  }
});

// End live sanctuary session (host only)
router.post('/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('🛑 Ending live sanctuary session:', {
      sessionId,
      userId: req.user.id
    });

    const session = await LiveSanctuarySession.findOne({ id: sessionId });
    
    if (!session) {
      return res.error('Live sanctuary session not found', 404);
    }

    // Check if user is host or admin
    const isHost = session.hostId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isHost && !isAdmin) {
      return res.error('Only the host or admin can end the session', 403);
    }

    session.status = 'ended';
    session.isActive = false;
    session.endedAt = new Date();
    await session.save();

    console.log('✅ Live sanctuary session ended:', {
      sessionId,
      endedBy: req.user.id
    });

    res.success({}, 'Live sanctuary session ended successfully');

  } catch (error) {
    console.error('❌ Live sanctuary end error:', error);
    res.error('Failed to end live sanctuary session: ' + error.message, 500);
  }
});

module.exports = router;