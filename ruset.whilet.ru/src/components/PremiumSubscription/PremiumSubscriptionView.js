import { BiArrowBack, BiGift } from "react-icons/bi";
import { HeaderSection } from "./sections/HeaderSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { OverlaySection } from "./sections/OverlaySection";
import "./PremiumSubscription.scss";

export function PremiumSubscriptionView({ isActive, toggleMenu, currentUser }) {
  return (
    <>
      <div className={`PremiumSubscription ${isActive ? "is-active" : ""}`}>
        <HeaderSection toggleMenu={toggleMenu} />
        <FeaturesSection />
      </div>
      <OverlaySection isActive={isActive} toggleMenu={toggleMenu} />
    </>
  );
}