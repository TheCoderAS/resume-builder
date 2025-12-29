import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analytics, analyticsReady } from "../firebase.js";

export default function useAnalyticsPageView() {
  const location = useLocation();

  useEffect(() => {
    let active = true;

    analyticsReady?.then(() => {
      if (!active || !analytics) {
        return;
      }
      import("firebase/analytics").then(({ logEvent }) => {
        logEvent(analytics, "screen_view", {
          screen_name: location.pathname,
        });
      });
    });

    return () => {
      active = false;
    };
  }, [location]);
}
