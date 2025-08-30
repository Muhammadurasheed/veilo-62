const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const scheduledSanctuarySchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => `scheduled-${nanoid(8)}`,
    unique: true,
    required: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  emoji: {
    type: String
  },
  hostId: {
    type: String,
    required: true
  },
  hostAlias: {
    type: String,
    required: true
  },
  scheduledDateTime: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  maxParticipants: {
    type: Number,
    default: 50,
    min: 2,
    max: 200
  },
  invitationCode: {
    type: String,
    default: () => nanoid(12),
    unique: true
  },
  preJoinAcknowledgment: {
    type: String,
    default: 'This session is scheduled and will begin at the designated time. Do you want to join?'
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  liveSanctuarySessionId: {
    type: String, // Links to actual LiveSanctuarySession when goes live
    sparse: true
  },
  allowEarlyJoin: {
    type: Boolean,
    default: false
  },
  earlyJoinMinutes: {
    type: Number,
    default: 15 // Allow joining 15 minutes before start
  },
  reminderSettings: {
    enabled: { type: Boolean, default: true },
    intervals: [{
      type: Number,
      default: [24, 1] // 24 hours and 1 hour before
    }]
  },
  registeredParticipants: [{
    userId: String,
    alias: String,
    email: String,
    registeredAt: { type: Date, default: Date.now },
    reminderSent: { type: Boolean, default: false },
    attended: { type: Boolean, default: false }
  }],
  settings: {
    allowAnonymous: { type: Boolean, default: true },
    audioOnly: { type: Boolean, default: true },
    moderationEnabled: { type: Boolean, default: true },
    emergencyContactEnabled: { type: Boolean, default: true },
    recordingEnabled: { type: Boolean, default: false },
    voiceModulationEnabled: { type: Boolean, default: true },
    requireAcknowledgment: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
scheduledSanctuarySchema.index({ scheduledDateTime: 1, status: 1 });
scheduledSanctuarySchema.index({ hostId: 1, status: 1 });
scheduledSanctuarySchema.index({ invitationCode: 1 });
scheduledSanctuarySchema.index({ status: 1, scheduledDateTime: 1 });

// Pre-save middleware
scheduledSanctuarySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
scheduledSanctuarySchema.methods.canJoin = function() {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledDateTime);
  const earlyJoinTime = new Date(scheduledTime.getTime() - (this.earlyJoinMinutes * 60 * 1000));
  
  if (this.status === 'live') {
    return { canJoin: true, reason: 'Session is live' };
  }
  
  if (this.status === 'ended' || this.status === 'cancelled') {
    return { canJoin: false, reason: 'Session has ended or been cancelled' };
  }
  
  if (this.allowEarlyJoin && now >= earlyJoinTime) {
    return { canJoin: true, reason: 'Early join allowed', waitingRoom: true };
  }
  
  if (now >= scheduledTime) {
    return { canJoin: true, reason: 'Session time reached' };
  }
  
  return { 
    canJoin: false, 
    reason: 'Session not yet available',
    countdown: Math.ceil((scheduledTime.getTime() - now.getTime()) / 1000)
  };
};

scheduledSanctuarySchema.methods.addParticipant = function(userId, alias, email = null) {
  const existingParticipant = this.registeredParticipants.find(p => p.userId === userId);
  
  if (!existingParticipant) {
    this.registeredParticipants.push({
      userId,
      alias,
      email,
      registeredAt: new Date()
    });
  }
  
  return this.save();
};

scheduledSanctuarySchema.methods.removeParticipant = function(userId) {
  this.registeredParticipants = this.registeredParticipants.filter(p => p.userId !== userId);
  return this.save();
};

scheduledSanctuarySchema.methods.goLive = function(liveSanctuarySessionId) {
  this.status = 'live';
  this.liveSanctuarySessionId = liveSanctuarySessionId;
  return this.save();
};

module.exports = mongoose.model('ScheduledSanctuary', scheduledSanctuarySchema);