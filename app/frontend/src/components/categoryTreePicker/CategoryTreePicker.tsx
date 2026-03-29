import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCategoryTree, type CategoryTreeNode } from '../../api/category';
import styles from './CategoryTreePicker.module.scss';

export type SelectedCategoryItem = {
  id: number;
  name: string;
};

type CategoryTreePickerProps = {
  value: number[];
  onChange: (categoryIds: number[]) => void;
  onSelectionDetailsChange?: (items: SelectedCategoryItem[]) => void;
  selectionMode?: 'single' | 'multiple';
  treeData?: CategoryTreeNode[];
  focusedId?: number | null;
  onDropCategory?: (draggedId: number, targetParentId: number | null) => void;
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
};

const CategoryTreePicker: React.FC<CategoryTreePickerProps> = ({
  value,
  onChange,
  onSelectionDetailsChange,
  selectionMode = 'multiple',
  treeData,
  focusedId = null,
  onDropCategory,
  title = 'Category tree',
  subtitle = 'Browse, search, and select one or more categories.',
  searchPlaceholder = 'Search categories...',
  emptyText = 'No categories found',
  className = '',
}) => {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropRootActive, setDropRootActive] = useState(false);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggleExpanded = (categoryId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  const toggleChecked = (categoryId: number) => {
    if (selectionMode === 'single') {
      if (value[0] === categoryId) {
        onChange([]);
        return;
      }

      onChange([categoryId]);
      return;
    }

    const next = new Set(value);

    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }

    onChange(Array.from(next));
  };

  const expandAllParentsForMatches = (nodes: CategoryTreeNode[], query: string): Set<number> => {
    const normalized = query.trim().toLowerCase();
    const expanded = new Set<number>();

    if (!normalized) return expanded;

    const walk = (node: CategoryTreeNode): boolean => {
      const selfMatches =
        node.name.toLowerCase().includes(normalized) ||
        node.slug.toLowerCase().includes(normalized) ||
        node.path.toLowerCase().includes(normalized);

      const childMatches = (node.children ?? []).some((child) => walk(child));

      if (childMatches) {
        expanded.add(node.id);
      }

      return selfMatches || childMatches;
    };

    nodes.forEach((node) => {
      walk(node);
    });

    return expanded;
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

  const flattenTree = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
    nodes.flatMap((node) => [node, ...flattenTree(node.children ?? [])]);

  const allNodes = useMemo(() => flattenTree(tree), [tree]);

  const selectedNodes = useMemo(() => allNodes.filter((node) => selectedSet.has(node.id)), [allNodes, selectedSet]);

  const selectedDetails = useMemo(
    () =>
      selectedNodes.map((node) => ({
        id: node.id,
        name: node.name,
      })),
    [selectedNodes],
  );

  const filteredTree = useMemo(() => filterTree(tree, treeSearch), [tree, treeSearch]);

  useEffect(() => {
    if (treeData) {
      setTree(treeData);
      setLoading(false);
      return;
    }

    const loadTree = async () => {
      try {
        setLoading(true);
        setMessage('');
        const data = await fetchCategoryTree();
        setTree(data);
      } catch (error) {
        console.error(error);
        setMessage('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    void loadTree();
  }, [treeData]);

  useEffect(() => {
    if (!treeSearch.trim()) return;

    const autoExpanded = expandAllParentsForMatches(tree, treeSearch);
    setExpandedIds(autoExpanded);
  }, [tree, treeSearch]);

  useEffect(() => {
    if (focusedId == null) return;

    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(focusedId);
      return next;
    });
  }, [focusedId]);

  const lastSelectionSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!onSelectionDetailsChange) return;

    const signature = JSON.stringify(selectedDetails);

    if (lastSelectionSignatureRef.current === signature) {
      return;
    }

    lastSelectionSignatureRef.current = signature;
    onSelectionDetailsChange(selectedDetails);
  }, [selectedDetails, onSelectionDetailsChange]);

  const resetDragState = () => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropRootActive(false);
  };

  const handleDropToParent = (targetParentId: number | null) => {
    if (!onDropCategory || draggedId == null) {
      resetDragState();
      return;
    }

    if (targetParentId === draggedId) {
      resetDragState();
      return;
    }

    onDropCategory(draggedId, targetParentId);
    resetDragState();
  };

  const renderTreeNodes = (nodes: CategoryTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = (node.children ?? []).length > 0;
      const isExpanded = expandedIds.has(node.id);
      const isChecked = selectedSet.has(node.id);
      const isFocused = focusedId === node.id;
      const isDropTarget = dropTargetId === node.id;

      const prefix = depth === 0 ? '' : `${'-'.repeat(depth)} `;

      return (
        <div key={node.id} className={styles.treeNode}>
          <div
            className={[
              styles.treeRow,
              isChecked ? styles.treeRowActive : '',
              isFocused ? styles.treeRowFocused : '',
              isDropTarget ? styles.treeRowDropTarget : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ paddingLeft: `${12 + depth * 18}px` }}
            draggable={Boolean(onDropCategory)}
            onDragStart={() => {
              setDraggedId(node.id);
              setDropRootActive(false);
            }}
            onDragOver={(e) => {
              if (!onDropCategory || draggedId === node.id) return;
              e.preventDefault();
              setDropTargetId(node.id);
              setDropRootActive(false);
            }}
            onDragLeave={() => {
              if (dropTargetId === node.id) {
                setDropTargetId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDropToParent(node.id);
            }}
            onDragEnd={resetDragState}
          >
            <button
              type="button"
              className={`${styles.expandBtn} ${!hasChildren ? styles.expandBtnHidden : ''}`}
              onClick={() => hasChildren && toggleExpanded(node.id)}
              aria-label={hasChildren ? (isExpanded ? 'Collapse category' : 'Expand category') : undefined}
              tabIndex={hasChildren ? 0 : -1}
            >
              {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
            </button>

            <label className={styles.checkboxWrap}>
              <input
                name={selectionMode === 'single' ? 'category-tree-single-select' : undefined}
                type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                checked={isChecked}
                onChange={() => toggleChecked(node.id)}
              />
              <span className={`${styles.treeItemLabel} ${hasChildren ? styles.treeItemParent : ''}`}>
                {prefix}
                {node.name}
              </span>
            </label>
          </div>

          {hasChildren && isExpanded ? (
            <div className={styles.treeChildren}>{renderTreeNodes(node.children, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  };

  return (
    <section className={`${styles.treeCard} ${className}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      {message ? <div className={styles.alert}>{message}</div> : null}

      <div className={styles.treeSearchWrap}>
        <input
          type="text"
          value={treeSearch}
          onChange={(e) => setTreeSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className={styles.searchInput}
        />
      </div>

      {selectedDetails.length > 0 ? (
        <div className={styles.selectedSummary}>
          <span className={styles.selectedLabel}>Selected:</span>
          <div className={styles.selectedChips}>
            {selectedDetails.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.selectedChip}
                onClick={() => toggleChecked(item.id)}
              >
                <span>{item.name}</span>
                <span className={styles.selectedChipRemove}>×</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {onDropCategory ? (
        <div
          className={`${styles.rootDropZone} ${dropRootActive ? styles.rootDropZoneActive : ''}`}
          onDragOver={(e) => {
            if (!onDropCategory || draggedId == null) return;
            e.preventDefault();
            setDropRootActive(true);
            setDropTargetId(null);
          }}
          onDragLeave={() => setDropRootActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            handleDropToParent(null);
          }}
        >
          Drop here to move category to root
        </div>
      ) : null}

      <div className={styles.treeList}>
        {loading ? (
          <div className={styles.emptyStateSmall}>Loading categories...</div>
        ) : filteredTree.length === 0 ? (
          <div className={styles.emptyStateSmall}>{emptyText}</div>
        ) : (
          renderTreeNodes(filteredTree)
        )}
      </div>
    </section>
  );
};

export default CategoryTreePicker;
