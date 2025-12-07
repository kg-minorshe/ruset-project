"use client";
import { useState } from "react";
import { UserProfileView } from "./UserProfileView";
import { useUserProfile } from "./hooks/useUserProfile";
import { useProfileActions } from "./hooks/useProfileActions";
import "./UserProfile.scss";

export function UserProfile({
  isExpandedProfile,
  setIsExpandedProfile,
  setUserProfile,
  userProfile,
  currentUser,
  setCurrentUser,
}) {
  const [imgMask, setImgMask] = useState(true);
  const { displayUser, isCurrentUser } = useUserProfile({ userProfile, currentUser });
  const { handleBackClick, handleEditClick, handleExternalClick, handleShareLogin } = useProfileActions({
    userProfile,
    currentUser,
    setIsExpandedProfile,
  });

  const profileData = {
    displayUser,
    isCurrentUser,
    imgMask,
    isExpandedProfile,
  };

  const actions = {
    setImgMask,
    handleBackClick,
    handleEditClick,
    handleExternalClick,
    handleShareLogin,
    toggleMenu: () => setIsExpandedProfile(!isExpandedProfile),
  };

  return (
    <UserProfileView
      profileData={profileData}
      actions={actions}
    />
  );
}