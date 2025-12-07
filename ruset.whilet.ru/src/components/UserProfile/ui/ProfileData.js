import { hasSocialData, hasParticipantsCount } from "../utils/profileDataUtils";

export function ProfileData({ user, isCurrentUser }) {
  if (!user) return null;

  return (
    <div className="data">
      <DescriptionField user={user} />
      <SocialFields user={user} isCurrentUser={isCurrentUser} />
      <ParticipantsField user={user} />
    </div>
  );
}

function DescriptionField({ user }) {
  if (!user.description) return null;

  return (
    <div className="description">
      <small>Описание</small>
      <p>{user.description}</p>
    </div>
  );
}

function SocialFields({ user, isCurrentUser }) {
  if (!hasSocialData(user, isCurrentUser)) return null;

  return (
    <>
      <PhoneField user={user} />
      <EmailField user={user} />
    </>
  );
}

function PhoneField({ user }) {
  if (!user.social?.phone) return null;

  return (
    <div className="phone">
      <small>Номер телефона</small>
      <p>{user.social.phone}</p>
    </div>
  );
}

function EmailField({ user }) {
  if (!user.social?.email) return null;

  return (
    <div className="email">
      <small>Email</small>
      <p>{user.social.email}</p>
    </div>
  );
}

function ParticipantsField({ user }) {
  if (!hasParticipantsCount(user)) return null;

  return (
    <div className="phone">
      <small>Количество участников</small>
      <p>{user.participants_count}</p>
    </div>
  );
}