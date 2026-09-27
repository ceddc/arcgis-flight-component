/**
 * Restore settings temporarily borrowed from a caller-owned ArcGIS view.
 * Teardown writes the saved value only when the current setting still equals
 * the component's applied value, preserving later caller changes.
 */
export interface BorrowedValueRestoreOptions<T> {
  current: T;
  applied: T;
  original: T;
  restore(value: T): void;
  equals?: (left: T, right: T) => boolean;
}

/**
 * Restore a temporarily borrowed host value without overwriting a newer host decision.
 *
 * @param options Values captured before and after applying this component's setting,
 * plus the callback that restores the original value.
 * @returns `true` when the original value was restored, or `false` when the host
 * changed the setting and therefore still owns the current value.
 */
export function restoreBorrowedValue<T>(
  options: BorrowedValueRestoreOptions<T>,
): boolean {
  const equals = options.equals ?? Object.is;
  if (!equals(options.current, options.applied)) return false;
  options.restore(options.original);
  return true;
}
