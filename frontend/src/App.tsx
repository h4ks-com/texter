import { Box, Container, CssBaseline, createTheme, Paper, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import Peer, { type DataConnection } from 'peerjs';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { IBubble, P2PEvent } from '../../shared/types';
import LiveBubble from './components/LiveBubble';
import SessionManager from './components/SessionManager';
import UsernameInput from './components/usernameInput';
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
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPeerIds, setPendingPeerIds] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
    }
  }, [username]);

  const generateBubbleId = useCallback((): string => {
    return Math.random().toString(36).substr(2, 9);
  }, []);

  const initializeChat = useCallback(() => {
    const initialBubble: IBubble = {
      id: generateBubbleId(),
      ownerId: '',
      ownerName: '',
      text: '',
      isFinalized: false,
      claimedAt: '',
    };
    setBubbles([initialBubble]);
  }, [generateBubbleId]);

  const handleP2PMessage = useCallback(
    (event: P2PEvent) => {
      switch (event.type) {
        case 'bubble-claim':
          setBubbles((prev) => {
            const bubbleExists = prev.some((bubble) => bubble.id === event.bubbleId);

            if (!bubbleExists) {
              const newBubble: IBubble = {
                id: event.bubbleId,
                ownerId: event.ownerId,
                ownerName: event.ownerName,
                text: '',
                isFinalized: false,
                claimedAt: event.claimedAt,
              };

              const updated = [...prev, newBubble];

              const hasEmptyBubble = updated.some((bubble) => !bubble.ownerId);
              if (!hasEmptyBubble) {
                updated.push({
                  id: generateBubbleId(),
                  ownerId: '',
                  ownerName: '',
                  text: '',
                  isFinalized: false,
                  claimedAt: '',
                });
              }

              return updated;
            }
            const updated = prev.map((bubble) =>
              bubble.id === event.bubbleId
                ? {
                    ...bubble,
                    ownerId: event.ownerId,
                    ownerName: event.ownerName,
                    claimedAt: event.claimedAt,
                  }
                : bubble,
            );

            const hasEmptyBubble = updated.some((bubble) => !bubble.ownerId);
            if (!hasEmptyBubble) {
              updated.push({
                id: generateBubbleId(),
                ownerId: '',
                ownerName: '',
                text: '',
                isFinalized: false,
                claimedAt: '',
              });
            }

            return updated;
          });
          break;

        case 'bubble-update':
          setBubbles((prev) => {
            const bubbleExists = prev.some((bubble) => bubble.id === event.bubbleId);
            if (!bubbleExists) return prev;

            return prev.map((bubble) =>
              bubble.id === event.bubbleId ? { ...bubble, text: event.text } : bubble,
            );
          });
          break;

        case 'bubble-finalize':
          setBubbles((prev) =>
            prev.map((bubble) =>
              bubble.id === event.bubbleId
                ? { ...bubble, isFinalized: true, finalizedAt: event.finalizedAt }
                : bubble,
            ),
          );
          break;

        case 'bubble-sync':
          setBubbles((prev) => {
            const hasOwnedBubbles = prev.some((bubble) => bubble.ownerId);

            if (!hasOwnedBubbles || prev.length <= 1) {
              const newBubbles = [...event.bubbles];

              const hasEmptyBubble = newBubbles.some((bubble) => !bubble.ownerId);
              if (!hasEmptyBubble) {
                newBubbles.push({
                  id: generateBubbleId(),
                  ownerId: '',
                  ownerName: '',
                  text: '',
                  isFinalized: false,
                  claimedAt: '',
                });
              }

              return newBubbles;
            }

            return prev;
          });
          break;

        case 'request-sync':
          if (event.requesterId !== userId) {
            const syncEvent: P2PEvent = {
              type: 'bubble-sync',
              bubbles: bubbles,
            };
            connections.forEach((conn) => {
              if (conn.open) {
                conn.send(syncEvent);
              }
            });
          }
          break;
      }
    },
    [generateBubbleId, userId, bubbles, connections],
  );

  const setupConnection = useCallback(
    (conn: DataConnection) => {
      conn.on('open', () => {
        setConnections((prev) => [...prev.filter((c) => c.peer !== conn.peer), conn]);

        if (bubbles.length > 0) {
          const syncEvent: P2PEvent = {
            type: 'bubble-sync',
            bubbles: bubbles,
          };
          conn.send(syncEvent);
        }
      });

      conn.on('data', (data) => {
        handleP2PMessage(data as P2PEvent);
      });

      conn.on('error', (error) => {
        console.error('❌ P2P connection error:', error);
      });

      conn.on('close', () => {
        setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));
      });
    },
    [bubbles, handleP2PMessage],
  );

  const broadcastToAllPeers = useCallback(
    (event: P2PEvent) => {
      connections.forEach((conn) => {
        if (conn.open) {
          conn.send(event);
        }
      });
    },
    [connections],
  );

  const connectToPeerById = useCallback(
    (peerId: string) => {
      if (!peer || peerId === userId) return;
      if (connections.some((conn) => conn.peer === peerId)) return;

      try {
        const conn = peer.connect(peerId);
        if (conn) {
          setupConnection(conn);
        }
      } catch (error) {
        console.error(`❌ Error connecting to peer:`, error);
      }
    },
    [peer, userId, connections, setupConnection],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: setupConnection and pendingPeerIds create dependency cycles
  useEffect(() => {
    if (!userId) return;

    console.log('🔗 Initializing PeerJS with userId:', userId);
    const newPeer = new Peer(userId, {
      host: 'localhost',
      port: 9000,
      path: '/peerjs',
    });

    newPeer.on('open', (_id) => {
      console.log('✅ PeerJS connected');
      setPeer(newPeer);
      initializeChat();

      if (pendingPeerIds.length > 0) {
        pendingPeerIds.forEach((peerInfo) => {
          const conn = newPeer.connect(peerInfo.id);
          if (conn) {
            setupConnection(conn);
          }
        });
        setPendingPeerIds([]);
      }
    });

    newPeer.on('connection', (conn) => {
      setupConnection(conn);
    });

    newPeer.on('error', (error) => {
      console.error('❌ PeerJS error:', error);
    });

    return () => {
      newPeer.destroy();
    };
  }, [userId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: connectToPeerById causes infinite re-renders due to connections dependency
  useEffect(() => {
    if (!username || !sessionId) return;
    const socketConnection = io('http://localhost:9000', {
      path: '/ws',
      transports: ['polling'],
    });

    socketConnection.on('connect', () => {
      console.log('✅ Connected to session');
      setSocket(socketConnection);

      socketConnection.emit('join-session', {
        sessionId,
        username,
      });
    });

    socketConnection.on('session-joined', (data) => {
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
      if (peer) {
        data.peerIds.forEach((peerInfo: { id: string; username: string }) => {
          connectToPeerById(peerInfo.id);
        });
      } else {
        setPendingPeerIds(data.peerIds);
      }
    });

    socketConnection.on('message', (data) => {
      if (data.type === 'user-joined') {
        if (peer) {
          connectToPeerById(data.peerId);
        } else {
          setPendingPeerIds((prev) => [...prev, { id: data.peerId, username: data.username }]);
        }
      } else if (data.type === 'user-left') {
        setConnections((prev) => prev.filter((conn) => conn.peer !== data.userId));
      }
    });

    socketConnection.on('disconnect', () => {
      setSocket(null);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [username, sessionId]);

  const handleBubbleClaim = (bubbleId: string) => {
    console.log(`🎯 Claiming bubble ${bubbleId}`);

    const claimedAt = new Date().toISOString(); // Already UTC
    const event: P2PEvent = {
      type: 'bubble-claim',
      bubbleId,
      ownerId: userId,
      ownerName: username,
      claimedAt,
    };

    // Update local state
    setBubbles((prev) => {
      const updated = prev.map((bubble) =>
        bubble.id === bubbleId
          ? { ...bubble, ownerId: userId, ownerName: username, claimedAt }
          : bubble,
      );

      // Add new empty bubble if needed
      const hasEmptyBubble = updated.some((bubble) => !bubble.ownerId);
      if (!hasEmptyBubble) {
        updated.push({
          id: generateBubbleId(),
          ownerId: '',
          ownerName: '',
          text: '',
          isFinalized: false,
          claimedAt: '',
        });
      }

      return updated;
    });

    broadcastToAllPeers(event);
  };

  const handleTextChange = (bubbleId: string, text: string) => {
    const event: P2PEvent = {
      type: 'bubble-update',
      bubbleId,
      text,
      timestamp: new Date().toISOString(),
    };

    setBubbles((prev) =>
      prev.map((bubble) => (bubble.id === bubbleId ? { ...bubble, text } : bubble)),
    );

    broadcastToAllPeers(event);
  };

  const handleBubbleFinalize = (bubbleId: string) => {
    const finalizedAt = new Date().toISOString();
    const event: P2PEvent = {
      type: 'bubble-finalize',
      bubbleId,
      finalizedAt,
    };

    setBubbles((prev) =>
      prev.map((bubble) =>
        bubble.id === bubbleId ? { ...bubble, isFinalized: true, finalizedAt } : bubble,
      ),
    );

    broadcastToAllPeers(event);
  };

  const createSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:9000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          <Box my={4} display='flex' justifyContent='center'>
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
          <Box my={4} display='flex' justifyContent='center' alignItems='center' minHeight='80vh'>
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
      <Container maxWidth='md'>
        <Box my={4}>
          <Paper elevation={1} sx={{ padding: 2, marginBottom: 3 }}>
            <Typography variant='h6'>
              Session: {sessionId} | User: {username}
            </Typography>
            <Typography variant='caption' color='textSecondary' display='block'>
              Share the session ID with others to join this chat
            </Typography>
            <Typography variant='caption' color='primary' display='block'>
              Connected to {connections.length} peer(s): {connections.map((c) => c.peer).join(', ')}
            </Typography>
          </Paper>

          <Box>
            {bubbles
              .sort((a, b) => {
                if (!a.ownerId && !b.ownerId) return 0;
                if (!a.ownerId) return 1;
                if (!b.ownerId) return -1;
                return new Date(a.claimedAt).getTime() - new Date(b.claimedAt).getTime();
              })
              .map((bubble, _index) => (
                <LiveBubble
                  key={bubble.id}
                  bubble={bubble}
                  currentUserId={userId}
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
