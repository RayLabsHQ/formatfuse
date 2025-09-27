import { allTools } from "../data/tools";

/**
 * Get the correct route for a tool by its ID
 * @param toolId The tool ID
 * @returns The route path or default /tools/{id} if not found
 */
export function getToolRoute(toolId: string): string {
  const tool = allTools.find((t) => t.id === toolId);

  if (!tool) {
    // Fallback to the tools directory when we don't recognize the id
    return "/tools";
  }

  // Prefer explicit routes and hrefs, otherwise fall back to the canonical tools path
  return tool.route || tool.href || `/tools/${toolId}`;
}

/**
 * Check if a tool exists in the registry
 * @param toolId The tool ID
 * @returns true if the tool exists and is implemented
 */
export function toolExists(toolId: string): boolean {
  const tool = allTools.find((t) => t.id === toolId);
  return tool ? tool.isImplemented !== false : false;
}
