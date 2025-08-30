const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

/**
 * Redis-style Session State Manager for Live Audio Sanctuaries
 * Provides horizontal scalability for managing real-time session state
 */
class SanctuarySessionStateManager {
  constructor() {
    this.sessionPrefix = 'sanctuary_session:';
    this.participantPrefix = 'sanctuary_participants:';
    this.chatPrefix = 'sanctuary_chat:';
    this.voicePrefix = 'sanctuary_voice:';
    this.emergencyPrefix = 'sanctuary_emergency:';
  }

  // Session State Management
  async setSessionState(sessionId, state, ttl = 3600) {
    const key = `${this.sessionPrefix}${sessionId}`;
    return cacheService.set(key, {
      ...state,
      lastUpdated: new Date().toISOString(),
      version: (state.version || 0) + 1
    }, ttl);
  }

  async getSessionState(sessionId) {
    const key = `${this.sessionPrefix}${sessionId}`;
    return cacheService.get(key);
  }

  async updateSessionMetrics(sessionId, metrics) {
    const state = await this.getSessionState(sessionId);
    if (!state) return false;

    const updatedState = {
      ...state,
      metrics: {
        ...state.metrics,
        ...metrics,
        lastMetricUpdate: new Date().toISOString()
      }
    };

    return this.setSessionState(sessionId, updatedState);
  }

  // Participant Management
  async addParticipant(sessionId, participant) {
    const participantsKey = `${this.participantPrefix}${sessionId}`;
    const participants = cacheService.get(participantsKey) || [];
    
    // Remove existing participant if rejoining
    const filteredParticipants = participants.filter(p => p.id !== participant.id);
    
    const updatedParticipants = [...filteredParticipants, {
      ...participant,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: 'connected'
    }];

    cacheService.set(participantsKey, updatedParticipants, 7200); // 2 hours
    
    // Update session participant count
    await this.updateSessionMetrics(sessionId, {
      participantCount: updatedParticipants.length,
      activeParticipants: updatedParticipants.filter(p => p.status === 'connected').length
    });

    return updatedParticipants;
  }

  async removeParticipant(sessionId, participantId) {
    const participantsKey = `${this.participantPrefix}${sessionId}`;
    const participants = cacheService.get(participantsKey) || [];
    
    const updatedParticipants = participants.filter(p => p.id !== participantId);
    cacheService.set(participantsKey, updatedParticipants, 7200);
    
    // Update session metrics
    await this.updateSessionMetrics(sessionId, {
      participantCount: updatedParticipants.length,
      activeParticipants: updatedParticipants.filter(p => p.status === 'connected').length
    });

    return updatedParticipants;
  }

  async updateParticipantStatus(sessionId, participantId, status, metadata = {}) {
    const participantsKey = `${this.participantPrefix}${sessionId}`;
    const participants = cacheService.get(participantsKey) || [];
    
    const updatedParticipants = participants.map(p => 
      p.id === participantId 
        ? { 
            ...p, 
            status, 
            ...metadata,
            lastSeen: new Date().toISOString() 
          }
        : p
    );

    cacheService.set(participantsKey, updatedParticipants, 7200);
    return updatedParticipants;
  }

  async getParticipants(sessionId) {
    const participantsKey = `${this.participantPrefix}${sessionId}`;
    return cacheService.get(participantsKey) || [];
  }

  // Voice Modulation State
  async setVoiceModulation(sessionId, participantId, voiceConfig) {
    const voiceKey = `${this.voicePrefix}${sessionId}:${participantId}`;
    return cacheService.set(voiceKey, {
      ...voiceConfig,
      updatedAt: new Date().toISOString()
    }, 3600);
  }

  async getVoiceModulation(sessionId, participantId) {
    const voiceKey = `${this.voicePrefix}${sessionId}:${participantId}`;
    return cacheService.get(voiceKey);
  }

  async removeVoiceModulation(sessionId, participantId) {
    const voiceKey = `${this.voicePrefix}${sessionId}:${participantId}`;
    return cacheService.delete(voiceKey);
  }

  // Emergency Alert Management
  async setEmergencyAlert(sessionId, alert) {
    const emergencyKey = `${this.emergencyPrefix}${sessionId}`;
    const alerts = cacheService.get(emergencyKey) || [];
    
    const newAlert = {
      id: `alert_${Date.now()}`,
      ...alert,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    
    alerts.push(newAlert);
    
    // Keep only last 50 alerts
    if (alerts.length > 50) {
      alerts.splice(0, alerts.length - 50);
    }
    
    cacheService.set(emergencyKey, alerts, 86400); // 24 hours
    return newAlert;
  }

  async getEmergencyAlerts(sessionId) {
    const emergencyKey = `${this.emergencyPrefix}${sessionId}`;
    return cacheService.get(emergencyKey) || [];
  }

  async resolveEmergencyAlert(sessionId, alertId) {
    const emergencyKey = `${this.emergencyPrefix}${sessionId}`;
    const alerts = cacheService.get(emergencyKey) || [];
    
    const updatedAlerts = alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved', resolvedAt: new Date().toISOString() }
        : alert
    );
    
    cacheService.set(emergencyKey, updatedAlerts, 86400);
    return updatedAlerts;
  }

