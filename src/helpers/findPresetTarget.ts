export interface PresetTarget {
  target: string;
  converter: string;
  value: string;
}

export function findPresetTarget<T extends PresetTarget>(
  targets: T[],
  defaultTo: string | null,
  defaultConverter: string | null,
): T | undefined {
  if (!defaultTo) return undefined;
  return targets.find((t) =>
    defaultConverter
      ? t.target === defaultTo && t.converter === defaultConverter
      : t.target === defaultTo,
  );
}
