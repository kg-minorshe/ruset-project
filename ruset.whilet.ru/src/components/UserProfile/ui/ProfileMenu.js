import { BiUser } from "react-icons/bi";
import { MENU_ITEMS } from "../constants/profileConstants";

export function ProfileMenu({ onMenuItemClick }) {
  return (
    <ul>
      {MENU_ITEMS.map((item, index) => (
        <MenuItem
          key={index}
          item={item}
          onMenuItemClick={onMenuItemClick}
        />
      ))}
    </ul>
  );
}

function MenuItem({ item, onMenuItemClick }) {
  return (
    <li>
      <a
        href="#"
        role="button"
        onClick={onMenuItemClick}
        data-title={item.title}
      >
        <span className="is-icon">
          <BiUser />
        </span>
        <span className="linkText">{item.text}</span>
      </a>
    </li>
  );
}