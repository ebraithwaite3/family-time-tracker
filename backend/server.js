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
// Redis subscriber for pub/sub (use environment variable!)
const redisSubscriber = new Redis(
  (process.env.REDIS_URL || 'redis://localhost:6379') + '?family=0'
);

// Subscribe to family updates
const FAMILY_ID = 'braithwaite_family_tracker';
redisSubscriber.subscribe(`${FAMILY_ID}_parents`);
redisSubscriber.subscribe(`${FAMILY_ID}_jack`);
redisSubscriber.subscribe(`${FAMILY_ID}_ellie`);

// Handle Redis pub/sub messages
redisSubscriber.on('message', (channel, message) => {
  console.log(`📻 Family update from ${channel}:`, message);
  
  try {
    const updateData = JSON.parse(message);
    
    // Broadcast to appropriate WebSocket clients
    if (channel.endsWith('_parents')) {
      io.to('parents').emit('family-update', updateData);
    } else if (channel.endsWith('_jack') || channel.endsWith('_ellie')) {
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

// Update family settings
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
server.listen(PORT, () => {
  console.log(`🚀 Family Time Tracker server running on http://localhost:${PORT}`);
  console.log(`👨‍👩‍👧‍👦 Family: ${FAMILY_ID}`);
  console.log(`📱 Ready for family connections`);
});