const Redis = require("ioredis");

class RedisService {
  constructor() {
    const redisUrl =
      (process.env.REDIS_URL || "redis://localhost:6379") + "?family=0";

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
    this.client.on("error", (err) => {
      console.error("Redis client error:", err);
    });

    this.publisher.on("error", (err) => {
      console.error("Redis publisher error:", err);
    });
  }

  // Get family data with permission filtering and proper camelCase structure
  async getFamilyData(familyId, userType, userId = null) {
    try {
      const rawData = await this.client.get(familyId);
      if (!rawData) return null;

      const familyData = JSON.parse(rawData);

      if (userType === "parent") {
        // Parents see everything - return structured data
        const kidsData = {};

        // Build kids data from the actual structure (familyData.kids)
        if (familyData.kids) {
          Object.keys(familyData.kids).forEach((kidId) => {
            const kid = familyData.kids[kidId];
            const kidSettings =
              familyData.settings?.kidsSettings?.[kidId] || {};

            kidsData[kidId] = {
              id: kid.id,
              name: kid.name,
              devices: kid.devices || [],
              sessions: kid.sessions || [],
              settings: kidSettings,
            };
          });
        }

        return {
          familyId: familyData.familyId,
          myData: {
            id: userId,
            name: familyData.parents?.[userId]?.name || userId,
            devices: familyData.parents?.[userId]?.devices || [],
          },
          kidsData, // This will now have Jack and Ellie with their sessions and settings
          settings: familyData.settings,
          lastUpdated: familyData.lastUpdated,
        };
      } else if (userType === "kid" && userId) {
        // Kids only see their own data with settings merged
        const kid = familyData.kids?.[userId];
        const kidSettings = familyData.settings?.kidsSettings?.[userId] || {};

        if (!kid) return null;

        return {
          familyId: familyData.familyId,
          myData: {
            id: kid.id,
            name: kid.name,
            devices: kid.devices || [],
            sessions: kid.sessions || [],
            settings: kidSettings,
          },
          settings: {
            availableApps: familyData.settings?.availableApps, // ✅ Move to settings level
          },
          globalSettings: {
            notificationsEnabled: familyData.settings?.notificationsEnabled,
            warningThresholds: familyData.settings?.warningThresholds,
            autoEndSessions: familyData.settings?.autoEndSessions,
          },
          lastUpdated: familyData.lastUpdated,
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting family data:", error);
      throw error;
    }
  }

  // Add/start a new session (unified for all session types)
  async addSession(familyId, kidId, sessionData) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);

      // Initialize sessions array if needed - USE .kids not .kidsData
      if (!familyData.kids[kidId].sessions) {
        familyData.kids[kidId].sessions = [];
      }

      // Build session object with only non-null/non-undefined values
      const newSession = {
        id:
          sessionData.id ||
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: sessionData.date || new Date().toISOString().split("T")[0],
        duration: sessionData.duration,
        countTowardsTotal: sessionData.countTowardsTotal,
        createdAt: new Date().toISOString(),
      };

      // Add optional fields only if they have values
      if (sessionData.timeStarted)
        newSession.timeStarted = sessionData.timeStarted;
      if (sessionData.timeEnded) newSession.timeEnded = sessionData.timeEnded;
      if (sessionData.reason) newSession.reason = sessionData.reason;
      if (sessionData.reasonMessage)
        newSession.reasonMessage = sessionData.reasonMessage;
      if (sessionData.device) newSession.device = sessionData.device;
      if (sessionData.app) newSession.app = sessionData.app;
      if (sessionData.bonus) newSession.bonus = true;
      if (sessionData.punishment) newSession.punishment = true;
      if (sessionData.active) newSession.active = sessionData.active; 
      if (sessionData.bonusTime) newSession.bonusTime = sessionData.bonusTime; // ADD THIS LINE
      if (sessionData.activityType)
        newSession.activityType = sessionData.activityType;
      if (sessionData.estimatedDuration) newSession.estimatedDuration = sessionData.estimatedDuration;

      familyData.kids[kidId].sessions.push(newSession); // USE .kids
      await this._saveFamilyData(familyId, familyData);

      // Determine notification type
      let notificationType = "sessionAdded";
      if (sessionData.bonus) notificationType = "bonusAdded";
      if (sessionData.punishment) notificationType = "punishmentAdded";

      // Notify parents
      await this._notifyParents(familyId, {
        type: notificationType,
        kidId,
        kidName: familyData.kids[kidId].name, // USE .kids
        session: newSession,
      });

      return newSession;
    } catch (error) {
      console.error("Error adding session:", error);
      throw error;
    }
  }

  // End/update an existing session
  async updateSession(familyId, kidId, sessionId, updates) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);
      const sessions = familyData.kids[kidId].sessions; // USE .kids
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

      if (sessionIndex === -1) {
        throw new Error("Session not found");
      }

      const oldSession = { ...sessions[sessionIndex] };

      // Update session with new data
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (updates.timeEnded) {
        // When ending a session, remove active and estimatedDuration
        delete sessions[sessionIndex].active;
        delete sessions[sessionIndex].estimatedDuration;
      }

      // Recalculate duration if start/end times provided
      const session = sessions[sessionIndex];
      if (session.timeStarted && session.timeEnded && !updates.duration) {
        const startTime = new Date(session.timeStarted);
        const endTime = new Date(session.timeEnded);
        sessions[sessionIndex].duration = Math.round(
          (endTime - startTime) / (1000 * 60)
        );
      }

      await this._saveFamilyData(familyId, familyData);

      // Determine notification type
      let notificationType = "sessionUpdated";
      if (updates.timeEnded && !oldSession.timeEnded) {
        notificationType = "sessionEnded";
      }

      // Notify parents
      await this._notifyParents(familyId, {
        type: notificationType,
        kidId,
        kidName: familyData.kids[kidId].name, // USE .kids
        oldSession,
        session: sessions[sessionIndex],
      });

      return sessions[sessionIndex];
    } catch (error) {
      console.error("Error updating session:", error);
      throw error;
    }
  }

  // Update family/kid settings (OLD - for backwards compatibility)
  async updateSetting(familyId, settingPath, newValue, updatedBy) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);

      // Support nested path updates like "settings.kidsSettings.Jack.dailyTotal"
      const pathParts = settingPath.split(".");
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
      if (settingPath.includes("kidsSettings")) {
        // Extract kid ID from path like "settings.kidsSettings.Jack.dailyTotal"
        const pathParts = settingPath.split(".");
        const kidIdIndex = pathParts.indexOf("kidsSettings") + 1;
        if (kidIdIndex < pathParts.length) {
          const kidId = pathParts[kidIdIndex];
          await this._notifyKid(familyId, kidId, {
            type: "settingUpdated",
            path: settingPath,
            oldValue,
            newValue,
            updatedBy,
          });
        }
      }

      // Always notify parents
      await this._notifyParents(familyId, {
        type: "settingUpdated",
        path: settingPath,
        oldValue,
        newValue,
        updatedBy,
      });

      return { success: true, path: settingPath, oldValue, newValue };
    } catch (error) {
      console.error("Error updating setting:", error);
      throw error;
    }
  }

  // Edit an existing session
  async editSession(familyId, kidId, sessionId, updates, updatedBy) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);
      const sessions = familyData.kids[kidId].sessions; // USE .kids
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

      if (sessionIndex === -1) {
        throw new Error("Session not found");
      }

      const oldSession = { ...sessions[sessionIndex] };

      // Update session
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy,
      };

      await this._saveFamilyData(familyId, familyData);

      // Notify relevant parties
      await this._notifyParents(familyId, {
        type: "sessionEdited",
        kidId,
        kidName: familyData.kids[kidId].name, // USE .kids
        oldSession,
        newSession: sessions[sessionIndex],
        updatedBy,
      });

      if (updatedBy !== kidId) {
        await this._notifyKid(familyId, kidId, {
          type: "sessionEdited",
          session: sessions[sessionIndex],
          updatedBy,
        });
      }

      return sessions[sessionIndex];
    } catch (error) {
      console.error("Error editing session:", error);
      throw error;
    }
  }

  // Delete a session
