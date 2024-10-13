import React, {useState, useEffect} from 'react';
import {Box, Container, TextField, Typography, Paper, Button, createTheme, CssBaseline} from '@mui/material';
import Peer, {DataConnection} from 'peerjs';
import {ThemeProvider} from '@mui/material/styles';
import './App.css';
import usernameInput from './components/usernameInput';
import UsernameInput from './components/usernameInput';
import { IMessage, IMessageContent } from '../../shared/types';

interface Message extends IMessage {
  isTyping?: boolean;
}

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
    const storedUser = localStorage.getItem('username');
    return storedUser || '';
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    return storedMessages ? JSON.parse(storedMessages).slice(-100) : [];
  });
  const [text, setText] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [peerId, setPeerId] = useState<string>('');

  // Save the username in local storage
  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
    }
  }, [username]);

  // Save chat history in local storage
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  // Initialize PeerJS and connect to the signaling server
  useEffect(() => {
    const newPeer = new Peer({
      host: 'localhost',
      port: 9000,
      path: '/connect/',
    });

    setPeer(newPeer);

    newPeer.on('open', (id) => {
      setPeerId(id);
      console.log('My peer ID is: ' + id);
    });

    // Handle incoming connections
    newPeer.on('connection', (conn) => {
      conn.on('data', handleIncomingMessage);
      setConnections((prev) => [...prev, conn]);
    });

    return () => {
      newPeer.destroy();
    };
  }, []);

  // Function to connect to a peer by their ID
  const connectToPeer = (id: string) => {
    if (peer) {
      const connection = peer.connect(id);
      connection.on('open', () => {
        connection.on('data', handleIncomingMessage);
        setConnections((prev) => [...prev, connection]);
      });
    }
  };

  // Function to handle incoming messages
  const handleIncomingMessage = (data: unknown) => {
    const message = data as Message;
    setMessages((prevMessages) => {
      const updatedMessages = prevMessages.map((msg) =>
        msg.user === message.user ? message : msg
      );
      const isNewMessage = !prevMessages.some((msg) => msg.user === message.user);
      return isNewMessage ? [...updatedMessages, message] : updatedMessages;
    });
  };

  // Function to broadcast messages to all connections
  const broadcastMessage = (message: Message) => {
    connections.forEach((conn) => conn.send(message));
    setMessages((prevMessages) => {
      const updatedMessages = prevMessages.map((msg) =>
        msg.user === message.user ? message : msg
      );
      const isNewMessage = !prevMessages.some((msg) => msg.user === message.user);
      return isNewMessage ? [...updatedMessages, message] : updatedMessages;
    });
  };

  // Function to handle user typing
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    const message: Message = {
      timestamp: new Date().toISOString(),
      user: username,
      content: {text: newText},
      isTyping: true,
    };
    broadcastMessage(message);
  };

  // Function to send the final message
  const handleSend = () => {
    const message: Message = {
      timestamp: new Date().toISOString(),
      user: username,
      content: {text},
      isTyping: false,
    };
    broadcastMessage(message);
    setText('');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container>
        <Box my={4}>
          {!username ? (
            <UsernameInput onUsernameChosen={setUsername} />
          ) : (
            <Box>
              <Typography variant="h6">Your Peer ID: {peerId}</Typography>
              <TextField
                label="Connect to Peer ID"
                variant="outlined"
                fullWidth
                onBlur={(e) => connectToPeer(e.target.value)}
                sx={{mb: 2}}
              />
              <Paper elevation={3} sx={{padding: 2}}>
                <Typography variant="h5">Chat Messages</Typography>
                <Box>
                  {messages.map((msg, idx) => (
                    <Box key={idx} my={2}>
                      <Typography variant="caption">
                        {msg.user} ({new Date(msg.timestamp).toLocaleTimeString()}):
                      </Typography>
                      <Typography>
                        {msg.content.text}
                        {msg.isTyping && ' ...'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
              <TextField
                label="Type a message"
                variant="outlined"
                fullWidth
                value={text}
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend();
                  }
                }}
                sx={{mt: 2}}
              />
            </Box>
          )}
        </Box>
      </Container >
    </ThemeProvider>
  );
};

export default App;
