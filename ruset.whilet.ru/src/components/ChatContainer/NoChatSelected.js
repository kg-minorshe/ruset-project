export const NoChatSelected = ({ isExpandedMenu, isMobile, isExpandedChat }) => {
  return (
    <div
      className={`no-chat-selected ${isExpandedMenu ? "is-active" : ""} ${
        !isMobile ? (!isExpandedChat ? "is-active-2" : "") : ""
      }`}
    >
      <div className="no-chat-content">
        <p>Выберите, кому хотели бы написать</p>
      </div>
    </div>
  );
};