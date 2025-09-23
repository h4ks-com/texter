import { Box, Button, TextField } from '@mui/material';
import type React from 'react';
import { useState } from 'react';

interface Props {
  onUsernameChosen: (username: string) => void;
}

const MIN_USERNAME_LENGTH = 3;

const UsernameInput: React.FC<Props> = ({ onUsernameChosen }) => {
  const [usernameInput, setUsernameInput] = useState<string>(''); // Separate state for username input
  const [usernameError, setUsernameError] = useState<string>(''); // State for username error

  // Function to handle setting the username
  const handleSetUsername = () => {
    if (usernameInput.length < MIN_USERNAME_LENGTH) {
      setUsernameError(`Username must be at least ${MIN_USERNAME_LENGTH} characters long.`);
    } else {
      onUsernameChosen(usernameInput);
      setUsernameError('');
    }
  };

  return (
    <Box>
      <TextField
        label='Pick a Username'
        variant='outlined'
        fullWidth
        value={usernameInput}
        onChange={(e) => setUsernameInput(e.target.value)}
        error={!!usernameError}
        helperText={usernameError}
      />
      <Button variant='contained' color='primary' onClick={handleSetUsername} sx={{ mt: 2 }}>
        Set Username
      </Button>
    </Box>
  );
};

export default UsernameInput;
