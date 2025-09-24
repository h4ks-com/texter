# Texter

**Experimental p2p live texting app**

Texter is a real-time collaborative texting application that uses peer-to-peer connections for direct communication between users, with minimal server infrastructure.

## Features

- **Real-time P2P Communication**: Direct peer-to-peer connections using WebRTC via PeerJS
- **Live Text Collaboration**: Multiple users can claim and edit text bubbles in real-time
- **Session-based**: Create or join sessions with unique session IDs
- **Minimal Server**: Uses Socket.IO only for session coordination and peer discovery
- **Modern UI**: Built with React and Material-UI with dark theme

## Architecture

- **Frontend**: React with TypeScript, Material-UI, PeerJS for P2P connections
- **Backend**: Express.js with Socket.IO for session management and PeerJS server for WebRTC signaling
- **Communication**: WebSocket for session management, WebRTC data channels for P2P messaging

## Quick Start

### Using Docker (Recommended)

1. Start the application:
   ```bash
   docker compose up --build
   ```

2. Open your browser and navigate to `http://localhost:9000`

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the backend:
   ```bash
   npm run dev --workspace=backend
   ```

3. Start the frontend (in another terminal):
   ```bash
   npm run start --workspace=frontend
   ```

4. Open `http://localhost:3000` in your browser

## How It Works

1. **Session Creation**: One user creates a session, which generates a unique session ID
2. **User Joining**: Other users join using the session ID and choose a username
3. **Peer Discovery**: The server coordinates initial peer discovery via Socket.IO
4. **P2P Connection**: Users establish direct WebRTC connections using PeerJS
5. **Live Collaboration**: Text bubbles can be claimed and edited by any user in real-time
6. **Bubble Finalization**: Users can finalize bubbles to prevent further editing

## Environment Variables

- `BACKEND_PORT`: Server port (default: 9000)
- `CORS_ORIGIN`: CORS allowed origins (default: *)
- `REACT_APP_BACKEND_URL`: Frontend backend URL (default: http://localhost:9000)

## Technology Stack

- **Frontend**: React, TypeScript, Material-UI, PeerJS, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, PeerJS Server
- **Infrastructure**: Docker, Docker Compose
- **Communication**: WebSocket, WebRTC

## Development

The project uses a monorepo structure with Lerna:
- `frontend/`: React frontend application
- `backend/`: Express.js backend server
- `shared/`: Shared TypeScript types and utilities

### Scripts

- `npm run format`: Format code with Biome
- `npm run lint`: Lint code with Biome
- `npm run check`: Check code issues with Biome
- `npm run fix`: Auto-fix code issues with Biome
