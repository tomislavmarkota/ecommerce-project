import { useMemo, useState } from 'react';
import type { CategoryTreeNode } from '../../api/category';
import styles from './publicCatalogFilters.module.scss';

type PublicCatalogFiltersProps = {
  categoryTree: CategoryTreeNode[];
  selectedCategoryId: number | null;
  onCategoryChange: (categoryId: number | null) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  totalProducts?: number;
};

const filterTree = (nodes: CategoryTreeNode[], query: string): CategoryTreeNode[] => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return nodes;

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children ?? [], query);

      const selfMatches =
        node.name.toLowerCase().includes(normalized) ||
        node.slug.toLowerCase().includes(normalized) ||
        node.path.toLowerCase().includes(normalized);

      if (selfMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter(Boolean) as CategoryTreeNode[];
};

export default function PublicCatalogFilters({
  categoryTree,
  selectedCategoryId,
  onCategoryChange,
  searchValue,
  onSearchChange,
  totalProducts,
}: PublicCatalogFiltersProps) {
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filteredTree = useMemo(() => filterTree(categoryTree, treeSearch), [categoryTree, treeSearch]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const expandForSelected = (categoryId: number) => {
    setExpandedIds((prev) => new Set(prev).add(categoryId));
  };

  const renderTree = (nodes: CategoryTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = (node.children ?? []).length > 0;
      const isExpanded = expandedIds.has(node.id);
      const isSelected = node.id === selectedCategoryId;
      const prefix = depth === 0 ? '' : `${'-'.repeat(depth)} `;

      return (
        <div key={node.id} className={styles.treeNode}>
          <div
            className={`${styles.treeRow} ${isSelected ? styles.treeRowActive : ''}`}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
          >
            <button
              type="button"
              className={`${styles.expandBtn} ${!hasChildren ? styles.expandBtnHidden : ''}`}
              onClick={() => hasChildren && toggleExpanded(node.id)}
              aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
            >
              {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
            </button>

            <button
              type="button"
              className={styles.categoryBtn}
              onClick={() => {
                expandForSelected(node.id);
                onCategoryChange(node.id);
              }}
            >
              <span className={!hasChildren ? styles.leafLabel : styles.parentLabel}>
                {prefix}
                {node.name}
              </span>
            </button>
          </div>

          {hasChildren && isExpanded ? (
            <div className={styles.treeChildren}>{renderTree(node.children, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Filter products</h3>
            <p>
              {typeof totalProducts === 'number' ? `${totalProducts} products found` : 'Browse by search or category'}
            </p>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="catalog-search" className={styles.label}>
            Search
          </label>
          <input
            id="catalog-search"
            type="text"
            placeholder="Search products"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="category-search" className={styles.label}>
            Categories
          </label>
          <input
            id="category-search"
            type="text"
            placeholder="Search categories"
            value={treeSearch}
            onChange={(e) => setTreeSearch(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              onCategoryChange(null);
              setTreeSearch('');
            }}
          >
            Clear category
          </button>
        </div>

        <div className={styles.treeWrap}>
          <button
            type="button"
            className={`${styles.treeRow} ${selectedCategoryId === null ? styles.treeRowActive : ''}`}
            onClick={() => onCategoryChange(null)}
          >
            <span className={styles.parentLabel}>All categories</span>
          </button>

          {filteredTree.length === 0 ? (
            <div className={styles.empty}>No categories found</div>
          ) : (
            renderTree(filteredTree)
          )}
        </div>
      </div>
    </aside>
  );
}
