// FormBottom/components/EmojiButton.jsx
import { BiSmile } from "react-icons/bi";

const EmojiButton = ({ onClick, disabled }) => {
  return (
    <span
      className={`smile-icon ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
    >
      <BiSmile />
    </span>
  );
};

export default EmojiButton;
