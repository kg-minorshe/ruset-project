import { 
  BiSun, 
  BiMenu, 
  BiMoon, 
} from "react-icons/bi";

export const MenuButton = ({ 
  onClick, 
  title, 
  icon, 
  text, 
  isActive = false,
  className = '' 
}) => {
  return (
    <li className={`${isActive ? 'is-active' : ''} ${className}`}>
      <a
        href="#"
        role="button"
        onClick={onClick}
        data-title={title}
      >
        <span className="is-icon">
          {icon}
        </span>
        <span className="linkText">{text}</span>
      </a>
    </li>
  );
};

export const ThemeToggleButton = ({ isDarkTheme, onToggle, isExpanded }) => {
  const themeIcon = isDarkTheme ? <BiSun /> : <BiMoon />;
  const themeText = isDarkTheme ? "Светлая тема" : "Темная тема";

  return (
    <MenuButton
      onClick={onToggle}
      title={themeText}
      icon={themeIcon}
      text={isExpanded ? themeText : ''}
    />
  );
};

export const Logo = () => {
  return (
    <div className="logo">
      <a
        href="https://whilet.ru"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/assets/images/w-blue.svg" alt="ВАЙЛТ™ Logo" />
      </a>
    </div>
  );
};

export const MenuToggleButton = ({ isExpanded, onToggle }) => {
  return (
    <li>
      <a
        role="button"
        className="menu-btn"
        onClick={onToggle}
        data-title={isExpanded ? "Свернуть меню" : "Развернуть меню"}
      >
        <span className="is-icon">
          <BiMenu />
        </span>
        <span className="linkText">RuSet</span>
      </a>
    </li>
  );
};

export const BackgroundOverlay = ({ isActive, onClick }) => {
  return (
    <div
      className={`LeftPanel-bg-dark ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
    />
  );
};