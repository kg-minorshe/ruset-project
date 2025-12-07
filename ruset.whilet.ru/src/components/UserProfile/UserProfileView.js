import { ProfileHeader } from "./ui/ProfileHeader";
import { ProfileAvatar } from "./ui/ProfileAvatar";
import { ProfileData } from "./ui/ProfileData";
import { ProfileNames } from "./ui/ProfileNames";
import { ProfileMenu } from "./ui/ProfileMenu";
import { ProfileOverlay } from "./ui/ProfileOverlay";

export function UserProfileView({ profileData, actions }) {
  const { isExpandedProfile, displayUser, isCurrentUser, imgMask } = profileData;

  return (
    <>
      <div className={`UserProfile ${isExpandedProfile ? "is-active" : ""}`}>
        <div className="avatar">
          <ProfileHeader
            isCurrentUser={isCurrentUser}
            userProfile={displayUser}
            onBackClick={actions.handleBackClick}
            onEditClick={actions.handleEditClick}
            onExternalClick={actions.handleExternalClick}
          />
          
          <ProfileAvatar
            user={displayUser}
            imgMask={imgMask}
            onImageLoad={() => actions.setImgMask(false)}
            onImageError={() => actions.setImgMask(true)}
          />
          
          <ProfileNames
            user={displayUser}
            onShareLogin={actions.handleShareLogin}
          />
        </div>

        <ProfileData user={displayUser} isCurrentUser={isCurrentUser} />

        {isCurrentUser && <ProfileMenu onMenuItemClick={actions.toggleMenu} />}
      </div>

      <ProfileOverlay
        isActive={isExpandedProfile}
        onClick={actions.toggleMenu}
      />
    </>
  );
}