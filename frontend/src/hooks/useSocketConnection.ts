import type Peer from 'peerjs';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';

interface UseSocketConnectionProps {
  username: string;
  sessionId: string;
  peer: Peer | null;
  connectToPeerById: (peerId: string) => void;
  setPendingPeerIds: (
    fn: (prev: { id: string; username: string }[]) => { id: string; username: string }[],
  ) => void;
  setSocket: (socket: Socket | null) => void;
  setUserId: (userId: string) => void;
  setSessionId: (sessionId: string) => void;
}

export const useSocketConnection = ({
  username,
  sessionId,
  peer,
  connectToPeerById,
  setPendingPeerIds,
  setSocket,
  setUserId,
  setSessionId,
}: UseSocketConnectionProps) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: connectToPeerById, peer, setPendingPeerIds, setSessionId, setSocket, setUserId cause re-renders or are setters
  useEffect(() => {
    if (!username || !sessionId) return;
    const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const socketConnection = io(backendUrl, {
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
};
