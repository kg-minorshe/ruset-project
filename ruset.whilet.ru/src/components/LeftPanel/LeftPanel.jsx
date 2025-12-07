import { LeftPanelContainer } from "./LeftPanelContainer";
import "./LeftPanel.scss";

export function LeftPanel({
  isExpandedMenu,
  setIsExpandedMenu,
  setIsExpandedNewChats,
  isExpandedNewChats,
  isExpandedChat,
  setIsExpandedChat,
  setIsExpandedProfile,
  isExpandedProfile,
  setUserProfile,
  setSelectedChat,
  setIsExpandedGift,
  isExpandedGift,
  currentUser,
  onUserUpdate
}) {
  return (
    <LeftPanelContainer
      isExpandedMenu={isExpandedMenu}
      setIsExpandedMenu={setIsExpandedMenu}
      setIsExpandedNewChats={setIsExpandedNewChats}
      isExpandedNewChats={isExpandedNewChats}
      isExpandedChat={isExpandedChat}
      setIsExpandedChat={setIsExpandedChat}
      setIsExpandedProfile={setIsExpandedProfile}
      isExpandedProfile={isExpandedProfile}
      setUserProfile={setUserProfile}
      setSelectedChat={setSelectedChat}
      setIsExpandedGift={setIsExpandedGift}
      isExpandedGift={isExpandedGift}
      currentUser={currentUser}
      onUserUpdate={onUserUpdate}
    />
  );
}