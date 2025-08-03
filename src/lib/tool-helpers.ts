import { allTools } from "../data/tools";

/**
 * Get the correct route for a tool by its ID
 * @param toolId The tool ID
 * @returns The route path or default /tools/{id} if not found
 */
export function getToolRoute(toolId: string): string {
  const tool = allTools.find((t) => t.id === toolId);
  
  if (!tool) {
    // Default fallback for tools not in registry
    return `/tools/${toolId}`;
  }
  
  // Use the tool's route if defined, otherwise check href, 
  // otherwise default to /tools/{id}
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