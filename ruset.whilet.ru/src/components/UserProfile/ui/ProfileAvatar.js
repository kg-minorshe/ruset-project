export function ProfileAvatar({ user, imgMask, onImageLoad, onImageError }) {
  if (!user) return null;

  return (
    <img
      key={user.avatar}
      src={user.avatar}
      style={{ opacity: imgMask ? "0" : "1" }}
      onLoad={onImageLoad}
      onError={onImageError}
      alt=""
    />
  );
}