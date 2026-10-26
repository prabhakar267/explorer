import { useMemo } from 'react';
import { useJson } from './useJson';

const EMPTY = new Set();

export function useVisited(dataUrl) {
  const { data, error } = useJson(dataUrl);
  // Stable Set identity: ExplorerMap re-styles every marker whenever the
  // `visited` prop changes, so don't hand it a fresh Set each render.
  const visited = useMemo(() => (Array.isArray(data) ? new Set(data) : EMPTY), [data]);
  return { visited, error };
}
