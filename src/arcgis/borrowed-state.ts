export interface BorrowedValueRestoreOptions<T> {
  current: T;
  applied: T;
  original: T;
  restore(value: T): void;
  equals?: (left: T, right: T) => boolean;
}

/** Restore a borrowed setting only if the host has not changed it during the flight. */
export function restoreBorrowedValue<T>(
  options: BorrowedValueRestoreOptions<T>,
): boolean {
  const equals = options.equals ?? Object.is;
  if (!equals(options.current, options.applied)) return false;
  options.restore(options.original);
  return true;
}
