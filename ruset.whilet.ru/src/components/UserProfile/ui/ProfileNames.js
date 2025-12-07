export function ProfileNames({ user, onShareLogin }) {
  if (!user) return null;

  return (
    <div className="names">
      <span className="username">{user.username}</span>
      <span className="login" onClick={() => onShareLogin(user.login)}>
        @{user.login}
      </span>
    </div>
  );
}