import { useState, useEffect, useCallback } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        try {
          setState(JSON.parse(item));
        } catch {
          if (item === 'true') setState(true as unknown as T);
          else if (item === 'false') setState(false as unknown as T);
          else setState(item as unknown as T);
        }
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue === null) {
          setState(initialValue);
        } else {
          try {
            setState(JSON.parse(e.newValue));
          } catch {
            if (e.newValue === 'true') setState(true as unknown as T);
            else if (e.newValue === 'false') setState(false as unknown as T);
            else setState(e.newValue as unknown as T);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setState((prevState) => {
        const valueToStore = value instanceof Function ? value(prevState) : value;
        if (typeof window !== 'undefined') {
          try {
            if (valueToStore === null || valueToStore === undefined) {
              window.localStorage.removeItem(key);
            } else {
              const serialized =
                typeof valueToStore === 'string'
                  ? valueToStore
                  : JSON.stringify(valueToStore);
              window.localStorage.setItem(key, serialized);
            }
          } catch (error: any) {
            const isQuotaExceeded =
              error instanceof DOMException &&
              (error.code === 22 ||
                error.code === 1014 ||
                error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
            console.warn(
              `Error setting localStorage key "${key}" (${isQuotaExceeded ? 'Quota Exceeded' : 'Storage Blocked'}):`,
              error
            );
            window.dispatchEvent(
              new CustomEvent('ytu:storage-error', {
                detail: { key, isQuotaExceeded }
              })
            );
          }
        }
        return valueToStore;
      });
    },
    [key]
  );

  return [state, setValue, isMounted] as const;
}

