import { httpRSCap } from "@/utils/http";
import { storageService } from "./storageService";
import { userCache } from "../utils/userCache";

export const authService = {
  async fetchTokenCode(code) {
    try {
      const response = await httpRSCap(
        `${process.env.NEXT_PUBLIC_URL_API_MAIN}/v2/profile/id/ruset/getToken?code=${code}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      if (response.ok && data?.data?.token) {
        await storageService.saveToken(data.data.token);
        return data.data.token;
      } else {
        throw new Error("Token not found in response");
      }
    } catch (error) {
      console.error("Error in fetchTokenCode:", error);
      this.redirectToAuth();
      throw error;
    }
  },

  async fetchCurrentUser() {
    const response = await httpRSCap(
      `${process.env.NEXT_PUBLIC_URL_API_MAIN}/v2/ruset/chat/getCurrentUser`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Origin: "https://whilet.ru",
          Referer: "https://whilet.ru",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch current user");
    }

    const data = await response.json();
    return data.data;
  },

  redirectToAuth() {
    document.location.href = `https://id.whilet.ru?redirect_uri=${process.env.NEXT_PUBLIC_URL_API_MAIN}/v3/profile/auth/ruset`;
  },

  async handleAuthError(error) {
    const cachedUser = await userCache.getCachedCurrentUser();
    if (!cachedUser) {
      this.redirectToAuth();
    }
    throw error;
  }
};