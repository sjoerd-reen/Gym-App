import { useEffect, useState } from "react";
import { getImageUrlFromFirestore } from "@/src/lib/firebase";

export function useResolvedImage(url?: string | null): string | undefined {
  const [src, setSrc] = useState<string | undefined>(
    url && !url.startsWith("firestore://") ? url : undefined
  );
  useEffect(() => {
    let active = true;
    if (!url) {
      setSrc(undefined);
    } else if (url.startsWith("firestore://")) {
      getImageUrlFromFirestore(url).then(res => {
        if (active) setSrc(res ?? undefined);
      });
    } else {
      setSrc(url);
    }
    return () => {
      active = false;
    };
  }, [url]);
  return src;
}
