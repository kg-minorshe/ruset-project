import { BiArrowBack, BiGift } from "react-icons/bi";

export function HeaderSection({ toggleMenu }) {
  return (
    <div className="avatar">
      <div className="headerBtns">
        <div>
          <span onClick={toggleMenu}>
            <BiArrowBack />
          </span>
        </div>
      </div>
      <div className="bg">
        <span className="is-icon">
          <BiGift />
        </span>
        <div className="logo"></div>
      </div>
      <div className="title">
        <span className="name">Premium Подписка</span>
        <span className="description">
          Выделись на фоне других при помощи крутого функционала и
          дополнительных возможностей
        </span>
      </div>
    </div>
  );
}