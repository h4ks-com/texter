import express from 'express';
import {Server} from 'http';
import {WebSocketServer, WebSocket} from 'ws';
import cors from 'cors';
import {ExpressPeerServer} from 'peer';

const app = express();
app.use(cors());
const server = new Server(app);
const wss = new WebSocketServer({server});

interface User {
  username: string;
  ws: WebSocket;
}

// Create an Express server
app.get('/', (_req, res) => {
  res.send('PeerJS server is running');
});

const users: User[] = [];

wss.on('connection', (ws) => {
  let currentUser: User | null = null;
  console.log('New connection');

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    console.log('Received message:', message);
    switch (message.type) {
      case 'check-nickname':
        // Check if the nickname is already taken
        const isTaken = users.some((user) => user.username === message.username);
        ws.send(JSON.stringify({type: 'nickname-check', available: !isTaken}));
        break;

      case 'register-user':
        // Handle new user registration
        if (users.some((user) => user.username === message.username)) {
          ws.send(JSON.stringify({type: 'nickname-taken'}));
        } else {
          currentUser = {username: message.username, ws};
          users.push(currentUser);
          ws.send(JSON.stringify({type: 'user-registered', username: message.username}));
        }
        break;

      case 'start-typing':
        // Broadcast typing message to all other users
        broadcast({type: 'typing-message', message}, currentUser);
        break;

      case 'finalize-message':
        // Finalize message and broadcast
        broadcast({type: 'finalize-message', messageId: message.messageId}, currentUser);
        break;
    }
  });

  ws.on('close', () => {
    // Remove the user when they disconnect
    if (currentUser) {
      const index = users.findIndex((user) => user.username === currentUser!.username);
      if (index !== -1) {
        users.splice(index, 1);
      }
    }
  });
});

// Helper function to broadcast messages to all connected users except the sender
const broadcast = (data: any, sender: User | null) => {
  users.forEach((user) => {
    if (user !== sender) {
      user.ws.send(JSON.stringify(data));
    }
  });
};

const peerServer = ExpressPeerServer(server, {
  path: '/connect',
});

app.use('/peerjs', peerServer);

const PORT = 9000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

