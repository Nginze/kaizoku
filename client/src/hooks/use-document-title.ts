import { useEffect } from "react";

export function useDocumentTitle(title: string, retainOnUnmount = false) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    return () => {
      if (!retainOnUnmount) {
        document.title = previousTitle;
      }
    };
  }, [title, retainOnUnmount]);
}
