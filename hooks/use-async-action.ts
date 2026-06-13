'use client';

import { useState, useCallback, useRef } from 'react';

export type AsyncActionState = 'idle' | 'loading' | 'success' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;

interface UseAsyncActionReturn<T extends AnyAsyncFn> {
  execute: (...args: Parameters<T>) => Promise<unknown>;
  state: AsyncActionState;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  reset: () => void;
}

export function useAsyncAction<T extends AnyAsyncFn>(
  action: T,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    successDuration?: number;
    errorDuration?: number;
  }
): UseAsyncActionReturn<T> {
  const [state, setState] = useState<AsyncActionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (...args: Parameters<T>): Promise<unknown> => {
    clearTimer();
    setState('loading');
    setError(null);

    try {
      const result = await action(...args);
      setState('success');
      options?.onSuccess?.();
      timerRef.current = setTimeout(() => {
        setState('idle');
      }, options?.successDuration ?? 2000);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      setState('error');
      setError(message);
      options?.onError?.(message);
      timerRef.current = setTimeout(() => {
        setState('idle');
        setError(null);
      }, options?.errorDuration ?? 3000);
      return undefined;
    }
  }, [action, options, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState('idle');
    setError(null);
  }, [clearTimer]);

  return {
    execute,
    state,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    error,
    reset,
  };
}
