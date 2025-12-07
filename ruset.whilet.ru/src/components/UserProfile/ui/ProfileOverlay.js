export function ProfileOverlay({ isActive, onClick }) {
  return (
    <div
      className={`UserProfile-bg-dark ${isActive ? "is-active" : ""}`}
      onClick={onClick}
    />
  );
}