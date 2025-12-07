const CACHE_KEYS = {
  CURRENT_USER: 'current_user'
};

export const userCache = {
  async getCachedCurrentUser() {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEYS.CURRENT_USER);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  },

  async saveCurrentUserToCache(user) {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(CACHE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  },

  async clearCurrentUserCache() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(CACHE_KEYS.CURRENT_USER);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};