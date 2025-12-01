import { useEffect } from "react";

export default function useClickOutside(ref, callback) {
  useEffect(() => {
    function handleClickOutside(event) {
      // if click is NOT inside the element → run callback
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, callback]);
}
