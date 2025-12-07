import { BiX } from "react-icons/bi";
import "./ReplyBox.scss";

export function ReplyBox({ reply_to, chatInfo, onCancelReply }) {
  if (!reply_to) return null;

  const userMessage = chatInfo.participants.filter((e) => {
    return e.id === reply_to.user_id;
  });

  return (
    <div className="ReplyBox">
      <div className="left">
        <i className="bx bx-reply is-1"></i>
        <div className="is-2">
          <div className="name">
            {reply_to.sender === "me" ? "Вы" : userMessage[0].username}
            <span>@{userMessage[0].login}</span>
          </div>
          <div className="text">
            {reply_to.text.length > 30
              ? `${reply_to.text.slice(0, 30)}...`
              : reply_to.text}
          </div>
        </div>
      </div>
      <div className="right">
        <span onClick={onCancelReply}>
          <BiX />
        </span>
      </div>
    </div>
  );
}
