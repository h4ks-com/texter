import { Box, Container, CssBaseline, createTheme, Paper, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import type { P2PEvent } from '../../shared/types';
import LiveBubble from './components/LiveBubble';
import SessionManager from './components/SessionManager';
import UsernameInput from './components/usernameInput';
import { useBubbleState } from './hooks/useBubbleState';
import { usePeerConnection } from './hooks/usePeerConnection';
import { useSocketConnection } from './hooks/useSocketConnection';
import { generateBubbleId, sortBubbles } from './utils/bubbleUtils';
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
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use custom hooks for state management
  const { bubbles, handleP2PMessage, initializeBubbles } = useBubbleState();

  const { peer, connections, setPendingPeerIds, connectToPeerById, broadcastToAllPeers } =
    usePeerConnection({
      userId,
      bubbles,
      onP2PMessage: handleP2PMessage,
      generateBubbleId,
    });

  // Socket connection management
  useSocketConnection({
    username,
    sessionId,
    peer,
    connectToPeerById,
    setPendingPeerIds,
    setSocket,
    setUserId,
    setSessionId,
  });

  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
    }
  }, [username]);

  // Initialize bubbles when peer connection is established
  useEffect(() => {
    if (peer && bubbles.length === 0) {
      initializeBubbles();
    }
  }, [peer, bubbles.length, initializeBubbles]);

  const handleBubbleClaim = useCallback(
    (bubbleId: string) => {
      console.log(`🎯 Claiming bubble ${bubbleId}`);

      const claimedAt = new Date().toISOString();
      const event: P2PEvent = {
        type: 'bubble-claim',
        bubbleId,
        ownerId: userId,
        ownerName: username,
        claimedAt,
      };

      // Process locally first
      handleP2PMessage(event);
      // Then broadcast to peers
      broadcastToAllPeers(event);
    },
    [userId, username, handleP2PMessage, broadcastToAllPeers],
  );

  const handleTextChange = useCallback(
    (bubbleId: string, text: string) => {
      const event: P2PEvent = {
        type: 'bubble-update',
        bubbleId,
        text,
        timestamp: new Date().toISOString(),
      };

      // Process locally first
      handleP2PMessage(event);
      // Then broadcast to peers
      broadcastToAllPeers(event);
    },
    [handleP2PMessage, broadcastToAllPeers],
  );

  const handleBubbleFinalize = useCallback(
    (bubbleId: string) => {
      const finalizedAt = new Date().toISOString();
      const event: P2PEvent = {
        type: 'bubble-finalize',
        bubbleId,
        finalizedAt,
      };

      // Process locally first
      handleP2PMessage(event);
      // Then broadcast to peers
      broadcastToAllPeers(event);
    },
    [handleP2PMessage, broadcastToAllPeers],
  );

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
            {sortBubbles(bubbles).map((bubble, _index) => (
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
