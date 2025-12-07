"use client";
import { PremiumSubscriptionView } from "./PremiumSubscriptionView.js";
import { usePremiumSubscription } from "./hooks/usePremiumSubscription";

export function PremiumSubscription({
  isExpandedGift,
  setIsExpandedGift,
  currentUser,
}) {
  const { toggleMenu, isActive } = usePremiumSubscription({
    isExpandedGift,
    setIsExpandedGift,
  });

  return (
    <PremiumSubscriptionView
      isActive={isActive}
      toggleMenu={toggleMenu}
      currentUser={currentUser}
    />
  );
}
