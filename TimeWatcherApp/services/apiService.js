import axios from "axios";

// IMPORTANT: Replace this with your actual Railway backend URL
// Example: 'https://family-time-tracker-production.up.railway.app'
const API_BASE_URL = "https://family-time-tracker-production.up.railway.app"; // Use your actual Railway URL here!

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const apiService = {
  // Checks the backend's /health endpoint
  checkBackendHealth: async () => {
    try {
      const response = await api.get("/health");
      return response.data; // Expected: { status: 'ok', ... }
    } catch (error) {
      console.error("Backend health check failed:", error.message);
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  },

  // Fetches family data from the backend
  // This will call your backend's /api/family/:familyId endpoint
  getFamilyData: async (familyId, userType, userId = null) => {
    try {
      const response = await api.get(`/api/family/${familyId}`, {
        params: { userType, userId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching family data from backend:", error.message);
      // Re-throw the error so the calling component can handle it
      throw new Error(`Failed to fetch family data: ${error.message}`);
    }
  },

  // Add a new session for a kid
  addSession: async (familyId, kidId, sessionData) => {
    try {
      const response = await api.post(
        `/api/family/${familyId}/kids/${kidId}/sessions`,
        sessionData
      );
      return response.data;
    } catch (error) {
      console.error("Error adding session via backend:", error.message);
      throw new Error(`Failed to add session: ${error.message}`);
    }
  },

  // Update an existing session
  updateSession: async (familyId, kidId, sessionId, updates) => {
    try {
      const response = await api.put(
        `/api/family/${familyId}/kids/${kidId}/sessions/${sessionId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error("Error updating session via backend:", error.message);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  },

  // Update family settings (OLD - for backwards compatibility)
  updateSetting: async (familyId, settingPath, newValue, updatedBy) => {
    try {
      const response = await api.put(`/api/family/${familyId}/settings`, {
        settingPath,
        newValue,
        updatedBy,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating setting via backend:", error.message);
      throw new Error(`Failed to update setting: ${error.message}`);
    }
  },

  // NEW: Update kid settings (complete settings object)
  updateKidSettings: async (familyId, kidId, settings) => {
    try {
      console.log(`🔄 API: Updating settings for kid ${kidId}:`, settings);
      const response = await api.put(
        `/api/family/${familyId}/kids/${kidId}/settings`,
        { settings }
      );
      console.log("✅ API: Settings updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ API: Error updating kid settings:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to update kid settings: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  },

  // NEW: Apply master settings to all kids
  applyMasterSettings: async (familyId, settings) => {
    try {
      console.log("🔄 API: Applying master settings to all kids:", settings);
      const response = await api.put(
        `/api/family/${familyId}/master-settings`,
        { settings }
      );
      console.log(
        "✅ API: Master settings applied successfully:",
        response.data
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ API: Error applying master settings:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to apply master settings: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  },

  // NEW: Get current settings for a specific kid (if needed separately)
  getKidSettings: async (familyId, kidId) => {
    try {
      const response = await api.get(
        `/api/family/${familyId}/kids/${kidId}/settings`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching kid settings:", error.message);
      throw new Error(`Failed to fetch kid settings: ${error.message}`);
    }
  },

  // NEW: Update complete family data (for bulk updates)
  updateFamilyData: async (familyId, familyData) => {
    try {
      console.log("🔄 API: Updating complete family data");
      const response = await api.put(`/api/family/${familyId}`, familyData);
      console.log("✅ API: Family data updated successfully");
      return response.data;
    } catch (error) {
      console.error(
        "❌ API: Error updating family data:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to update family data: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  },

  // Quick add endpoint
  quickAdd: async (familyId, kidId, sessionData) => {
    try {
      const response = await api.post(
        `/api/family/${familyId}/kids/${kidId}/quick-add`,
        sessionData
      );
      return response.data;
    } catch (error) {
      console.error("Error with quick add via backend:", error.message);
      throw new Error(`Failed to quick add: ${error.message}`);
    }
  },

  // NEW: Bonus time management
  awardBonusTime: async (familyId, kidId, bonusData) => {
    try {
      console.log(`🔄 API: Awarding bonus time for kid ${kidId}:`, bonusData);
      const response = await api.post(
        `/api/family/${familyId}/kids/${kidId}/bonus`,
        bonusData
      );
      console.log("✅ API: Bonus time awarded successfully");
      return response.data;
    } catch (error) {
      console.error(
        "❌ API: Error awarding bonus time:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to award bonus time: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  },

  // NEW: Get usage history for reporting
  getUsageHistory: async (familyId, kidId, startDate, endDate) => {
    try {
      const response = await api.get(
        `/api/family/${familyId}/kids/${kidId}/history`,
        {
          params: { startDate, endDate },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching usage history:", error.message);
      throw new Error(`Failed to fetch usage history: ${error.message}`);
    }
  },

  // NEW: Export family data
  exportFamilyData: async (familyId, format = "json") => {
    try {
      const response = await api.get(`/api/family/${familyId}/export`, {
        params: { format },
      });
      return response.data;
    } catch (error) {
      console.error("Error exporting family data:", error.message);
      throw new Error(`Failed to export family data: ${error.message}`);
    }
  },

  // Update all available apps
  updateAvailableApps: async (familyId, availableApps) => {
    try {
      console.log("🔄 API: Updating available apps:", availableApps);
      const response = await api.put(`/api/family/${familyId}/apps`, {
        availableApps,
      });
      console.log(
        "✅ API: Available apps updated successfully:",
        response.data
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ API: Error updating available apps:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to update apps: ${error.response?.data?.error || error.message}`
      );
    }
  },
};

export default apiService;
