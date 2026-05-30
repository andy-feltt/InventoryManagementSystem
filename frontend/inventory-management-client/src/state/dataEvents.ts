import { useEffect } from 'react';

const DATA_CHANGED_EVENT = 'inventory:data-changed';

export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

export function useDataRefresh(load: () => void | Promise<void>) {
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      void load();
    };

    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);
}
