import { useCallback, useMemo, useRef, useState } from "react";
import { validateValue } from "@uiprotocol/core";
import type { FunctionCall } from "@uiprotocol/core";
import { useRuntimeContext, useSurfaceContext } from "../context";
import { useDataBinding } from "./useDataBinding";

export interface UseFormBindingOptions {
  path: string;
  checks?: FunctionCall[];
  pattern?: string;
}

export function useFormBinding(options: UseFormBindingOptions) {
  const { runtime, onClientError } = useRuntimeContext();
  const surfaceContext = useSurfaceContext();
  const { value, setValue, path } = useDataBinding(options.path);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<string | null>(null);

  const surface = useMemo(
    () => runtime.getSurface(surfaceContext.surfaceId),
    [runtime, surfaceContext.surfaceId]
  );

  const validate = useCallback(
    (nextValue: unknown) => {
      const result = validateValue(
        {
          value: nextValue,
          checks: options.checks,
          pattern: options.pattern,
          dataModel: surface?.dataModel ?? {},
          scopePath: surfaceContext.scopePath
        },
        runtime.functionRegistry
      );

      const nextError = result.ok ? null : result.errors[0].message;
      errorRef.current = nextError;
      setError(nextError);

      if (!result.ok) {
        for (const item of result.errors) {
          onClientError?.({
            ...item,
            surfaceId: surfaceContext.surfaceId,
            path
          });
        }
      }

      return result;
    },
    [
      options.checks,
      options.pattern,
      surface,
      surfaceContext.scopePath,
      surfaceContext.surfaceId,
      runtime,
      onClientError,
      path
    ]
  );

  const onChange = useCallback(
    (nextValue: unknown) => {
      const result = validate(nextValue);
      if (result.ok) {
        setValue(nextValue);
      }
      return result;
    },
    [validate, setValue]
  );

  return {
    value,
    error,
    errorRef,
    onChange,
    validate,
    setValue
  };
}
