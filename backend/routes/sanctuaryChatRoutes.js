const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const SanctuaryMessage = require('../models/SanctuaryMessage');
const LiveSanctuarySession = require('../models/LiveSanctuarySession');
const cacheService = require('../services/cacheService');
const { nanoid } = require('nanoid');

// Get messages for a sanctuary session
router.get('/sessions/:sessionId/messages', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, page = 1, since } = req.query;
    
    console.log('📨 Fetching sanctuary messages:', { sessionId, limit, page, since });

    // Check if session exists and is accessible
    const session = await LiveSanctuarySession.findOne({ id: sessionId });
    if (!session) {
      return res.error('Sanctuary session not found', 404);
    }

    // Check cache first
    const cacheKey = `sanctuary_messages:${sessionId}:${page}:${limit}:${since || 'all'}`;
    const cachedMessages = cacheService.get(cacheKey);
    
    if (cachedMessages) {
      return res.success({
        messages: cachedMessages.messages,
        pagination: cachedMessages.pagination,
        cached: true
      }, 'Messages retrieved from cache');
    }

    // Build query
    const query = { sessionId };
    if (since) {
      query.timestamp = { $gt: new Date(since) };
    }

    // Get messages with pagination
    const messages = await SanctuaryMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await SanctuaryMessage.countDocuments(query);

    const responseData = {
      messages: messages.reverse(), // Show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    };

    // Cache for 30 seconds
    cacheService.set(cacheKey, responseData, 30);

    res.success(responseData, 'Messages retrieved successfully');

  } catch (error) {
    console.error('❌ Error fetching sanctuary messages:', error);
    res.error('Failed to fetch messages: ' + error.message, 500);
  }
});

// Send a message to sanctuary session
router.post('/sessions/:sessionId/messages', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content, type = 'text', replyTo, isAnonymous = false } = req.body;
    
    console.log('📤 Sending sanctuary message:', { 
      sessionId, 
      userId: req.user.id, 
      type, 
      contentLength: content?.length 
    });

    if (!content || content.trim().length === 0) {
      return res.error('Message content is required', 400);
    }

    if (content.length > 1000) {
      return res.error('Message too long (max 1000 characters)', 400);
    }

    // Check if session exists and is active
    const session = await LiveSanctuarySession.findOne({ 
      id: sessionId, 
      isActive: true,
      status: 'active'
    });
    
    if (!session) {
      return res.error('Sanctuary session not found or inactive', 404);
    }

    // Check if user is participant
    const isParticipant = session.participants.some(p => p.id === req.user.id);
    const isHost = session.hostId === req.user.id;
    
    if (!isParticipant && !isHost) {
      return res.error('You must join the session to send messages', 403);
    }

    // Get participant info
    const participant = session.participants.find(p => p.id === req.user.id) || {
      id: req.user.id,
      alias: req.user.alias || 'Anonymous',
      avatarIndex: req.user.avatarIndex || 1
    };

    // Create message
    const message = new SanctuaryMessage({
      id: `msg-${nanoid(12)}`,
      sessionId,
      senderId: req.user.id,
      senderAlias: isAnonymous ? 'Anonymous' : participant.alias,
      senderAvatarIndex: participant.avatarIndex,
      content: content.trim(),
      type,
      replyTo,
      isAnonymous,
      reactions: [],
      isEdited: false,
      timestamp: new Date()
    });

    await message.save();

    // Invalidate cache
    cacheService.invalidatePattern(`sanctuary_messages:${sessionId}:.*`);

    // Get socket instance for real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`sanctuary_${sessionId}`).emit('sanctuary_chat_message', {
        id: message.id,
        senderAlias: message.senderAlias,
        senderAvatarIndex: message.senderAvatarIndex,
        content: message.content,
        type: message.type,
        timestamp: message.timestamp,
        replyTo: message.replyTo,
        reactions: message.reactions,
        isEdited: message.isEdited
      });

      console.log('✅ Real-time message broadcast sent');
    }

    res.success({
      message: {
        id: message.id,
        senderAlias: message.senderAlias,
        senderAvatarIndex: message.senderAvatarIndex,
        content: message.content,
        type: message.type,
        timestamp: message.timestamp,
        replyTo: message.replyTo,
        reactions: message.reactions,
        isEdited: message.isEdited
      }
    }, 'Message sent successfully');

  } catch (error) {
    console.error('❌ Error sending sanctuary message:', error);
    res.error('Failed to send message: ' + error.message, 500);
  }
});

