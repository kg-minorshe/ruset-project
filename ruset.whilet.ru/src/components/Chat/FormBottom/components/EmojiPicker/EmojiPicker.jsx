import { useState, useRef, useEffect } from "react";
import "../../FormBottom.scss";
import emojiCategories from "../../data/emoji.json";
import { getEmojiImageUrl } from "@/utils/emoji";
export function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef(null);

  // Закрытие пикера при клике вне его области
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="emoji-picker" ref={pickerRef}>
      <div className="emoji-categories">
        {emojiCategories.map((category, index) => (
          <button
            key={index}
            className={`emoji-category ${
              activeCategory === index ? "active" : ""
            }`}
            onClick={() => setActiveCategory(index)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {emojiCategories[activeCategory].emojis.map((emoji, index) => {
          const imageUrl = emoji.svg || getEmojiImageUrl(emoji.char);

          return (
            <button
              key={index}
              className="emoji-item"
              onClick={() => onSelect(emoji.char, imageUrl)}
              title={emoji.name}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={emoji.name}
                  className="emoji-svg"
                  loading="lazy"
                />
              ) : (
                <span className="emoji-char">{emoji.char}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
