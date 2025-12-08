import { useRef, useEffect } from "react";
import "./ReactionPicker.scss";
import { walert } from "@/utils/miniModal";
import { EmojiIcon } from "@/components/Chat/Emoji/EmojiIcon";
export function ReactionPicker({
  visible,
  messageId,
  x,
  y,
  onReactionSelect,
  onClose,
  currentUserReactions = [],
  isPremium = false,
}) {
  const pickerRef = useRef(null);

  const reactions = [
    "❤️",
    "👍",
    "👎",
    "😂",
    "😮",
    "😢",
    "😡",
    "🎉",
    "🔥",
    "⚡",
    "👏",
    "💯",
    "🤔",
    "😍",
    "🤗",
    "😊",
    "😎",
    "🤩",
    "😘",
    "🥰",
    "😭",
    "😤",
    "🤯",
    "🙄",
    "😴",
    "🤮",
    "🤢",
    "😷",
    "🤒",
    "🤕",
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        visible &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && visible) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, onClose]);

  const handleReactionClick = (emoji) => {
    const hasReaction = currentUserReactions.includes(emoji);
    const maxReactions = isPremium ? 5 : 1;

    // Если уже есть эта реакция - убираем её
    if (hasReaction) {
      onReactionSelect(messageId, emoji, "remove");
      onClose();
      return;
    }

    // Если достигнут лимит реакций и пытаемся добавить новую
    if (currentUserReactions.length >= maxReactions) {
      // Показываем уведомление о лимите
      walert(
        403,
        isPremium
          ? `Вы можете поставить максимум ${maxReactions} реакций на сообщение`
          : `Обычные пользователи могут поставить только 1 реакцию. Оформите премиум для 5 реакций!`
      );
      onClose();
      return;
    }

    // Добавляем новую реакцию
    onReactionSelect(messageId, emoji, "add");
    onClose();
  };

  const getAdjustedPosition = (x, y) => {
    if (!pickerRef.current) return { x, y };

    const pickerWidth = 320;
    const pickerHeight = 200;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const padding = 10;

    let adjustedX = x;
    let adjustedY = y;

    // Проверяем правую границу
    if (x + pickerWidth > windowWidth) {
      adjustedX = windowWidth - pickerWidth - padding;
    }

    // Проверяем левую границу
    if (adjustedX < padding) {
      adjustedX = padding;
    }

    // Проверяем нижнюю границу
    if (y + pickerHeight > windowHeight) {
      adjustedY = y - pickerHeight - 10;
    }

    // Проверяем верхнюю границу
    if (adjustedY < padding) {
      adjustedY = padding;
    }

    return { x: adjustedX, y: adjustedY };
  };

  if (!visible) return null;

  const adjustedPosition = getAdjustedPosition(x, y);

  return (
    <div className="ReactionPicker">
      <div
        ref={pickerRef}
        className="reaction-picker-container"
        style={{
          top: `${adjustedPosition.y}px`,
          left: `${adjustedPosition.x}px`,
        }}
      >
        <div className="reaction-grid">
          {reactions.map((emoji) => {
            const hasReaction = currentUserReactions.includes(emoji);
            return (
              <button
                key={emoji}
                className={`reaction-item ${hasReaction ? "has-reaction" : ""}`}
                onClick={() => handleReactionClick(emoji)}
                title={
                  hasReaction
                    ? `Убрать реакцию ${emoji}`
                    : `Добавить реакцию ${emoji}`
                }
              >
                <EmojiIcon emoji={emoji} className="reaction-emoji" size={24} />
                {hasReaction && <span className="reaction-indicator">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
