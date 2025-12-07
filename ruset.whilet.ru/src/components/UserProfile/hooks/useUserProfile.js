export function useUserProfile({ userProfile, currentUser }) {
  const displayUser = userProfile || currentUser;
  const isCurrentUser = !userProfile;

  return {
    displayUser,
    isCurrentUser,
  };
}