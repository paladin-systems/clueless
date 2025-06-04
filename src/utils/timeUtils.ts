/**
 * Format duration in milliseconds to a human-readable string (HH:MM:SS)
 */
export const formatDuration = (duration: number): string => {
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);

  const parts = [];
  
  if (hours > 0) {
    parts.push(hours.toString().padStart(2, '0'));
  }
  
  parts.push(minutes.toString().padStart(2, '0'));
  parts.push(seconds.toString().padStart(2, '0'));

  return parts.join(':');
};

/**
 * Format timestamp to locale time string
 */
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Get relative time string (e.g., "2 minutes ago")
 */
export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return `${seconds}s ago`;
};

/**
 * Format duration for display in post-it notes
 */
export const formatNoteDuration = (duration: number): string => {
  const minutes = Math.floor(duration / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
};