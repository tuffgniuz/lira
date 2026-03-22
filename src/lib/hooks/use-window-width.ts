import { useEffect, useState } from "react";

function getWindowWidth() {
  if (typeof window === "undefined") {
    return 1440;
  }

  return window.innerWidth;
}

export function useWindowWidth() {
  const [windowWidth, setWindowWidth] = useState(getWindowWidth);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return windowWidth;
}
