import { memo } from "react";
import MenuItem from "../MenuItem/MenuItem";
import {
  BiEdit,
  BiTrash,
  BiReply,
  BiPin,
  BiCopy,
  BiSelectMultiple,
  BiDownload,
} from "react-icons/bi";

const MenuItems = memo(
  ({
    canEdit,
    canDelete,
    hasText,
    hasMedia,
    onReply,
    onEdit,
    onCopy,
    onPin,
    onSelect,
    onDelete,
    onDownload,
    isPinned,
  }) => (
    <ul>
      <MenuItem onClick={onReply} icon={BiReply}>
        Ответить
      </MenuItem>

      {canEdit && (
        <MenuItem onClick={onEdit} icon={BiEdit}>
          Изменить
        </MenuItem>
      )}

      {hasText && (
        <MenuItem onClick={onCopy} icon={BiCopy}>
          Копировать текст
        </MenuItem>
      )}

      <MenuItem onClick={onPin} icon={BiPin}>
        {isPinned ? "Открепить" : "Закрепить"}
      </MenuItem>

      <MenuItem onClick={onSelect} icon={BiSelectMultiple}>
        Выбрать
      </MenuItem>

      {hasMedia && (
        <MenuItem onClick={onDownload} icon={BiDownload}>
          Скачать медиа
        </MenuItem>
      )}

      {canDelete && (
        <MenuItem onClick={onDelete} icon={BiTrash}>
          Удалить
        </MenuItem>
      )}
    </ul>
  )
);

export default MenuItems;
