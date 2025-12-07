import { shareLinkModal } from "../utils/shareLinkModal";
import { getProfileUrls } from "../utils/urlUtils";

export function useProfileActions({
  userProfile,
  currentUser,
  setIsExpandedProfile,
}) {
  const handleBackClick = () => {
    setIsExpandedProfile(false);
  };

  const handleEditClick = () => {
    window.open("https://profile.whilet.ru/my/setting", "_blank");
  };

  const handleExternalClick = () => {
    const login = userProfile ? userProfile.login : currentUser?.login;
    const url = getProfileUrls(login).external;
    window.open(url, "_blank");
  };

  const handleShareLogin = (login) => {
    shareLinkModal(login);
  };

  return {
    handleBackClick,
    handleEditClick,
    handleExternalClick,
    handleShareLogin,
  };
}