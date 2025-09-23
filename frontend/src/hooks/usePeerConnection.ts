import Peer, { type DataConnection } from 'peerjs';
import { useCallback, useEffect, useState } from 'react';
import type { IBubble, P2PEvent } from '../../../shared/types';

interface UsePeerConnectionProps {
  userId: string;
  bubbles: IBubble[];
  onP2PMessage: (event: P2PEvent) => void;
  generateBubbleId: () => string;
}

export const usePeerConnection = ({
  userId,
  bubbles,
  onP2PMessage,
  generateBubbleId,
}: UsePeerConnectionProps) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [pendingPeerIds, setPendingPeerIds] = useState<{ id: string; username: string }[]>([]);

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
        onP2PMessage(data as P2PEvent);
      });

      conn.on('error', (error) => {
        console.error('❌ P2P connection error:', error);
      });

      conn.on('close', () => {
        setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));
      });
    },
    [bubbles, onP2PMessage],
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

  const initializeChat = useCallback(() => {
    const initialBubble: IBubble = {
      id: generateBubbleId(),
      ownerId: '',
      ownerName: '',
      text: '',
      isFinalized: false,
      claimedAt: '',
    };
    return [initialBubble];
  }, [generateBubbleId]);

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

  return {
    peer,
    connections,
    pendingPeerIds,
    setPendingPeerIds,
    connectToPeerById,
    broadcastToAllPeers,
    initializeChat,
  };
};
