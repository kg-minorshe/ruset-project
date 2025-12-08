import { memo } from "react";
import { BiDotsHorizontalRounded } from "react-icons/bi";
import { EmojiIcon } from "@/components/Chat/Emoji/EmojiIcon";

const ReactionSection = memo(
  ({ reactions, currentUserReactions, onReactionClick, onShowMore }) => (
    <ul>
      <hr />
      <li className="is-smiles">
        {reactions.map((emoji) => (
          <span
            key={emoji}
            className={currentUserReactions.includes(emoji) ? "active-reaction" : ""}
            onClick={() => onReactionClick(emoji)}
            title={currentUserReactions.includes(emoji) ? `Убрать ${emoji}` : `Добавить ${emoji}`}
          >
            <EmojiIcon emoji={emoji} className="reaction-emoji" size={18} />
          </span>
        ))}
        {onShowMore && (
          <span className="is-dotted" onClick={onShowMore}>
            <BiDotsHorizontalRounded />
          </span>
        )}
      </li>
    </ul>
  )
);

export default ReactionSection;