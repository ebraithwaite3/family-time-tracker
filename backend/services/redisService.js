const Redis = require('ioredis');

class RedisService {
  constructor() {
    const redisUrl = (process.env.REDIS_URL || 'redis://localhost:6379') + '?family=0';
    
    const redisConfig = {
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

  // Get family data with permission filtering and proper camelCase structure
  async getFamilyData(familyId, userType, userId = null) {
    try {
      const rawData = await this.client.get(familyId);
      if (!rawData) return null;

      const familyData = JSON.parse(rawData);

      if (userType === 'parent') {
        // Parents see everything - return structured data
        const kidsData = {};
        
        // Build kids data with their settings merged in
        Object.keys(familyData.kids).forEach(kidId => {
          const kid = familyData.kids[kidId];
          const kidSettings = familyData.settings.kidsSettings[kidId] || {};
          
          kidsData[kidId] = {
            id: kid.id,
            name: kid.name,
            devices: kid.devices,
            sessions: kid.sessions || [],
            settings: kidSettings
          };
        });

        return {
          familyId: familyData.familyId,
          myData: {
            id: userId,
            name: familyData.parents[userId]?.name,
            devices: familyData.parents[userId]?.devices || []
          },
          kidsData,
          settings: familyData.settings,
          lastUpdated: familyData.lastUpdated
        };
        
      } else if (userType === 'kid' && userId) {
        // Kids only see their own data with settings merged
        const kid = familyData.kids[userId];
        const kidSettings = familyData.settings.kidsSettings[userId] || {};
        
        if (!kid) return null;

        return {
          familyId: familyData.familyId,
          myData: {
            id: kid.id,
            name: kid.name,
            devices: kid.devices,
            sessions: kid.sessions || [],
            settings: kidSettings
          },
          globalSettings: {
            notificationsEnabled: familyData.settings.notificationsEnabled,
            warningThresholds: familyData.settings.warningThresholds,
            autoEndSessions: familyData.settings.autoEndSessions
          },
          lastUpdated: familyData.lastUpdated
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
        date: sessionData.date || new Date().toISOString().split('T')[0],
        duration: sessionData.duration,
        countTowardsTotal: sessionData.countTowardsTotal,
        createdAt: new Date().toISOString()
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
      let notificationType = 'sessionAdded';
      if (sessionData.bonus) notificationType = 'bonusAdded';
      if (sessionData.punishment) notificationType = 'punishmentAdded';

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
        updatedAt: new Date().toISOString()
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
      let notificationType = 'sessionUpdated';
      if (updates.timeEnded && !oldSession.timeEnded) {
        notificationType = 'sessionEnded';
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
      
      // Support nested path updates like "settings.kidsSettings.Jack.dailyTotal"
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

      // Determine who to notify based on setting path
      if (settingPath.includes('kidsSettings')) {
        // Extract kid ID from path like "settings.kidsSettings.Jack.dailyTotal"
        const pathParts = settingPath.split('.');
        const kidIdIndex = pathParts.indexOf('kidsSettings') + 1;
        if (kidIdIndex < pathParts.length) {
          const kidId = pathParts[kidIdIndex];
          await this._notifyKid(familyId, kidId, {
            type: 'settingUpdated',
            path: settingPath,
            oldValue,
            newValue,
            updatedBy
          });
        }
      }

      // Always notify parents
      await this._notifyParents(familyId, {
        type: 'settingUpdated',
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
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      };

      await this._saveFamilyData(familyId, familyData);

      // Notify relevant parties
      await this._notifyParents(familyId, {
        type: 'sessionEdited',
        kidId,
        kidName: familyData.kids[kidId].name,
        oldSession,
        newSession: sessions[sessionIndex],
        updatedBy
      });

      if (updatedBy !== kidId) {
        await this._notifyKid(familyId, kidId, {
          type: 'sessionEdited',
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
    familyData.lastUpdated = new Date().toISOString();
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