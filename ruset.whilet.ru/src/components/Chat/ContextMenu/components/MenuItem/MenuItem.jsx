import { memo } from "react";

const MenuItem = memo(({ onClick, children, icon: Icon, disabled = false }) => (
  <li
    onClick={disabled ? undefined : onClick}
    style={{ opacity: disabled ? 0.6 : 1 }}
    className={disabled ? "disabled" : ""}
  >
    <span className="menuIcon">{Icon && <Icon />}</span>
    {children}
  </li>
));

export default MenuItem;
