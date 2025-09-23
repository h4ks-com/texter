import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, createTheme, CssBaseline, Paper } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import Peer, { DataConnection } from 'peerjs';
import { io, Socket } from 'socket.io-client';
import { IBubble, P2PEvent } from '../../shared/types';
import UsernameInput from './components/usernameInput';
import SessionManager from './components/SessionManager';
import LiveBubble from './components/LiveBubble';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e91e63',
    },
    background: {
      default: '#121212',
      paper: '#1d1d1d',
    },
  },
});

const App: React.FC = () => {
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('username') || '';
  });
  const [sessionId, setSessionId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [bubbles, setBubbles] = useState<IBubble[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPeerIds, setPendingPeerIds] = useState<any[]>([]);

  // Save username to localStorage
  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
    }
  }, [username]);

  // Initialize PeerJS when userId is available
  useEffect(() => {
    if (!userId) return;

    console.log('Initializing PeerJS with userId:', userId);
    const newPeer = new Peer(userId, {
      host: 'localhost',
      port: 9000,
      path: '/peerjs'
    });

    newPeer.on('open', (id) => {
      console.log('✅ PeerJS connected with ID:', id);
      setPeer(newPeer);
      initializeChat();

      // Connect to any pending peers
      if (pendingPeerIds.length > 0) {
        console.log(`🔗 Connecting to ${pendingPeerIds.length} pending peers`);
        pendingPeerIds.forEach((peerInfo: any) => {
          console.log(`🔗 Connecting to pending peer: ${peerInfo.username} (${peerInfo.id})`);
          const conn = newPeer.connect(peerInfo.id);
          if (conn) {
            setupConnection(conn);
          }
        });
        setPendingPeerIds([]);
      }
    });

    newPeer.on('connection', (conn) => {
      console.log('📞 Incoming peer connection from:', conn.peer);
      setupConnection(conn);
    });

    newPeer.on('error', (error) => {
      console.error('❌ PeerJS error:', error);
    });

    return () => {
      newPeer.destroy();
    };
  }, [userId]);

  // Initialize Socket.IO
  useEffect(() => {
    if (!username || !sessionId) return;

    console.log('Connecting to Socket.IO at localhost:9000/ws');
    const socketConnection = io('http://localhost:9000', {
      path: '/ws',
      transports: ['polling']
    });

    socketConnection.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
      setSocket(socketConnection);

      // Join session
      socketConnection.emit('join-session', {
        sessionId,
        username
      });
    });

    socketConnection.on('session-joined', (data) => {
      console.log('Session joined:', data);
      setUserId(data.userId);
    });

    socketConnection.on('username-taken', () => {
      alert('Username is already taken in this session');
      setSessionId('');
    });

    socketConnection.on('session-not-found', () => {
      alert('Session not found');
      setSessionId('');
    });

    socketConnection.on('existing-peers', (data) => {
      console.log('📥 Received existing peers:', data.peerIds);
      // Connect to all existing peers only if we have PeerJS ready
      if (peer) {
        data.peerIds.forEach((peerInfo: any) => {
          console.log(`🔗 Will connect to existing peer: ${peerInfo.username} (${peerInfo.id})`);
          connectToPeerById(peerInfo.id);
        });
      } else {
        console.log('⏳ PeerJS not ready yet, will connect when ready');
        // Store the peer IDs to connect to later
        setPendingPeerIds(data.peerIds);
      }
    });

    socketConnection.on('message', (data) => {
      console.log('📥 Socket.IO message received:', data);
      if (data.type === 'user-joined') {
        console.log(`👤 New user joined: ${data.username} with peer ID: ${data.peerId}`);
        // Connect to the new peer if we have PeerJS ready
        if (peer) {
          connectToPeerById(data.peerId);
        } else {
          console.log('⏳ PeerJS not ready, adding to pending peers');
          setPendingPeerIds(prev => [...prev, { id: data.peerId, username: data.username }]);
        }
      } else if (data.type === 'user-left') {
        console.log(`👋 User left: ${data.username}`);
        // Remove the peer connection
        setConnections(prev => prev.filter(conn => conn.peer !== data.userId));
      }
    });

    socketConnection.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
      setSocket(null);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [username, sessionId]);

  const connectToPeerById = (peerId: string) => {
    if (!peer) {
      console.warn('⚠️ Cannot connect to peer - PeerJS not initialized');
      return;
    }

    if (peerId === userId) {
      console.log('🚫 Skipping connection to self');
      return;
    }

    // Check if already connected
    if (connections.some(conn => conn.peer === peerId)) {
      console.log(`🔗 Already connected to peer ${peerId}`);
      return;
    }

    console.log(`🔗 Attempting to connect to peer: ${peerId}`);
    try {
      const conn = peer.connect(peerId);
      if (conn) {
        setupConnection(conn);
      } else {
        console.error(`❌ Failed to create connection to peer ${peerId}`);
      }
    } catch (error) {
      console.error(`❌ Error connecting to peer ${peerId}:`, error);
    }
  };

  const setupConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      console.log('✅ P2P connection established with:', conn.peer);
      setConnections(prev => [...prev.filter(c => c.peer !== conn.peer), conn]);

      // Send current bubble state to the newly connected peer
      if (bubbles.length > 0) {
        console.log(`📤 Sending bubble sync to new peer ${conn.peer}:`, bubbles);
        const syncEvent: P2PEvent = {
          type: 'bubble-sync',
          bubbles: bubbles
        };
        conn.send(syncEvent);
      } else {
        console.log(`📤 No bubbles to sync to new peer ${conn.peer}`);
      }
    });

    conn.on('data', (data) => {
      console.log('📨 P2P message received:', data);
      handleP2PMessage(data as P2PEvent);
    });

    conn.on('error', (error) => {
      console.error('❌ P2P connection error:', error);
    });

    conn.on('close', () => {
      console.log('🔌 P2P connection closed with:', conn.peer);
      setConnections(prev => prev.filter(c => c.peer !== conn.peer));
    });
  };


  const initializeChat = () => {
    console.log('🎮 Initializing chat with bubbles');
    // Initialize with one empty bubble
    const initialBubble: IBubble = {
      id: generateBubbleId(),
      ownerId: '',
      ownerName: '',
      text: '',
      isFinalized: false,
      claimedAt: ''
    };
    setBubbles([initialBubble]);
    console.log('🎮 Chat initialized with empty bubble:', initialBubble.id);
  };

  const generateBubbleId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleP2PMessage = (event: P2PEvent) => {
    console.log('📨 P2P message received:', event);

    switch (event.type) {
      case 'bubble-claim':
        console.log(`👤 ${event.ownerName} claimed bubble ${event.bubbleId}`);
        setBubbles(prev => {
          console.log('Current bubbles before claim:', prev.map(b => ({ id: b.id, ownerId: b.ownerId, ownerName: b.ownerName })));

          // Check if bubble exists
          const bubbleExists = prev.some(bubble => bubble.id === event.bubbleId);

          if (!bubbleExists) {
            console.log(`➕ Creating new bubble ${event.bubbleId} from claim event`);
            // Create the new bubble from the claim event
            const newBubble: IBubble = {
              id: event.bubbleId,
              ownerId: event.ownerId,
              ownerName: event.ownerName,
              text: '',
              isFinalized: false,
              claimedAt: event.claimedAt
            };

            const updated = [...prev, newBubble];

            // Add new empty bubble if needed
            const hasEmptyBubble = updated.some(bubble => !bubble.ownerId);
            if (!hasEmptyBubble) {
              updated.push({
                id: generateBubbleId(),
                ownerId: '',
                ownerName: '',
                text: '',
                isFinalized: false,
                claimedAt: ''
              });
              console.log('Added new empty bubble');
            }

            console.log('Final bubbles after creating new bubble:', updated.map(b => ({ id: b.id, ownerId: b.ownerId, ownerName: b.ownerName })));
            return updated;
          }

          // Update existing bubble
          const updated = prev.map(bubble =>
            bubble.id === event.bubbleId
              ? {
                  ...bubble,
                  ownerId: event.ownerId,
                  ownerName: event.ownerName,
                  claimedAt: event.claimedAt
                }
              : bubble
          );

          console.log('Bubbles after claim update:', updated.map(b => ({ id: b.id, ownerId: b.ownerId, ownerName: b.ownerName })));

          // Add new empty bubble if needed
          const hasEmptyBubble = updated.some(bubble => !bubble.ownerId);
          if (!hasEmptyBubble) {
            updated.push({
              id: generateBubbleId(),
              ownerId: '',
              ownerName: '',
              text: '',
              isFinalized: false,
              claimedAt: ''
            });
            console.log('Added new empty bubble');
          }

          console.log('Final bubbles after claim:', updated.map(b => ({ id: b.id, ownerId: b.ownerId, ownerName: b.ownerName })));
          return updated;
        });
        break;

      case 'bubble-update':
        console.log(`📝 Updating bubble ${event.bubbleId} with text: "${event.text}"`);
        setBubbles(prev => {
          console.log('Current bubbles before update:', prev.map(b => ({ id: b.id, ownerId: b.ownerId, text: b.text })));

          // Check if bubble exists
          const bubbleExists = prev.some(bubble => bubble.id === event.bubbleId);
          if (!bubbleExists) {
            console.log(`⚠️ Bubble ${event.bubbleId} not found! Cannot update text without knowing owner. Ignoring.`);
            return prev;
          }

          const updated = prev.map(bubble =>
            bubble.id === event.bubbleId
              ? { ...bubble, text: event.text }
              : bubble
          );
          console.log('Updated bubbles after update:', updated.map(b => ({ id: b.id, ownerId: b.ownerId, text: b.text })));
          return updated;
        });
        break;

      case 'bubble-finalize':
        console.log(`✅ Bubble ${event.bubbleId} finalized`);
        setBubbles(prev => prev.map(bubble =>
          bubble.id === event.bubbleId
            ? { ...bubble, isFinalized: true, finalizedAt: event.finalizedAt }
            : bubble
        ));
        break;

      case 'bubble-sync':
        console.log(`🔄 Received bubble sync with ${event.bubbles.length} bubbles:`, event.bubbles);

        // Only replace bubbles if we have fewer bubbles or only empty bubbles
        setBubbles(prev => {
          console.log('Current bubbles before sync:', prev);
          const hasOwnedBubbles = prev.some(bubble => bubble.ownerId);

          if (!hasOwnedBubbles || prev.length <= 1) {
            console.log('✅ Replacing bubbles with synced data');
            // We don't have any owned bubbles, safe to replace
            const newBubbles = [...event.bubbles];

            // Ensure there's always an empty bubble at the end
            const hasEmptyBubble = newBubbles.some(bubble => !bubble.ownerId);
            if (!hasEmptyBubble) {
              newBubbles.push({
                id: generateBubbleId(),
                ownerId: '',
                ownerName: '',
                text: '',
                isFinalized: false,
                claimedAt: ''
              });
            }

            console.log('Final bubbles after sync:', newBubbles);
            return newBubbles;
          }

          // We already have bubbles, don't replace to avoid conflicts
          console.log('🚫 Ignoring bubble sync - already have owned bubbles');
          return prev;
        });
        break;

      case 'request-sync':
        if (event.requesterId !== userId) {
          console.log(`📤 Sending bubble sync to ${event.requesterId}`);
          // Send current bubble state to the requesting peer
          const syncEvent: P2PEvent = {
            type: 'bubble-sync',
            bubbles: bubbles
          };
          broadcastToAllPeers(syncEvent);
        }
        break;
    }
  };

  const broadcastToAllPeers = (event: P2PEvent) => {
    console.log(`📤 Broadcasting P2P event to ${connections.length} peers:`, event);
    connections.forEach(conn => {
      if (conn.open) {
        console.log(`📤 Sending to peer ${conn.peer}`);
        conn.send(event);
      } else {
        console.warn(`⚠️ Connection to ${conn.peer} is not open`);
      }
    });
  };

  const handleBubbleClaim = (bubbleId: string) => {
    console.log(`🎯 Claiming bubble ${bubbleId}`);

    const claimedAt = new Date().toISOString(); // Already UTC
    const event: P2PEvent = {
      type: 'bubble-claim',
      bubbleId,
      ownerId: userId,
      ownerName: username,
      claimedAt
    };

    // Update local state
    setBubbles(prev => {
      const updated = prev.map(bubble =>
        bubble.id === bubbleId
          ? { ...bubble, ownerId: userId, ownerName: username, claimedAt }
          : bubble
      );

      // Add new empty bubble if needed
      const hasEmptyBubble = updated.some(bubble => !bubble.ownerId);
      if (!hasEmptyBubble) {
        updated.push({
          id: generateBubbleId(),
          ownerId: '',
          ownerName: '',
          text: '',
          isFinalized: false,
          claimedAt: ''
        });
      }

      return updated;
    });

    // Broadcast to peers
    broadcastToAllPeers(event);
  };

  const handleTextChange = (bubbleId: string, text: string) => {
    console.log(`⌨️ Text change in bubble ${bubbleId}:`, text);

    const event: P2PEvent = {
      type: 'bubble-update',
      bubbleId,
      text,
      timestamp: new Date().toISOString() // Already UTC
    };

    // Update local state
    setBubbles(prev => prev.map(bubble =>
      bubble.id === bubbleId
        ? { ...bubble, text }
        : bubble
    ));

    // Broadcast to peers
    broadcastToAllPeers(event);
  };

  const handleBubbleFinalize = (bubbleId: string) => {
    console.log(`✅ Finalizing bubble ${bubbleId}`);

    const finalizedAt = new Date().toISOString(); // Already UTC
    const event: P2PEvent = {
      type: 'bubble-finalize',
      bubbleId,
      finalizedAt
    };

    // Update local state
    setBubbles(prev => prev.map(bubble =>
      bubble.id === bubbleId
        ? { ...bubble, isFinalized: true, finalizedAt }
        : bubble
    ));

    // Broadcast to peers
    broadcastToAllPeers(event);
  };

  const createSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:9000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setSessionId(data.sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const joinSession = (id: string) => {
    setSessionId(id);
  };

  if (!username) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container>
          <Box my={4} display="flex" justifyContent="center">
            <UsernameInput onUsernameChosen={setUsername} />
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  if (!sessionId) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container>
          <Box my={4} display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <SessionManager
              onCreateSession={createSession}
              onJoinSession={joinSession}
              isLoading={isLoading}
            />
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box my={4}>
          <Paper elevation={1} sx={{ padding: 2, marginBottom: 3 }}>
            <Typography variant="h6">
              Session: {sessionId} | User: {username}
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block">
              Share the session ID with others to join this chat
            </Typography>
            <Typography variant="caption" color="primary" display="block">
              Connected to {connections.length} peer(s): {connections.map(c => c.peer).join(', ')}
            </Typography>
          </Paper>

          <Box>
            {bubbles
              .sort((a, b) => {
                // Empty bubbles always go to the end
                if (!a.ownerId && !b.ownerId) return 0;
                if (!a.ownerId) return 1;
                if (!b.ownerId) return -1;

                // Sort owned bubbles by claim timestamp (oldest first)
                return new Date(a.claimedAt).getTime() - new Date(b.claimedAt).getTime();
              })
              .map((bubble, index) => (
                <LiveBubble
                  key={bubble.id}
                  bubble={bubble}
                  currentUserId={userId}
                  currentUsername={username}
                  onClaim={handleBubbleClaim}
                  onTextChange={handleTextChange}
                  onFinalize={handleBubbleFinalize}
                />
              ))}
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
