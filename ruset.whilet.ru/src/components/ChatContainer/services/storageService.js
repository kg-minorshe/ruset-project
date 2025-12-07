import { Preferences } from "@capacitor/preferences";

export const storageService = {
  async saveToken(token) {
    await Preferences.set({
      key: "WTOKEN",
      value: token,
    });
  },

  async getToken() {
    const result = await Preferences.get({ key: "WTOKEN" });
    return result.value;
  },

  async clearToken() {
    await Preferences.remove({ key: "WTOKEN" });
  }
};