export function selectionState(checked: boolean[]) {
  const count = checked.filter(Boolean).length;
  const all = checked.length > 0 && count === checked.length;
  return { count, all, some: count > 0 && !all };
}

export function arrowPath(collapsed: boolean): string {
  return collapsed
    ? '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />'
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />';
}

export function deleteConfirmMessage(count: number): string {
  return `Are you sure you want to delete ${count} job(s)? This action cannot be undone.`;
}

export function deleteResultMessage(result: {
  success: boolean;
  deleted?: number;
  failed?: number;
}): {
  message: string;
  reload: boolean;
} {
  const deleted = result.deleted ?? 0;
  const failedCount = result.failed ?? 0;
  if (result.success || deleted > 0) {
    const failed = failedCount > 0 ? ` Failed to delete ${failedCount} job(s).` : "";
    return { message: `Successfully deleted ${deleted} job(s).${failed}`, reload: true };
  }
  return { message: "Failed to delete jobs. Please try again.", reload: false };
}
