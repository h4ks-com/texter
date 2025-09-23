import { useCallback, useState } from 'react';
import type { IBubble, P2PEvent } from '../../../shared/types';
import { canCreateNewBubble, generateBubbleId } from '../utils/bubbleUtils';

export const useBubbleState = () => {
  const [bubbles, setBubbles] = useState<IBubble[]>([]);

  const handleP2PMessage = useCallback((event: P2PEvent) => {
    switch (event.type) {
      case 'bubble-claim':
        setBubbles((prev) => {
          const bubbleExists = prev.some((bubble) => bubble.id === event.bubbleId);

          if (!bubbleExists) {
            const newBubble: IBubble = {
              id: event.bubbleId,
              ownerId: event.ownerId,
              ownerName: event.ownerName,
              text: '',
              isFinalized: false,
              claimedAt: event.claimedAt,
            };

            const updated = [...prev, newBubble];

            // Add new empty bubble only if we can create one
            if (canCreateNewBubble(updated)) {
              updated.push({
                id: generateBubbleId(),
                ownerId: '',
                ownerName: '',
                text: '',
                isFinalized: false,
                claimedAt: '',
              });
            }

            return updated;
          }
          const updated = prev.map((bubble) =>
            bubble.id === event.bubbleId
              ? {
                  ...bubble,
                  ownerId: event.ownerId,
                  ownerName: event.ownerName,
                  claimedAt: event.claimedAt,
                }
              : bubble,
          );

          // Add new empty bubble only if we can create one
          if (canCreateNewBubble(updated)) {
            updated.push({
              id: generateBubbleId(),
              ownerId: '',
              ownerName: '',
              text: '',
              isFinalized: false,
              claimedAt: '',
            });
          }

          return updated;
        });
        break;

      case 'bubble-update':
        setBubbles((prev) => {
          const bubbleExists = prev.some((bubble) => bubble.id === event.bubbleId);
          if (!bubbleExists) return prev;

          return prev.map((bubble) =>
            bubble.id === event.bubbleId ? { ...bubble, text: event.text } : bubble,
          );
        });
        break;

      case 'bubble-finalize':
        setBubbles((prev) =>
          prev.map((bubble) =>
            bubble.id === event.bubbleId
              ? { ...bubble, isFinalized: true, finalizedAt: event.finalizedAt }
              : bubble,
          ),
        );
        break;

      case 'bubble-sync':
        setBubbles((prev) => {
          const hasOwnedBubbles = prev.some((bubble) => bubble.ownerId);

          if (!hasOwnedBubbles || prev.length <= 1) {
            const newBubbles = [...event.bubbles];

            // Ensure there's always an empty bubble at the end if we can create one
            if (canCreateNewBubble(newBubbles)) {
              newBubbles.push({
                id: generateBubbleId(),
                ownerId: '',
                ownerName: '',
                text: '',
                isFinalized: false,
                claimedAt: '',
              });
            }

            return newBubbles;
          }

          return prev;
        });
        break;

      case 'request-sync':
        // This case needs to be handled externally since it requires connections
        break;
    }
  }, []);

  const initializeBubbles = useCallback(() => {
    const initialBubble: IBubble = {
      id: generateBubbleId(),
      ownerId: '',
      ownerName: '',
      text: '',
      isFinalized: false,
      claimedAt: '',
    };
    setBubbles([initialBubble]);
  }, []);

  return {
    bubbles,
    setBubbles,
    handleP2PMessage,
    initializeBubbles,
  };
};
