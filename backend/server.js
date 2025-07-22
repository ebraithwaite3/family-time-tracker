const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const redisService = require('./services/redisService');

const app = express();
const server = createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis subscriber for pub/sub (use environment variable!)
const redisSubscriber = new Redis(
  (process.env.REDIS_URL || 'redis://localhost:6379') + '?family=0'
);

// Subscribe to family updates
const FAMILY_ID = 'braithwaite_family_tracker';
redisSubscriber.subscribe(`${FAMILY_ID}_parents`);
redisSubscriber.subscribe(`${FAMILY_ID}_Jack`);  // Updated to match camelCase
redisSubscriber.subscribe(`${FAMILY_ID}_Ellie`); // Updated to match camelCase

// Handle Redis pub/sub messages
redisSubscriber.on('message', (channel, message) => {
  console.log(`📻 Family update from ${channel}:`, message);
  
  try {
    const updateData = JSON.parse(message);
    
    // Broadcast to appropriate WebSocket clients
    if (channel.endsWith('_parents')) {
      io.to('parents').emit('family-update', updateData);
    } else if (channel.endsWith('_Jack') || channel.endsWith('_Ellie')) { // Updated cases
      const kidId = channel.split('_').pop();
      io.to(`kid_${kidId}`).emit('family-update', updateData);
    }
    
    console.log(`📡 Broadcasted family update`);
  } catch (error) {
    console.error('Error parsing family update:', error);
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  socket.emit('connected', {
    message: 'Connected to Family Time Tracker',
    timestamp: new Date().toISOString()
  });

  // Join appropriate room based on user type
  socket.on('join-family', (data) => {
    const { userType, familyId, userId } = data;
    
    if (userType === 'parent') {
      socket.join('parents');
      console.log(`👨‍👩‍👧‍👦 Parent ${userId} joined family ${familyId}`);
    } else if (userType === 'kid') {
      socket.join(`kid_${userId}`);
      console.log(`🧒 Kid ${userId} joined family ${familyId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedClients: io.sockets.sockets.size
  });
});

// Root endpoint for Railway health checks
app.get('/', (req, res) => {
  res.json({ 
    status: 'Family Time Tracker API is running!',
    timestamp: new Date().toISOString() 
  });
});

// Get family data
app.get('/api/family/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { userType, userId } = req.query;
    
    const familyData = await redisService.getFamilyData(familyId, userType, userId);
    
    if (!familyData) {
      return res.status(404).json({ error: 'Family not found' });
    }
    
    res.json(familyData);
  } catch (error) {
    console.error('Error fetching family data:', error);
    res.status(500).json({ error: 'Failed to fetch family data' });
  }
});

// Update complete family data (for bulk updates)
app.put('/api/family/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const familyData = req.body;
    
    console.log(`🔄 Updating complete family data for ${familyId}`);
    
    const result = await redisService.updateFamilyData(familyId, familyData);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating family data:', error);
    res.status(500).json({ error: 'Failed to update family data' });
  }
});

// Add a new session for a kid
app.post('/api/family/:familyId/kids/:kidId/sessions', async (req, res) => {
  try {
    const { familyId, kidId } = req.params;
    const sessionData = req.body;
    
    const newSession = await redisService.addSession(familyId, kidId, sessionData);
    
    res.json({ success: true, session: newSession });
  } catch (error) {
    console.error('Error adding session:', error);
    res.status(500).json({ error: 'Failed to add session' });
  }
});

// Update an existing session
app.put('/api/family/:familyId/kids/:kidId/sessions/:sessionId', async (req, res) => {
  try {
    const { familyId, kidId, sessionId } = req.params;
    const updates = req.body;
    
    const updatedSession = await redisService.updateSession(familyId, kidId, sessionId, updates);
    
    res.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// NEW: Update kid settings
app.put('/api/family/:familyId/kids/:kidId/settings', async (req, res) => {
  try {
    const { familyId, kidId } = req.params;
    const { settings } = req.body;
    
    console.log(`🔄 Updating settings for kid ${kidId}`);
    
    const result = await redisService.updateKidSettings(familyId, kidId, settings);
    
    console.log('✅ Settings updated successfully:', result);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error updating kid settings:', error);
    res.status(500).json({ error: 'Failed to update kid settings' });
  }
});

// NEW: Get kid settings
app.get('/api/family/:familyId/kids/:kidId/settings', async (req, res) => {
  try {
    const { familyId, kidId } = req.params;
    
    const settings = await redisService.getKidSettings(familyId, kidId);
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching kid settings:', error);
    res.status(500).json({ error: 'Failed to fetch kid settings' });
  }
});

// NEW: Apply master settings to all kids
app.put('/api/family/:familyId/master-settings', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { settings } = req.body;
    
    console.log('🔄 Applying master settings to all kids');
    
    const result = await redisService.applyMasterSettings(familyId, settings);
    
    console.log('✅ Master settings applied successfully:', result);
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error applying master settings:', error);
    res.status(500).json({ error: 'Failed to apply master settings' });
  }
});

// NEW: Award bonus time
app.post('/api/family/:familyId/kids/:kidId/bonus', async (req, res) => {
  try {
    const { familyId, kidId } = req.params;
    const bonusData = req.body;
    
    console.log(`🔄 Awarding bonus time for kid ${kidId}:`, bonusData);
    
    const result = await redisService.awardBonusTime(familyId, kidId, bonusData);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error awarding bonus time:', error);
    res.status(500).json({ error: 'Failed to award bonus time' });
  }
});

// NEW: Get usage history
app.get('/api/family/:familyId/kids/:kidId/history', async (req, res) => {
  try {
    const { familyId, kidId } = req.params;
    const { startDate, endDate } = req.query;
    
    const history = await redisService.getUsageHistory(familyId, kidId, startDate, endDate);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
});

// NEW: Export family data
app.get('/api/family/:familyId/export', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { format } = req.query;
    
    const exportData = await redisService.exportFamilyData(familyId, format);
    
    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Error exporting family data:', error);
    res.status(500).json({ error: 'Failed to export family data' });
  }
});

// Update family settings (OLD - for backwards compatibility)
app.put('/api/family/:familyId/settings', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { settingPath, newValue, updatedBy } = req.body;
    
    const result = await redisService.updateSetting(familyId, settingPath, newValue, updatedBy);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Quick add endpoint
app.post('/api/family/:familyId/kids/:kidId/quick-add', async (req, res) => {
  try {
    const { familyId, kidId } = req.params;
    const sessionData = req.body;
    
    const result = await redisService.quickAdd(familyId, kidId, sessionData);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error with quick add:', error);
    res.status(500).json({ error: 'Failed to quick add' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Family Time Tracker server running on http://0.0.0.0:${PORT}`);
  console.log(`👨‍👩‍👧‍👦 Family: ${FAMILY_ID}`);
  console.log(`📱 Ready for family connections`);
});