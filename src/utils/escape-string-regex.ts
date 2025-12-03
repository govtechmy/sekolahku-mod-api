// Utility function to escape special characters in regex
export function escapeStringRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}