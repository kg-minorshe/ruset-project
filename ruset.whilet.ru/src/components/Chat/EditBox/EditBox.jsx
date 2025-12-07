import { BiX } from "react-icons/bi";
import "./EditBox.scss";

export function EditBox({
  message,
  onCancelEdit,
  onSaveEdit,
  editText,
  setEditText,
}) {
  if (!message) return null;

  return (
    <div className="EditBox">
      <div className="left">
        <i className="bx bx-reply is-1"></i>
        <div className="is-2">
          <div className="name">Редактирование сообщения</div>
          <div className="text">
            {editText?.length > 30
              ? `${editText.slice(0, 30)}...`
              : editText || "-"}
          </div>
        </div>
      </div>
      <div className="right">
        <span onClick={onCancelEdit}>
          <BiX />
        </span>
      </div>
    </div>
  );
}