// Add reaction to a message
router.post('/messages/:messageId/reactions', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    console.log('👍 Adding reaction to message:', { messageId, emoji, userId: req.user.id });

    if (!emoji || emoji.length > 10) {
      return res.error('Valid emoji is required', 400);
    }

    const message = await SanctuaryMessage.findOne({ id: messageId });
    if (!message) {
      return res.error('Message not found', 404);
    }

    // Check if user is participant in the session
    const session = await LiveSanctuarySession.findOne({ id: message.sessionId });
    const isParticipant = session?.participants.some(p => p.id === req.user.id) || 
                         session?.hostId === req.user.id;
    
    if (!isParticipant) {
      return res.error('You must be a participant to react to messages', 403);
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(r => 
      r.senderId === req.user.id && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove existing reaction
      message.reactions = message.reactions.filter(r => 
        !(r.senderId === req.user.id && r.emoji === emoji)
      );
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        senderId: req.user.id,
        senderAlias: req.user.alias || 'Anonymous',
        timestamp: new Date()
      });
    }

    await message.save();

    // Invalidate cache
    cacheService.invalidatePattern(`sanctuary_messages:${message.sessionId}:.*`);

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`sanctuary_${message.sessionId}`).emit('sanctuary_message_reaction', {
        messageId: message.id,
        reactions: message.reactions,
        action: existingReaction ? 'removed' : 'added',
        emoji,
        userId: req.user.id
      });
    }

    res.success({
      reactions: message.reactions
    }, existingReaction ? 'Reaction removed' : 'Reaction added');

  } catch (error) {
    console.error('❌ Error adding reaction:', error);
    res.error('Failed to add reaction: ' + error.message, 500);
  }
});

// Delete a message (host/moderator/sender only)
router.delete('/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    console.log('🗑️ Deleting sanctuary message:', { messageId, userId: req.user.id });

    const message = await SanctuaryMessage.findOne({ id: messageId });
    if (!message) {
      return res.error('Message not found', 404);
    }

    // Check permissions
    const session = await LiveSanctuarySession.findOne({ id: message.sessionId });
    const isHost = session?.hostId === req.user.id;
    const isModerator = session?.participants.find(p => p.id === req.user.id)?.isModerator;
    const isSender = message.senderId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isModerator && !isSender && !isAdmin) {
      return res.error('Not authorized to delete this message', 403);
    }

    await SanctuaryMessage.deleteOne({ id: messageId });

    // Invalidate cache
    cacheService.invalidatePattern(`sanctuary_messages:${message.sessionId}:.*`);

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`sanctuary_${message.sessionId}`).emit('sanctuary_message_deleted', {
        messageId: message.id,
        deletedBy: req.user.id,
        timestamp: new Date()
      });
    }

    res.success({}, 'Message deleted successfully');

  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.error('Failed to delete message: ' + error.message, 500);
  }
});

// Get sanctuary chat statistics (host/moderator only)
router.get('/sessions/:sessionId/stats', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('📊 Fetching sanctuary chat stats:', { sessionId, userId: req.user.id });

    const session = await LiveSanctuarySession.findOne({ id: sessionId });
    if (!session) {
      return res.error('Sanctuary session not found', 404);
    }

    // Check permissions
    const isHost = session.hostId === req.user.id;
    const isModerator = session.participants.find(p => p.id === req.user.id)?.isModerator;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isModerator && !isAdmin) {
      return res.error('Not authorized to view chat statistics', 403);
    }

    // Check cache first
    const cacheKey = `sanctuary_chat_stats:${sessionId}`;
    const cachedStats = cacheService.get(cacheKey);
    
    if (cachedStats) {
      return res.success(cachedStats, 'Chat statistics retrieved from cache');
    }

    // Calculate statistics
    const totalMessages = await SanctuaryMessage.countDocuments({ sessionId });
    const textMessages = await SanctuaryMessage.countDocuments({ sessionId, type: 'text' });
    const reactionMessages = await SanctuaryMessage.countDocuments({ sessionId, type: 'emoji-reaction' });
    
    const topSenders = await SanctuaryMessage.aggregate([
      { $match: { sessionId } },
      { $group: { _id: '$senderId', count: { $sum: 1 }, alias: { $first: '$senderAlias' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const messagesByHour = await SanctuaryMessage.aggregate([
      { $match: { sessionId } },
      { 
        $group: { 
          _id: { $hour: '$timestamp' }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { '_id': 1 } }
    ]);

    const stats = {
      totalMessages,
      textMessages,
      reactionMessages,
      topSenders,
      messagesByHour,
      averageMessagesPerParticipant: session.participants.length > 0 ? 
        Math.round(totalMessages / session.participants.length) : 0
    };

    // Cache for 5 minutes
    cacheService.set(cacheKey, stats, 300);

    res.success(stats, 'Chat statistics retrieved successfully');

  } catch (error) {
    console.error('❌ Error fetching chat stats:', error);
    res.error('Failed to fetch chat statistics: ' + error.message, 500);
  }
});

module.exports = router;