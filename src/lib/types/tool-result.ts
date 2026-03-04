export type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; source: string };