async deleteSession(familyId, kidId, sessionId) {
  try {
    console.log(`🔄 Redis: Deleting session ${sessionId} for kid ${kidId}`);
    
    const familyData = await this._getFamilyDataRaw(familyId);
    const sessions = familyData.kids[kidId].sessions;
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) {
      throw new Error("Session not found");
    }

    const deletedSession = { ...sessions[sessionIndex] };
    
    // Remove the session from the array
    sessions.splice(sessionIndex, 1);

    await this._saveFamilyData(familyId, familyData);

    console.log(`✅ Redis: Session deleted for kid ${kidId}`);

    // Notify parents
    await this._notifyParents(familyId, {
      type: "sessionDeleted",
      kidId,
      kidName: familyData.kids[kidId].name,
      deletedSession,
    });

    return { success: true, sessionId, deletedSession };
  } catch (error) {
    console.error("❌ Redis: Error deleting session:", error);
    throw error;
  }
}

  // Quick add: simplified interface for any session type
  async quickAdd(familyId, kidId, sessionData) {
    try {
      // Just use addSession - it handles everything now
      return await this.addSession(familyId, kidId, sessionData);
    } catch (error) {
      console.error("Error with quick add:", error);
      throw error;
    }
  }

  // NEW: Update kid settings
  async updateKidSettings(familyId, kidId, newSettings) {
    try {
      console.log(`🔄 Redis: Updating settings for kid ${kidId}`);

      const familyData = await this._getFamilyDataRaw(familyId);
      console.log("🔍 Redis: Family data keys:", Object.keys(familyData));
      console.log("🔍 Redis: Has kids?", !!familyData.kids);
      console.log("🔍 Redis: Has settings?", !!familyData.settings);
      console.log(
        "🔍 Redis: Has kidsSettings?",
        !!familyData.settings?.kidsSettings
      );

      // Check for kids data
      if (!familyData.kids?.[kidId]) {
        console.log("❌ Redis: Kid not found in kids");
        throw new Error(`Kid ${kidId} not found`);
      }

      // Ensure settings structure exists
      if (!familyData.settings) {
        console.log("🔧 Redis: Creating settings object");
        familyData.settings = {};
      }
      if (!familyData.settings.kidsSettings) {
        console.log("🔧 Redis: Creating kidsSettings object");
        familyData.settings.kidsSettings = {};
      }

      console.log(
        "🔍 Redis: Current kidsSettings keys:",
        Object.keys(familyData.settings.kidsSettings)
      );

      // Update settings in the kidsSettings section
      familyData.settings.kidsSettings[kidId] = newSettings;

      console.log(
        "🔍 Redis: Updated kidsSettings keys:",
        Object.keys(familyData.settings.kidsSettings)
      );

      await this._saveFamilyData(familyId, familyData);

      console.log(`✅ Redis: Settings updated for kid ${kidId}`);

      // Notify relevant parties
      await this._notifyParents(familyId, {
        type: "settingsUpdated",
        kidId,
        kidName: familyData.kids?.[kidId]?.name || kidId,
        settings: newSettings,
      });

      return { success: true, kidId, settings: newSettings };
    } catch (error) {
      console.error("❌ Redis: Error updating kid settings:", error);
      console.error("❌ Redis: Error stack:", error.stack);
      throw error;
    }
  }

  // NEW: Get kid settings
  async getKidSettings(familyId, kidId) {
    try {
      const familyData = await this._getFamilyDataRaw(familyId);

      if (!familyData.kids[kidId]) {
        // USE .kids
        throw new Error(`Kid ${kidId} not found`);
      }

      // Settings are stored in familyData.settings.kidsSettings[kidId]
      return familyData.settings?.kidsSettings?.[kidId] || {};
    } catch (error) {
      console.error("Error getting kid settings:", error);
      throw error;
    }
  }

  // NEW: Apply master settings to all kids
  async applyMasterSettings(familyId, masterSettings) {
    try {
      console.log("🔄 Redis: Applying master settings to all kids");

      const familyData = await this._getFamilyDataRaw(familyId);

      // Make sure we have kids data and settings structure
      if (!familyData.kids) {
        throw new Error("No kids found in family data");
      }

      // Ensure settings structure exists
      if (!familyData.settings) {
        familyData.settings = {};
      }
      if (!familyData.settings.kidsSettings) {
        familyData.settings.kidsSettings = {};
      }

      const updatedKids = [];

      // Apply settings to each kid in the settings.kidsSettings structure
      Object.keys(familyData.kids).forEach((kidId) => {
        familyData.settings.kidsSettings[kidId] = JSON.parse(
          JSON.stringify(masterSettings)
        );
        updatedKids.push({
          kidId,
          name: familyData.kids[kidId].name, // Use familyData.kids, not kidsData
        });
      });

      await this._saveFamilyData(familyId, familyData);

      console.log(
        `✅ Redis: Master settings applied to ${updatedKids.length} kids`
      );

      // Notify parents
      await this._notifyParents(familyId, {
        type: "masterSettingsApplied",
        settings: masterSettings,
        affectedKids: updatedKids,
      });

      // Notify each kid
      for (const kid of updatedKids) {
        await this._notifyKid(familyId, kid.kidId, {
          type: "mySettingsUpdated",
          settings: masterSettings,
          source: "master",
        });
      }

      return {
        success: true,
        affectedKids: updatedKids,
        settings: masterSettings,
      };
    } catch (error) {
      console.error("❌ Redis: Error applying master settings:", error);
      throw error;
    }
  }

  // NEW: Update global available apps
  async updateAvailableApps(familyId, availableApps) {
    try {
      console.log("🔄 Redis: Updating global available apps");

      const familyData = await this._getFamilyDataRaw(familyId);

      // Ensure settings structure exists
      if (!familyData.settings) {
        familyData.settings = {};
      }

      familyData.settings.availableApps = availableApps;

      await this._saveFamilyData(familyId, familyData);

      console.log("✅ Redis: Available apps updated");

      // Notify all family members
      await this._notifyParents(familyId, {
        type: "availableAppsUpdated",
        availableApps: availableApps,
      });

      return { success: true, availableApps };
    } catch (error) {
      console.error("❌ Redis: Error updating available apps:", error);
      throw error;
    }
  }

  // NEW: Update complete family data
  async updateFamilyData(familyId, newFamilyData) {
    try {
      console.log("🔄 Redis: Updating complete family data");

      // Add metadata
      newFamilyData.familyId = familyId;
      newFamilyData.lastUpdated = new Date().toISOString();

      await this.client.set(familyId, JSON.stringify(newFamilyData));

      console.log("✅ Redis: Complete family data updated");

      // Notify all family members
      await this._notifyParents(familyId, {
        type: "familyDataUpdated",
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        familyId,
        lastUpdated: newFamilyData.lastUpdated,
      };
    } catch (error) {
      console.error("❌ Redis: Error updating family data:", error);
      throw error;
    }
  }

  // NEW: Award bonus time
  async awardBonusTime(familyId, kidId, bonusData) {
    try {
      console.log(`🔄 Redis: Awarding bonus time for kid ${kidId}:`, bonusData);

      const result = await this.addSession(familyId, kidId, {
        ...bonusData,
        bonus: true,
        countTowardsTotal: false,
        duration: bonusData.timeAwarded || 0,
      });

      return { success: true, bonusAwarded: bonusData, session: result };
    } catch (error) {
      console.error("❌ Redis: Error awarding bonus time:", error);
      throw error;
    }
  }

  // NEW: Get usage history
  async getUsageHistory(familyId, kidId, startDate, endDate) {
    try {
      console.log(
        `🔄 Redis: Getting usage history for kid ${kidId} from ${startDate} to ${endDate}`
      );

      const familyData = await this._getFamilyDataRaw(familyId);

      if (!familyData.kids[kidId]) {
        // USE .kids
        throw new Error(`Kid ${kidId} not found`);
      }

      // Filter sessions by date range
      const sessions = familyData.kids[kidId].sessions || []; // USE .kids
      const filteredSessions = sessions.filter((session) => {
        if (!startDate && !endDate) return true;

        const sessionDate = session.date;
        if (startDate && sessionDate < startDate) return false;
        if (endDate && sessionDate > endDate) return false;

        return true;
      });

      return {
        kidId,
        kidName: familyData.kids[kidId].name, // USE .kids
        startDate,
        endDate,
        sessions: filteredSessions,
        totalSessions: filteredSessions.length,
        totalTime: filteredSessions.reduce(
          (sum, s) => sum + (s.duration || 0),
          0
        ),
      };
    } catch (error) {
      console.error("❌ Redis: Error getting usage history:", error);
      throw error;
    }
  }

  // NEW: Export family data
  async exportFamilyData(familyId, format = "json") {
    try {
      console.log(`🔄 Redis: Exporting family data in ${format} format`);

      const familyData = await this._getFamilyDataRaw(familyId);

      return {
        familyId,
        format,
        exportedAt: new Date().toISOString(),
        data: familyData,
      };
    } catch (error) {
      console.error("❌ Redis: Error exporting family data:", error);
      throw error;
    }
  }

  // Private helper methods
  async _getFamilyDataRaw(familyId) {
    const rawData = await this.client.get(familyId);
    if (!rawData) {
      throw new Error("Family not found");
    }
    return JSON.parse(rawData);
  }

  async _saveFamilyData(familyId, familyData) {
    familyData.lastUpdated = new Date().toISOString();
    await this.client.set(familyId, JSON.stringify(familyData));
  }

  async _notifyParents(familyId, message) {
    // Notify all parents
    await this.publisher.publish(
      `${familyId}_parents`,
      JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      })
    );
  }

  async _notifyKid(familyId, kidId, message) {
    await this.publisher.publish(
      `${familyId}_${kidId}`,
      JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Add missing _notifyParent method
  async _notifyParent(familyId, message) {
    await this.publisher.publish(
      `${familyId}_parents`,
      JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

module.exports = new RedisService();
