import type { IBubble } from '../../../shared/types';

export const generateBubbleId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const sortBubbles = (bubbles: IBubble[]) => {
  return bubbles.sort((a, b) => {
    if (!a.ownerId && !b.ownerId) return 0;
    if (!a.ownerId) return 1;
    if (!b.ownerId) return -1;
    return new Date(a.claimedAt).getTime() - new Date(b.claimedAt).getTime();
  });
};

export const getUserColor = (username: string): string => {
  const colors = [
    '#8B5A5A', // Dark red
    '#5A7A8B', // Steel blue
    '#6B5A8B', // Dark purple
    '#5A8B5A', // Dark green
    '#8B7A5A', // Dark yellow/brown
    '#8B5A7A', // Dark pink
    '#5A8B7A', // Teal
    '#7A5A8B', // Purple
    '#5A6B8B', // Blue
    '#8B6B5A', // Brown
    '#7A8B5A', // Olive
    '#8B5A6B', // Mauve
    '#5A8B6B', // Green-blue
    '#6B8B5A', // Yellow-green
    '#8B5A5A', // Maroon
    '#5A5A8B', // Navy
  ];

  // Simple hash function for username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
};

export const canCreateNewBubble = (bubbles: IBubble[]): boolean => {
  // Only allow creating a new bubble if there are no empty bubbles
  return !bubbles.some((bubble) => !bubble.ownerId && !bubble.text.trim());
};
