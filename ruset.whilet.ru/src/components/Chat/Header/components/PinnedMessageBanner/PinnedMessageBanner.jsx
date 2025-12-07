import React from "react";
import { BiPin, BiChevronUp, BiChevronDown, BiX } from "react-icons/bi";

const PinnedMessageBanner = ({
  currentPinnedMessage,
  currentPinnedIndex,
  pinnedMessages,
  onScrollToPinned,
  onNextPinned,
  onPrevPinned,
  onClosePinnedBanner,
}) => {
  return (
    <div
      className="pinned-message-banner"
      onClick={() => onScrollToPinned(currentPinnedMessage.id)}
    >
      <BiPin className="pin-icon" />
      <div className="pinned-content">
        <div className="pinned-author">
          {currentPinnedMessage.sender === "me"
            ? "Вы"
            : currentPinnedMessage.username}
        </div>
        <div className="pinned-text">{currentPinnedMessage.text}</div>
      </div>
      <div className="pinned-navigation">
        {pinnedMessages.length > 1 && (
          <>
            <div
              className={`nav-button ${
                currentPinnedIndex === 0 ? "disabled" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onPrevPinned();
              }}
            >
              <BiChevronUp />
            </div>
            <div className="pinned-counter">
              {currentPinnedIndex + 1}/{pinnedMessages.length}
            </div>
            <div
              className={`nav-button ${
                currentPinnedIndex === pinnedMessages.length - 1
                  ? "disabled"
                  : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onNextPinned();
              }}
            >
              <BiChevronDown />
            </div>
          </>
        )}
      </div>
      <div
        className="close-button"
        onClick={(e) => {
          e.stopPropagation();
          onClosePinnedBanner();
        }}
      >
        <BiX />
      </div>
    </div>
  );
};

export default React.memo(PinnedMessageBanner);
