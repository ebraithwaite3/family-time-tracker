const Redis = require('ioredis');

class RedisService {
  constructor() {
    // Append '?family=0' directly to the URL string
    const redisUrl = (process.env.REDIS_URL || 'redis://localhost:6379') + '?family=0';
    
    const redisConfig = {
      // REMOVED 'family: 6' from here. The '?family=0' in the URL handles it.
      // REMOVE 'tls: {}' as well, as it might be forcing TLS negotiation
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    };

    // Regular Redis client for data operations
    this.client = new Redis(redisUrl, redisConfig);

    // Publisher client for pub/sub notifications  
    this.publisher = new Redis(redisUrl, redisConfig);

    // Add error handling
    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.publisher.on('error', (err) => {
      console.error('Redis publisher error:', err);
    });
  }

  // Get family data with permission filtering
  async getFamilyData(familyId, userType, userId = null) {
    try {
      const rawData = await this.client.get(familyId);
      if (!rawData) return null;

      const familyData = JSON.parse(rawData);

      if (userType === 'parent') {
        // Parents see everything
        return familyData;
      } else if (userType === 'kid' && userId) {
        // Kids only see their own data + general settings
        return {
          family_id: familyData.family_id,
          settings: familyData.settings,
          my_data: {
            id: userId,
            name: familyData.kids[userId]?.name,
            devices: familyData.kids[userId]?.devices,
            limits: familyData.kids[userId]?.limits,
            app_rules: familyData.kids[userId]?.app_rules,
            sessions: familyData.kids[userId]?.sessions || []
          },
          last_updated: familyData.last_updated
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting family data:', error);
      throw error;
    }
  }

  // Add/start a new session (unified for all session types)
  async addSession(familyId, kidId, sessionData) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);
      
      // Initialize sessions array if needed
      if (!familyData.kids[kidId].sessions) {
        familyData.kids[kidId].sessions = [];
      }

      // Build session object with only non-null/non-undefined values
      const newSession = {
        id: sessionData.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        duration: sessionData.duration,
        countTowardsTotal: sessionData.countTowardsTotal,
        created_at: new Date().toISOString()
      };

      // Add optional fields only if they have values
      if (sessionData.timeStarted) newSession.timeStarted = sessionData.timeStarted;
      if (sessionData.timeEnded) newSession.timeEnded = sessionData.timeEnded;
      if (sessionData.reason) newSession.reason = sessionData.reason;
      if (sessionData.reasonMessage) newSession.reasonMessage = sessionData.reasonMessage;
      if (sessionData.device) newSession.device = sessionData.device;
      if (sessionData.app) newSession.app = sessionData.app;
      if (sessionData.bonus) newSession.bonus = true;
      if (sessionData.punishment) newSession.punishment = true;

      familyData.kids[kidId].sessions.push(newSession);
      await this._saveFamilyData(familyId, familyData);

      // Determine notification type
      let notificationType = 'session_added';
      if (sessionData.bonus) notificationType = 'bonus_added';
      if (sessionData.punishment) notificationType = 'punishment_added';

      // Notify parents
      await this._notifyParents(familyId, {
        type: notificationType,
        kidId,
        kidName: familyData.kids[kidId].name,
        session: newSession
      });

      return newSession;
    } catch (error) {
      console.error('Error adding session:', error);
      throw error;
    }
  }

  // End/update an existing session
  async updateSession(familyId, kidId, sessionId, updates) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);
      const sessions = familyData.kids[kidId].sessions;
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);

      if (sessionIndex === -1) {
        throw new Error('Session not found');
      }

      const oldSession = { ...sessions[sessionIndex] };
      
      // Update session with new data
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Recalculate duration if start/end times provided
      const session = sessions[sessionIndex];
      if (session.timeStarted && session.timeEnded && !updates.duration) {
        const startTime = new Date(session.timeStarted);
        const endTime = new Date(session.timeEnded);
        sessions[sessionIndex].duration = Math.round((endTime - startTime) / (1000 * 60));
      }

      await this._saveFamilyData(familyId, familyData);

      // Determine notification type
      let notificationType = 'session_updated';
      if (updates.timeEnded && !oldSession.timeEnded) {
        notificationType = 'session_ended';
      }

      // Notify parents
      await this._notifyParents(familyId, {
        type: notificationType,
        kidId,
        kidName: familyData.kids[kidId].name,
        oldSession,
        session: sessions[sessionIndex]
      });

      return sessions[sessionIndex];
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  // Update family/kid settings
  async updateSetting(familyId, settingPath, newValue, updatedBy) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);
      
      // Support nested path updates like "kids.jack.limits.daily_total"
      const pathParts = settingPath.split('.');
      let target = familyData;
      
      // Navigate to parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        target = target[pathParts[i]];
      }
      
      // Update the final property
      const finalKey = pathParts[pathParts.length - 1];
      const oldValue = target[finalKey];
      target[finalKey] = newValue;

      await this._saveFamilyData(familyId, familyData);

      // Determine who to notify
      if (settingPath.startsWith('kids.')) {
        const kidId = pathParts[1];
        await this._notifyKid(familyId, kidId, {
          type: 'setting_updated',
          path: settingPath,
          oldValue,
          newValue,
          updatedBy
        });
      }

      // Always notify parent
      await this._notifyParent(familyId, {
        type: 'setting_updated',
        path: settingPath,
        oldValue,
        newValue,
        updatedBy
      });

      return { success: true, path: settingPath, oldValue, newValue };
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  // Edit an existing session
  async editSession(familyId, kidId, sessionId, updates, updatedBy) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);
      const sessions = familyData.kids[kidId].sessions;
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);

      if (sessionIndex === -1) {
        throw new Error('Session not found');
      }

      const oldSession = { ...sessions[sessionIndex] };
      
      // Update session
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy
      };

      await this._saveFamilyData(familyId, familyData);

      // Notify relevant parties
      await this._notifyParent(familyId, {
        type: 'session_edited',
        kidId,
        kidName: familyData.kids[kidId].name,
        oldSession,
        newSession: sessions[sessionIndex],
        updatedBy
      });

      if (updatedBy !== kidId) {
        await this._notifyKid(familyId, kidId, {
          type: 'session_edited',
          session: sessions[sessionIndex],
          updatedBy
        });
      }

      return sessions[sessionIndex];
    } catch (error) {
      console.error('Error editing session:', error);
      throw error;
    }
  }

  // Quick add: simplified interface for any session type
  async quickAdd(familyId, kidId, sessionData) {
    try {
      // Just use addSession - it handles everything now
      return await this.addSession(familyId, kidId, sessionData);
    } catch (error) {
      console.error('Error with quick add:', error);
      throw error;
    }
  }

  // Private helper methods
  async _getFamilyDataRaw(familyId) {
    const rawData = await this.client.get(familyId);
    if (!rawData) {
      throw new Error('Family not found');
    }
    return JSON.parse(rawData);
  }

  async _saveFamilyData(familyId, familyData) {
    familyData.last_updated = new Date().toISOString();
    await this.client.set(familyId, JSON.stringify(familyData));
  }

  async _notifyParents(familyId, message) {
    // Notify all parents
    await this.publisher.publish(`${familyId}_parents`, JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    }));
  }

  async _notifyKid(familyId, kidId, message) {
    await this.publisher.publish(`${familyId}_${kidId}`, JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    }));
  }
}

module.exports = new RedisService();
