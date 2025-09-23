import { Box, Button, Divider, Paper, TextField, Typography } from '@mui/material';
import type React from 'react';
import { useState } from 'react';

interface SessionManagerProps {
  onCreateSession: () => void;
  onJoinSession: (sessionId: string) => void;
  isLoading: boolean;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  onCreateSession,
  onJoinSession,
  isLoading,
}) => {
  const [sessionIdInput, setSessionIdInput] = useState('');

  const handleJoin = () => {
    if (sessionIdInput.trim()) {
      onJoinSession(sessionIdInput.trim().toUpperCase());
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <Box display='flex' flexDirection='column' alignItems='center' gap={3}>
      <Typography variant='h4' component='h1' gutterBottom>
        Live Chat
      </Typography>

      <Typography variant='subtitle1' color='textSecondary' textAlign='center'>
        Create a new session or join an existing one
      </Typography>

      <Paper elevation={3} sx={{ padding: 4, minWidth: '400px' }}>
        <Box display='flex' flexDirection='column' gap={3}>
          <Button
            variant='contained'
            size='large'
            onClick={onCreateSession}
            disabled={isLoading}
            fullWidth
          >
            Create New Session
          </Button>

          <Divider>OR</Divider>

          <Box display='flex' flexDirection='column' gap={2}>
            <TextField
              label='Session ID'
              variant='outlined'
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder='Enter session ID'
              disabled={isLoading}
              fullWidth
            />
            <Button
              variant='outlined'
              size='large'
              onClick={handleJoin}
              disabled={isLoading || !sessionIdInput.trim()}
              fullWidth
            >
              Join Session
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SessionManager;
