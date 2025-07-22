import axios from 'axios';

// IMPORTANT: Replace this with your actual Railway backend URL
// Example: 'https://family-time-tracker-production.up.railway.app'
const API_BASE_URL = 'https://family-time-tracker-production.up.railway.app'; // Use your actual Railway URL here!

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiService = {
  // Checks the backend's /health endpoint
  checkBackendHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data; // Expected: { status: 'ok', ... }
    } catch (error) {
      console.error('Backend health check failed:', error.message);
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  },

  // Fetches family data from the backend
  // This will call your backend's /api/family/:familyId endpoint
  getFamilyData: async (familyId, userType, userId = null) => {
    try {
      const response = await api.get(`/api/family/${familyId}`, {
        params: { userType, userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching family data from backend:', error.message);
      // Re-throw the error so the calling component can handle it
      throw new Error(`Failed to fetch family data: ${error.message}`);
    }
  },

  // Add a new session for a kid
  addSession: async (familyId, kidId, sessionData) => {
    try {
      const response = await api.post(`/api/family/${familyId}/kids/${kidId}/sessions`, sessionData);
      return response.data;
    } catch (error) {
      console.error('Error adding session via backend:', error.message);
      throw new Error(`Failed to add session: ${error.message}`);
    }
  },

  // Update an existing session
  updateSession: async (familyId, kidId, sessionId, updates) => {
    try {
      const response = await api.put(`/api/family/${familyId}/kids/${kidId}/sessions/${sessionId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating session via backend:', error.message);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  },

  // Update family settings
  updateSetting: async (familyId, settingPath, newValue, updatedBy) => {
    try {
      const response = await api.put(`/api/family/${familyId}/settings`, { settingPath, newValue, updatedBy });
      return response.data;
    } catch (error) {
      console.error('Error updating setting via backend:', error.message);
      throw new Error(`Failed to update setting: ${error.message}`);
    }
  },

  // Quick add endpoint
  quickAdd: async (familyId, kidId, sessionData) => {
    try {
      const response = await api.post(`/api/family/${familyId}/kids/${kidId}/quick-add`, sessionData);
      return response.data;
    } catch (error) {
      console.error('Error with quick add via backend:', error.message);
      throw new Error(`Failed to quick add: ${error.message}`);
    }
  },
};

export default apiService;