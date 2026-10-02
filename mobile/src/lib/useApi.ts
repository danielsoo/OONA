import { useCallback, useEffect, useRef, useState } from "react";

type State<T> = { data: T | null; error: Error | null; loading: boolean };

/**
 * Loads data for a screen. `key` changes reload it; a null key skips loading
 * (for example while signed out). `refresh` reloads for pull-to-refresh.
 */
export function useApi<T>(key: string | null, loader: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: key !== null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const run = useCallback(async () => {
    if (key === null) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === requestId.current) {
        setState((prev) => ({ ...prev, error: error as Error, loading: false }));
      }
    }
  }, [key]);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, refresh: run };
}
