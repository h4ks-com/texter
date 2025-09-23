import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField } from '@mui/material';
import { IBubble } from '../../../shared/types';

interface LiveBubbleProps {
  bubble: IBubble;
  currentUserId: string;
  currentUsername: string;
  onClaim: (bubbleId: string) => void;
  onTextChange: (bubbleId: string, text: string) => void;
  onFinalize: (bubbleId: string) => void;
}

const LiveBubble: React.FC<LiveBubbleProps> = ({
  bubble,
  currentUserId,
  currentUsername,
  onClaim,
  onTextChange,
  onFinalize
}) => {
  const [localText, setLocalText] = useState(bubble.text);
  const textFieldRef = useRef<HTMLInputElement>(null);

  const isOwnBubble = bubble.ownerId === currentUserId;
  const isEmpty = !bubble.ownerId;
  const isFinalized = bubble.isFinalized;

  useEffect(() => {
    setLocalText(bubble.text);
  }, [bubble.text]);

  const handleClick = () => {
    if (isEmpty) {
      onClaim(bubble.id);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newText = event.target.value;
    setLocalText(newText);
    if (isOwnBubble) {
      onTextChange(bubble.id, newText);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && isOwnBubble && !isFinalized) {
      onFinalize(bubble.id);
      event.preventDefault();
    }
  };

  const getBubbleColor = () => {
    if (isEmpty) return '#2a2a2a';
    if (isFinalized) {
      return isOwnBubble ? '#1565c0' : '#424242';
    }
    return isOwnBubble ? '#1976d2' : '#616161';
  };

  const getTextColor = () => {
    if (isEmpty) return '#666';
    return '#fff';
  };

  const getBorderStyle = () => {
    if (isEmpty) return '2px dashed #666';
    if (!isFinalized && isOwnBubble) return '2px solid #1976d2';
    return 'none';
  };

  return (
    <Paper
      elevation={isFinalized ? 3 : 2}
      onClick={handleClick}
      sx={{
        padding: 2,
        marginBottom: 1,
        backgroundColor: getBubbleColor(),
        cursor: isEmpty ? 'pointer' : 'default',
        border: getBorderStyle(),
        minHeight: '60px',
        transition: 'all 0.2s ease',
        opacity: isFinalized ? 0.9 : 1,
        '&:hover': {
          backgroundColor: isEmpty ? '#333' : getBubbleColor(),
        }
      }}
    >
      {!isEmpty && (
        <Typography variant="caption" sx={{ color: '#bbb', marginBottom: 1, display: 'block' }}>
          {bubble.ownerName}
          {!isFinalized && ' (editing...)'}
          {bubble.claimedAt && (
            <span style={{ marginLeft: '8px', opacity: 0.7 }}>
              {new Date(bubble.claimedAt).toLocaleTimeString()}
            </span>
          )}
        </Typography>
      )}

      {isOwnBubble && !isFinalized ? (
        <TextField
          ref={textFieldRef}
          value={localText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          variant="standard"
          fullWidth
          multiline
          autoFocus
          InputProps={{
            disableUnderline: true,
            style: { color: getTextColor(), fontSize: '16px' }
          }}
          sx={{
            '& .MuiInputBase-input': {
              padding: 0,
            }
          }}
        />
      ) : (
        <Box sx={{ minHeight: '24px' }}>
          {isEmpty ? (
            <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
              Click to claim this bubble and start typing...
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ color: getTextColor(), whiteSpace: 'pre-wrap' }}>
              {localText}
              {!isFinalized && localText && (
                <span style={{ opacity: 0.6 }}>|</span>
              )}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default LiveBubble;