export function OverlaySection({ isActive, toggleMenu }) {
  return (
    <div
      className={`PremiumSubscription-bg-dark ${isActive ? "is-active" : ""}`}
      onClick={toggleMenu}
    />
  );
}