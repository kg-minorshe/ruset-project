import { PROFILE_BASE_URL } from "../constants/profileConstants";

export function getProfileUrls(login) {
  const baseUrl = PROFILE_BASE_URL;
  
  return {
    settings: `${baseUrl}/my/setting`,
    external: `${baseUrl}/${login || "my"}`,
  };
}