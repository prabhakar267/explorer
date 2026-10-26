import { useState, useEffect } from 'react';

// Fetch a static JSON file and expose { data, error, loading }.
//
// Replaces three hand-rolled fetch effects that shared the same gaps:
// - none checked `response.ok`, so a 404 (HTML body) surfaced as a JSON parse
//   error, which was then swallowed — the spinner disappeared and the page
//   showed an empty map with "Loading..." in the stats forever;
// - none aborted on unmount or URL change, so a slow response for the previous
//   URL could land after the new one and overwrite it.
export function useJson(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
        return res.json();
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error(`Error loading ${url}:`, err);
        setState({ data: null, error: err, loading: false });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