  // Session Analytics
  async trackEvent(sessionId, event) {
    const analyticsKey = `sanctuary_analytics:${sessionId}`;
    const events = cacheService.get(analyticsKey) || [];
    
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    cacheService.set(analyticsKey, events, 86400);
    return events;
  }

  async getSessionAnalytics(sessionId) {
    const analyticsKey = `sanctuary_analytics:${sessionId}`;
    return cacheService.get(analyticsKey) || [];
  }

  // Bulk Operations for Performance
  async getSessionOverview(sessionId) {
    const [state, participants, alerts, analytics] = await Promise.all([
      this.getSessionState(sessionId),
      this.getParticipants(sessionId),
      this.getEmergencyAlerts(sessionId),
      this.getSessionAnalytics(sessionId)
    ]);

    return {
      state,
      participants,
      alerts: alerts.filter(a => a.status === 'active'),
      analytics: analytics.slice(-10), // Last 10 events
      summary: {
        totalParticipants: participants.length,
        activeParticipants: participants.filter(p => p.status === 'connected').length,
        activeAlerts: alerts.filter(a => a.status === 'active').length,
        sessionVersion: state?.version || 0,
        lastActivity: state?.lastUpdated || new Date().toISOString()
      }
    };
  }

  // Cleanup Operations
  async cleanupSession(sessionId) {
    const keys = [
      `${this.sessionPrefix}${sessionId}`,
      `${this.participantPrefix}${sessionId}`,
      `${this.emergencyPrefix}${sessionId}`,
      `sanctuary_analytics:${sessionId}`
    ];

    keys.forEach(key => cacheService.delete(key));
    
    // Clean up voice modulation keys
    const voiceKeys = cacheService.keys(`${this.voicePrefix}${sessionId}:.*`);
    voiceKeys.forEach(key => cacheService.delete(key));
    
    return true;
  }

  // Health Monitoring
  getSystemStats() {
    const stats = cacheService.getStats();
    const sessionKeys = cacheService.keys(`${this.sessionPrefix}.*`);
    const participantKeys = cacheService.keys(`${this.participantPrefix}.*`);
    const voiceKeys = cacheService.keys(`${this.voicePrefix}.*`);
    
    return {
      ...stats,
      activeSessions: sessionKeys.length,
      totalParticipantGroups: participantKeys.length,
      activeVoiceModulations: voiceKeys.length,
      averageParticipantsPerSession: participantKeys.length > 0 ? 
        Math.round(participantKeys.length / sessionKeys.length) : 0
    };
  }
}

// Create global instance
const stateManager = new SanctuarySessionStateManager();

// API Endpoints for State Management
router.get('/sessions/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const overview = await stateManager.getSessionOverview(sessionId);
    
    res.success(overview, 'Session state retrieved successfully');
  } catch (error) {
    console.error('Error getting session state:', error);
    res.error('Failed to get session state: ' + error.message, 500);
  }
});

router.post('/sessions/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { state } = req.body;
    
    await stateManager.setSessionState(sessionId, state);
    res.success({}, 'Session state updated successfully');
  } catch (error) {
    console.error('Error updating session state:', error);
    res.error('Failed to update session state: ' + error.message, 500);
  }
});

router.get('/sessions/:sessionId/participants', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participants = await stateManager.getParticipants(sessionId);
    
    res.success({ participants }, 'Participants retrieved successfully');
  } catch (error) {
    console.error('Error getting participants:', error);
    res.error('Failed to get participants: ' + error.message, 500);
  }
});

router.post('/sessions/:sessionId/events', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { event } = req.body;
    
    await stateManager.trackEvent(sessionId, event);
    res.success({}, 'Event tracked successfully');
  } catch (error) {
    console.error('Error tracking event:', error);
    res.error('Failed to track event: ' + error.message, 500);
  }
});

router.get('/system/stats', async (req, res) => {
  try {
    const stats = stateManager.getSystemStats();
    res.success(stats, 'System statistics retrieved successfully');
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.error('Failed to get system stats: ' + error.message, 500);
  }
});

// Export both router and state manager
module.exports = {
  router,
  stateManager
};
