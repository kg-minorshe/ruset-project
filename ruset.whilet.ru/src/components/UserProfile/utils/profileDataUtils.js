export function hasSocialData(user, isCurrentUser) {
  if (!user?.social) return false;
  
  if (isCurrentUser) {
    return !!(user.social.phone || user.social.email);
  }
  
  return !!(user.social.phone || user.social.email);
}

export function hasParticipantsCount(user) {
  return !!user?.participants_count;
}

export function hasDescription(user) {
  return !!user?.description;
}