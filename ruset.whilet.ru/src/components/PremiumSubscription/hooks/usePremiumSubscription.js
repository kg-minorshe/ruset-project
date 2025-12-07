import { useCallback } from "react";

export function usePremiumSubscription({ isExpandedGift, setIsExpandedGift }) {
  const toggleMenu = useCallback(() => {
    setIsExpandedGift(!isExpandedGift);
  }, [isExpandedGift, setIsExpandedGift]);

  return {
    toggleMenu,
    isActive: isExpandedGift,
  };
}