/** READ projection (CQRS) of a category node, with the computed leaf flag. */
export interface CategoryDTO {
  id: string
  name: string
  parentId: string | null
  // true when the node has no children — only leaves can be chosen for a match.
  isLeaf: boolean
}
