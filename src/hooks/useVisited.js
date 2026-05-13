import { useState, useCallback } from 'react';

export function useVisited(storageKey) {
  const [visited, setVisited] = useState(() => {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return new Set(data);
  });

  const toggle = useCallback((name) => {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }, [storageKey]);

  const resetAll = useCallback(() => {
    if (confirm('Are you sure you want to reset all visited sites? This action cannot be undone.')) {
      setVisited(new Set());
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const loadFromArray = useCallback((arr) => {
    setVisited(new Set(arr));
  }, []);

  return { visited, toggle, resetAll, loadFromArray };
}
