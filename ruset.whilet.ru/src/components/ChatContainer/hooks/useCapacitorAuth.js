import { App } from "@capacitor/app";
import { authService } from "../services/authService";

export const useCapacitorAuth = ({ actions }) => {
  const initializeCapacitorAuth = () => {
    let appUrlOpenListener;

    const handleAuthUrl = (url) => {
      if (url.startsWith("ruset://auth")) {
        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get("code");
          if (code) {
            authService.fetchTokenCode(code).then(() => {
              actions.getCurrentUser(true);
            });
          }
        } catch (e) {
          console.error("Error parsing URL:", e);
        }
      }
    };

    const setupAppUrlOpenListener = async () => {
      try {
        appUrlOpenListener = await App.addListener("appUrlOpen", (event) => {
          handleAuthUrl(event.url);
        });
      } catch (e) {
        console.error("Failed to add appUrlOpen listener:", e);
      }
    };

    App.getLaunchUrl()
      .then((result) => {
        if (result?.url) {
          handleAuthUrl(result.url);
        }
      })
      .catch(console.error);

    setupAppUrlOpenListener();

    return () => {
      if (appUrlOpenListener) {
        appUrlOpenListener.remove().catch(console.error);
      }
    };
  };

  return { initializeCapacitorAuth };
};