import { useCallback, useRef } from "react";
import { authService } from "../services/authService";
import { userCache } from "../utils/userCache";

export const useAuth = ({ setCurrentUser, isMountedRef }) => {
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const getCurrentUser = useCallback(async (forceRefresh = false) => {
    if (isFetchingRef.current) {
      return;
    }

    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      return;
    }

    if (!isMountedRef.current) return;

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      if (!forceRefresh) {
        const cachedUser = await userCache.getCachedCurrentUser();
        if (cachedUser && isMountedRef.current) {
          setCurrentUser(cachedUser);
        }
      }

      const userData = await authService.fetchCurrentUser();
      
      if (userData && isMountedRef.current) {
        setCurrentUser(userData);
        await userCache.saveCurrentUserToCache(userData);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      await authService.handleAuthError(error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [setCurrentUser, isMountedRef]);

  return { getCurrentUser };
};