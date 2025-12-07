import { BiArrowBack, BiEditAlt, BiQr, BiLinkExternal } from "react-icons/bi";
import { PROFILE_URLS } from "../constants/profileConstants";

export function ProfileHeader({ isCurrentUser, userProfile, onBackClick, onEditClick, onExternalClick }) {
  return (
    <div className="headerBtns">
      <div>
        <span onClick={onBackClick}>
          <BiArrowBack />
        </span>
      </div>
      <div>
        <span>
          <BiQr />
        </span>
        {!userProfile && (
          <span>
            <BiEditAlt onClick={onEditClick} />
          </span>
        )}
        <span onClick={onExternalClick}>
          <BiLinkExternal />
        </span>
      </div>
    </div>
  );
}