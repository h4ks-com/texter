# Texter Architecture

## Overview

Texter is a real-time collaborative bubble chat application where users share a live board of text bubbles. Users can claim ownership of bubbles, type in real-time, and see others' changes instantly. Built with a hybrid P2P + server architecture where the server only handles session coordination while all bubble content goes peer-to-peer.

## Project Structure

```
texter/
├── backend/           # Express server with WebSocket and PeerJS
├── frontend/          # React application with Material-UI
├── shared/            # Shared TypeScript interfaces
├── package.json       # Root package with Lerna configuration
└── lerna.json         # Lerna monorepo configuration
```

## Architecture Components

### Frontend (React + TypeScript)

**Location**: `frontend/`
**Port**: Default React development server (3000)

**Key Technologies**:
- React 18 with TypeScript
- Material-UI (MUI) for UI components
- PeerJS for peer-to-peer connections
- Socket.io-client for WebSocket communication

**Core Components**:
- `App.tsx`: Main application component handling messaging logic
- `UsernameInput.tsx`: User registration and validation
- Theme configuration with dark mode

**State Management**:
- Local React state for real-time messaging
- localStorage for persistence (username, last 100 messages)

### Backend (Express + WebSocket + PeerJS)

**Location**: `backend/`
**Port**: 9000

**Key Technologies**:
- Express.js for HTTP server
- WebSocket (ws) for real-time communication
- PeerJS ExpressPeerServer for WebRTC signaling
- TypeScript for type safety

**Endpoints**:
- `GET /`: Health check endpoint
- `/peerjs/*`: PeerJS signaling server path
- WebSocket connection for user coordination

**Features**:
- User registration and nickname validation
- Real-time typing indicators
- Message finalization broadcasting
- Connection management and cleanup

### Shared Types

**Location**: `shared/types.ts`

**Interfaces**:
```typescript
interface IMessageContent {
  text: string;
}

interface IMessage {
  timestamp: string;
  user: string;
  content: IMessageContent;
}
```

## What the Server Does (Socket.IO + PeerJS)

**Session Management**:
- Create/join sessions with unique IDs
- Track which users are in each session
- Provide peer discovery (tell users about each other)
- Handle user joins/leaves

**WebRTC Signaling**:
- PeerJS server enables initial P2P connection setup
- After P2P connection established, server is not involved

**The server does NOT handle any bubble content, typing, or chat data.**

## What Goes Peer-to-Peer (WebRTC)

**All Bubble Operations**:
- Bubble claim (when user clicks empty bubble)
- Live text updates (every keystroke)
- Bubble finalization (when user presses Enter)
- Bubble state synchronization for new peers

### Bubble Lifecycle

1. **User clicks empty bubble**:
   ```
   User A → P2P → All Peers: bubble-claim event
   ```

2. **User types in their bubble**:
   ```
   User A types → P2P → All Peers: bubble-update events
   ```

3. **User finishes (Enter key)**:
   ```
   User A → P2P → All Peers: bubble-finalize event
   ```

4. **New user joins session**:
   ```
   New User → P2P → Existing Peers: request-sync
   Existing Peer → P2P → New User: bubble-sync (all current bubbles)
   ```

## Data Flow

### Client-Side Data Management

1. **Initialization**:
   - Load username from localStorage
   - Load last 100 messages from localStorage
   - Initialize PeerJS connection
   - Connect to WebSocket server

2. **Real-time Updates**:
   - Typing events trigger P2P broadcasts
   - Message updates merge with existing state
   - localStorage updates on state changes

3. **Connection Management**:
   - Track active peer connections
   - Handle connection failures and reconnection
   - Clean up on component unmount

### Server-Side Coordination

1. **User Management**:
   - Maintain active user registry
   - Validate unique usernames
   - Handle disconnections and cleanup

2. **Event Broadcasting**:
   - Relay typing indicators to all users
   - Broadcast message finalization events
   - Coordinate connection establishment

## Security Considerations

- **No Authentication**: Currently uses simple username-based identification
- **Local Storage**: Sensitive data should not be stored in localStorage
- **P2P Connections**: Direct client connections may expose IP addresses
- **Input Validation**: Basic validation exists for username length

## Performance Characteristics

### Scalability
- **P2P Architecture**: Reduces server bandwidth requirements
- **Local Storage**: Minimizes server-side state management
- **Connection Limits**: Limited by WebRTC connection constraints

### Real-time Performance
- **Typing Indicators**: Near-instant P2P transmission
- **Message Delivery**: Direct peer connections eliminate server latency
- **Connection Overhead**: Initial WebRTC handshake introduces setup delay

## Development and Deployment

### Development Setup
```bash
# Install dependencies
npm install

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm start
```

### Build Process
```bash
# Backend build
cd backend && npm run build

# Frontend build
cd frontend && npm run build
```

### Environment Configuration
- Backend runs on port 9000
- Frontend connects to localhost:9000 for PeerJS signaling
- WebSocket connections use same port as HTTP server

## Future Considerations

### Potential Improvements
- Authentication and user management
- Message encryption for P2P channels
- File sharing capabilities
- Mobile responsiveness
- Connection recovery mechanisms
- Rate limiting and abuse prevention

### Scalability Enhancements
- Redis for session management
- Load balancing for multiple server instances
- Database integration for message persistence
- Push notifications for offline users