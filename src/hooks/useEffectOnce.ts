import { EffectCallback, useEffect } from 'react';

export function useEffectOnce(effect?: EffectCallback): void {
  useEffect(() => {
    effect?.();
  }, []);
}
