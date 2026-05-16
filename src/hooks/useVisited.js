import { useState, useEffect } from 'react';

export function useVisited(dataUrl) {
  const [visited, setVisited] = useState(new Set());

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => r.json())
      .then((arr) => setVisited(new Set(arr)))
      .catch(() => {});
  }, [dataUrl]);

  return { visited };
}
