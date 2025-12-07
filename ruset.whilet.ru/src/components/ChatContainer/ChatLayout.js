import { LeftPanel } from "@/components/LeftPanel/LeftPanel";
import { UserProfile } from "@/components/UserProfile/UserProfile";
import { PremiumSubscription } from "@/components/PremiumSubscription/PremiumSubscription";
import { ChatList } from "@/components/Chat/ChatList/ChatList";
import { NewChats } from "@/components/Chat/NewChats/NewChats";
import { ChatComponent } from "@/components/Chat/ChatComponent/ChatComponent";
import { FullscreenViewer } from "@/components/FullscreenViewer/FullscreenViewer";
import { NoChatSelected } from "./NoChatSelected";

export const ChatLayout = ({
  state,
  actions,
  constants,
  searchParams
}) => {
  const {
    selectedChat,
    isExpandedMenu,
    isExpandedProfile,
    isExpandedGift,
    isExpandedNewChats,
    isExpandedChat,
    userProfile,
    fullscreenData,
    chatKey,
    isMobile
  } = state;

  const {
    setUserProfile,
    setSelectedChat,
    onChatSelect,
    setFullscreenData,
    toggleMenuNewChats
  } = actions;

  return (
    <div className="FlexContainer">
      <LeftPanel
        isExpandedMenu={isExpandedMenu}
        setIsExpandedMenu={actions.setIsExpandedMenu}
        setIsExpandedNewChats={actions.setIsExpandedNewChats}
        isExpandedNewChats={isExpandedNewChats}
        isExpandedChat={isExpandedChat}
        setIsExpandedChat={actions.setIsExpandedChat}
        setIsExpandedProfile={actions.setIsExpandedProfile}
        isExpandedProfile={isExpandedProfile}
        setUserProfile={setUserProfile}
        setSelectedChat={setSelectedChat}
        setIsExpandedGift={actions.setIsExpandedGift}
        isExpandedGift={isExpandedGift}
        currentUser={state.currentUser}
        onUserUpdate={() => actions.getCurrentUser(true)}
      />

      <UserProfile
        isExpandedProfile={isExpandedProfile}
        setIsExpandedProfile={actions.setIsExpandedProfile}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        currentUser={state.currentUser}
        setCurrentUser={actions.setCurrentUser}
        onUserUpdate={() => actions.getCurrentUser(true)}
      />

      <PremiumSubscription
        isExpandedGift={isExpandedGift}
        setIsExpandedGift={actions.setIsExpandedGift}
        currentUser={state.currentUser}
        onUserUpdate={() => actions.getCurrentUser(true)}
      />

      <ChatList
        onChatSelect={onChatSelect}
        selectedChatId={selectedChat?.id}
        isExpandedMenu={isExpandedMenu}
        setIsExpandedMenu={actions.setIsExpandedMenu}
        isExpandedChat={isExpandedChat}
        setIsExpandedChat={actions.setIsExpandedChat}
        CHAT_TYPES={constants.CHAT_TYPES}
        setFullscreenData={setFullscreenData}
        currentUser={state.currentUser}
        toggleMenuNewChats={toggleMenuNewChats}
      />

      <NewChats
        isExpandedNewChats={isExpandedNewChats}
        setIsExpandedNewChats={actions.setIsExpandedNewChats}
        selectedChatId={selectedChat?.id}
        isExpandedMenu={isExpandedMenu}
        onChatSelect={onChatSelect}
        currentUser={state.currentUser}
      />

      {selectedChat ? (
        <ChatComponent
          key={`chat-${selectedChat.login}-${chatKey}`}
          currentUser={state.currentUser}
          setCurrentUser={actions.setCurrentUser}
          isExpandedMenu={isExpandedMenu}
          setIsExpandedMenu={actions.setIsExpandedMenu}
          chatData={selectedChat}
          setSelectedChat={setSelectedChat}
          isExpandedChat={isExpandedChat}
          setIsExpandedChat={actions.setIsExpandedChat}
          CHAT_TYPES={constants.CHAT_TYPES}
          USER_ROLES={constants.USER_ROLES}
          setUserProfile={setUserProfile}
          setFullscreenData={setFullscreenData}
        />
      ) : (
        <NoChatSelected
          isExpandedMenu={isExpandedMenu}
          isMobile={isMobile}
          isExpandedChat={isExpandedChat}
        />
      )}

      {fullscreenData && (
        <FullscreenViewer
          media={fullscreenData.media}
          currentIndex={fullscreenData.currentIndex}
          setCurrentIndex={(newIndex) => {
            setFullscreenData({
              ...fullscreenData,
              currentIndex: newIndex,
            });
          }}
          onClose={() => setFullscreenData(null)}
          groupCaption={fullscreenData.groupCaption}
        />
      )}

      <div className="bg-image-pattern is-system"></div>
    </div>
  );
};