import type { CategoryTreeNode } from '../api/category';

export type CategoryOption = {
  id: number;
  name: string;
  label: string;
  level: number;
  isLeaf: boolean;
  path?: string;
  searchText: string;
  breadcrumb: string;
};

export const flattenCategoryTree = (
  nodes: CategoryTreeNode[],
  depth = 0,
  ancestors: string[] = [],
): CategoryOption[] => {
  return nodes.flatMap((node) => {
    const children = node.children ?? [];
    const pathParts = [...ancestors, node.name];

    const prefix = depth === 0 ? '' : `${'-'.repeat(depth)} `;

    const current: CategoryOption = {
      id: node.id,
      name: node.name,
      label: `${prefix}${node.name}`,
      level: depth,
      isLeaf: children.length === 0,
      path: node.path,
      searchText: pathParts.join(' ').toLowerCase(),
      breadcrumb: pathParts.join(' / '),
    };

    return [current, ...flattenCategoryTree(children, depth + 1, pathParts)];
  });
};
