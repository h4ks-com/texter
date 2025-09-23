import { Server } from 'node:http';
import cors from 'cors';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { Server as SocketIOServer } from 'socket.io';
import type { ISession } from './types';

const app = express();
app.use(cors());
app.use(express.json());
const server = new Server(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
  path: '/ws',
  transports: ['polling'],
});

interface User {
  id: string;
  username: string;
  socketId: string;
  sessionId?: string;
}

interface SessionData extends ISession {
  users: User[];
}

// In-memory storage for sessions
const sessions = new Map<string, SessionData>();
const users: User[] = [];

// Generate session ID
const generateSessionId = (): string => {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
};

// API Routes
app.get('/', (_req, res) => {
  res.send('Live Chat P2P Server is running');
});

// Create a new session
app.post('/api/sessions', (_req, res) => {
  const sessionId = generateSessionId();
  const session: SessionData = {
    id: sessionId,
    participants: [],
    createdAt: new Date().toISOString(),
    users: [],
  };
  sessions.set(sessionId, session);
  res.json({ sessionId });
});

// Get session info
app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({
    id: session.id,
    participants: session.participants,
    createdAt: session.createdAt,
  });
});

io.on('connection', (socket) => {
  let currentUser: User | null = null;
  console.log('🔌 New Socket.IO connection:', socket.id);

  socket.on('join-session', (data) => {
    console.log('📥 Received join-session:', data);
    const session = sessions.get(data.sessionId);
    if (!session) {
      console.log('❌ Session not found:', data.sessionId);
      socket.emit('session-not-found');
      return;
    }

    // Check if username is taken in this session
    const usernameTaken = session.users.some((user) => user.username === data.username);
    if (usernameTaken) {
      console.log('❌ Username taken:', data.username);
      socket.emit('username-taken');
      return;
    }

    // Create user and add to session
    currentUser = {
      id: Math.random().toString(36).substr(2, 9),
      username: data.username,
      socketId: socket.id,
      sessionId: data.sessionId,
    };

    session.users.push(currentUser);
    session.participants.push(data.username);
    users.push(currentUser);

    console.log(
      `✅ User ${data.username} joined session ${data.sessionId} with peer ID ${currentUser.id}`,
    );
    console.log(
      `👥 Session now has ${session.users.length} users:`,
      session.users.map((u) => u.username),
    );

    // Send existing peer IDs to the new user FIRST
    const existingPeerIds = session.users
      .filter((user) => user.id !== currentUser?.id)
      .map((user) => ({ id: user.id, username: user.username }));

    console.log(`📤 Sending existing peers to ${data.username}:`, existingPeerIds);
    socket.emit('existing-peers', { peerIds: existingPeerIds });

    // Notify user of successful join
    socket.emit('session-joined', {
      sessionId: data.sessionId,
      userId: currentUser.id,
      participants: session.participants,
    });

    // Notify other users in session that someone joined (with their peer ID)
    console.log(`📢 Broadcasting user-joined to ${session.users.length - 1} other users`);
    broadcastToSession(
      data.sessionId,
      {
        type: 'user-joined',
        username: data.username,
        userId: currentUser.id,
        peerId: currentUser.id, // Use userId as peerId for PeerJS
      },
      currentUser,
    );
  });

  socket.on('get-peer-ids', () => {
    if (currentUser?.sessionId) {
      const sessionData = sessions.get(currentUser.sessionId);
      if (sessionData) {
        const peerIds = sessionData.users
          .filter((user) => user.id !== currentUser?.id)
          .map((user) => ({ id: user.id, username: user.username }));

        socket.emit('peer-ids', { peerIds });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket.IO disconnection:', socket.id);
    if (currentUser) {
      console.log(`👋 User ${currentUser.username} leaving session ${currentUser.sessionId}`);

      // Remove user from session and global users list
      if (currentUser.sessionId) {
        const session = sessions.get(currentUser.sessionId);
        if (session) {
          session.users = session.users.filter((user) => user.id !== currentUser?.id);
          session.participants = session.participants.filter((p) => p !== currentUser?.username);

          console.log(`📢 Broadcasting user-left to ${session.users.length} remaining users`);
          // Notify other users in session
          broadcastToSession(
            currentUser.sessionId,
            {
              type: 'user-left',
              username: currentUser.username,
              userId: currentUser.id,
            },
            null,
          );
        }
      }

      const userIndex = users.findIndex((user) => user.id === currentUser?.id);
      if (userIndex !== -1) {
        users.splice(userIndex, 1);
      }
    }
  });
});

// Helper function to broadcast messages to all users in a session except the sender
const broadcastToSession = (sessionId: string, data: object, sender: User | null) => {
  const session = sessions.get(sessionId);
  if (!session) {
    console.log('❌ Session not found for broadcast:', sessionId);
    return;
  }

  const recipients = session.users.filter((user) => user !== sender);
  console.log(`📤 Broadcasting to ${recipients.length} users in session ${sessionId}:`, data);

  recipients.forEach((user) => {
    console.log(`📤 Sending to ${user.username} (${user.socketId})`);
    io.to(user.socketId).emit('message', data);
  });
};

const peerServer = ExpressPeerServer(server, {
  path: '/',
});

app.use('/peerjs', peerServer);

const PORT = 9000;
server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌐 HTTP API: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: http://localhost:${PORT}/ws`);
  console.log(`🤝 PeerJS: http://localhost:${PORT}/peerjs`);
  console.log(`📡 Socket.IO Server ready for connections`);
});
