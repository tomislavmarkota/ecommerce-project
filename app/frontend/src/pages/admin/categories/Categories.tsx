import React, { useEffect, useMemo, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  fetchCategoryById,
  fetchCategoryTree,
  moveCategory,
  updateCategory,
  type CategoryDetails,
  type CategoryTreeNode,
} from '../../../api/category';
import SearchableTreeSelect from '../../../components/searchableTreeSelect/SearchableTreeSelect';
import { flattenCategoryTree, type CategoryOption } from '../../../utils/categoryTree';
import styles from './categories.module.scss';

type CategoryFormState = {
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  parentId: number | '';
};

const emptyForm: CategoryFormState = {
  name: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
  parentId: '',
};

type Mode = 'create-root' | 'create-child' | 'edit';

const CategoriesPage: React.FC = () => {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryDetails | null>(null);

  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [mode, setMode] = useState<Mode>('create-root');

  const [treeSearch, setTreeSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const categoryOptions = useMemo<CategoryOption[]>(() => flattenCategoryTree(tree), [tree]);

  const selectedOption = useMemo(
    () => categoryOptions.find((item) => item.id === selectedCategoryId) ?? null,
    [categoryOptions, selectedCategoryId],
  );

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

  const filteredTree = useMemo(() => filterTree(tree, treeSearch), [tree, treeSearch]);

  const findNodeById = (nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;

      const found = findNodeById(node.children ?? [], id);
      if (found) return found;
    }

    return null;
  };

  const countDirectChildren = (categoryId: number | null) => {
    if (!categoryId) return 0;

    const node = findNodeById(tree, categoryId);
    return node?.children?.length ?? 0;
  };

  const loadTree = async (preserveSelectedId?: number | null) => {
    const data = await fetchCategoryTree();
    setTree(data);

    if (preserveSelectedId) {
      const stillExists = flattenCategoryTree(data).some((item) => item.id === preserveSelectedId);

      if (!stillExists) {
        setSelectedCategoryId(null);
        setSelectedCategory(null);
      }
    }
  };

  const loadCategoryDetails = async (categoryId: number) => {
    const category = await fetchCategoryById(categoryId);

    setSelectedCategory(category);
    setSelectedCategoryId(category.id);

    setForm({
      name: category.name ?? '',
      description: category.description ?? '',
      imageUrl: category.image_url ?? '',
      sortOrder: Number(category.sort_order ?? 0),
      isActive: Boolean(category.is_active),
      parentId: category.parent_id ?? '',
    });

    setMode('edit');
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await loadTree();
      } catch (error) {
        console.error(error);
        setMessage('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (!treeSearch.trim()) return;

    const autoExpanded = expandAllParentsForMatches(tree, treeSearch);
    setExpandedIds(autoExpanded);
  }, [tree, treeSearch]);

  const handleSelectCategory = async (categoryId: number) => {
    try {
      setMessage('');
      setExpandedIds((prev) => new Set(prev).add(categoryId));
      await loadCategoryDetails(categoryId);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load category details');
    }
  };

  const handleCreateRoot = () => {
    setSelectedCategoryId(null);
    setSelectedCategory(null);
    setForm(emptyForm);
    setMode('create-root');
    setMessage('');
  };

  const handleCreateChild = () => {
    if (!selectedCategoryId) {
      setMessage('Select a category first to create a child category');
      return;
    }

    setExpandedIds((prev) => new Set(prev).add(selectedCategoryId));

    setForm({
      ...emptyForm,
      parentId: selectedCategoryId,
      sortOrder: 0,
      isActive: true,
    });
    setMode('create-child');
    setMessage('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    const nextValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? Number(value) : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleParentChange = (value: number | '') => {
    if (mode === 'edit' && selectedCategoryId && value === selectedCategoryId) {
      setMessage('A category cannot be its own parent');
      return;
    }

    setMessage('');
    setForm((prev) => ({
      ...prev,
      parentId: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setMessage('Category name is required');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      if (mode === 'create-root' || mode === 'create-child') {
        const created = await createCategory({
          name: form.name.trim(),
          parentId: form.parentId === '' ? null : Number(form.parentId),
          description: form.description.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        });

        if (created.parent_id) {
          setExpandedIds((prev) => new Set(prev).add(created.parent_id as number));
        }

        await loadTree(created.id);
        await loadCategoryDetails(created.id);
        setMessage('✅ Category created successfully');
        return;
      }

      if (!selectedCategoryId) {
        setMessage('No category selected');
        return;
      }

      await updateCategory(selectedCategoryId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      });

      const nextParentId = form.parentId === '' ? null : Number(form.parentId);
      const currentParentId = selectedCategory?.parent_id ?? null;

      if (nextParentId !== currentParentId) {
        await moveCategory(selectedCategoryId, {
          parentId: nextParentId,
        });
      }

      if (nextParentId) {
        setExpandedIds((prev) => new Set(prev).add(nextParentId));
      }

      await loadTree(selectedCategoryId);
      await loadCategoryDetails(selectedCategoryId);
      setMessage('✅ Category updated successfully');
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || '❌ Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategoryId) {
      setMessage('Select a category first');
      return;
    }

    const confirmed = window.confirm(
      'Delete this category? This will fail if it still has children or assigned products.',
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage('');

    try {
      await deleteCategory(selectedCategoryId);
      await loadTree(null);

      setSelectedCategoryId(null);
      setSelectedCategory(null);
      setForm(emptyForm);
      setMode('create-root');

      setMessage('✅ Category deleted successfully');
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || '❌ Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const renderTreeNodes = (nodes: CategoryTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = (node.children ?? []).length > 0;
      const isExpanded = expandedIds.has(node.id);
      const isSelected = node.id === selectedCategoryId;

      const prefix = depth === 0 ? '' : `${'-'.repeat(depth)} `;

      return (
        <div key={node.id} className={styles.treeNode}>
          <div
            className={`${styles.treeRow} ${isSelected ? styles.treeRowActive : ''}`}
            style={{ paddingLeft: `${12 + depth * 18}px` }}
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

            <button type="button" className={styles.treeLabelBtn} onClick={() => void handleSelectCategory(node.id)}>
              <span className={`${styles.treeItemLabel} ${hasChildren ? styles.treeItemParent : ''}`}>
                {prefix}
                {node.name}
              </span>
            </button>
          </div>

          {hasChildren && isExpanded ? (
            <div className={styles.treeChildren}>{renderTreeNodes(node.children, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  };

  if (loading) {
    return <div className={styles.pageState}>Loading categories...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>E-commerce / Categories</p>
          <h1 className={styles.pageTitle}>Categories</h1>
          <p className={styles.pageSubtitle}>
            Manage your tree-structured categories, subcategories, and nested category hierarchy.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCreateRoot}>
            Add root category
          </button>

          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreateChild}>
            Add child category
          </button>
        </div>
      </div>

      {message ? <div className={styles.alert}>{message}</div> : null}

      <div className={styles.layout}>
        <section className={styles.treeCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Category tree</h3>
              <p>Browse, search, expand, and manage the full category hierarchy.</p>
            </div>
          </div>

          <div className={styles.treeSearchWrap}>
            <input
              type="text"
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder="Search categories..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.treeList}>
            {filteredTree.length === 0 ? (
              <div className={styles.emptyStateSmall}>No categories found</div>
            ) : (
              renderTreeNodes(filteredTree)
            )}
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>
                {mode === 'create-root'
                  ? 'Create root category'
                  : mode === 'create-child'
                    ? 'Create child category'
                    : 'Edit category'}
              </h3>
              <p>
                {mode === 'edit'
                  ? 'Update category details, parent, and visibility.'
                  : 'Create a new category and place it anywhere in the hierarchy.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Name
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter category name"
                required
              />
            </div>

            <SearchableTreeSelect
              id="parentId"
              label="Parent category"
              value={form.parentId}
              options={categoryOptions.filter((option) => option.id !== selectedCategoryId)}
              onChange={handleParentChange}
              placeholder="No parent (root category)"
              searchPlaceholder="Search parent category..."
              emptyText="No categories found"
            />

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="sortOrder" className={styles.label}>
                  Sort order
                </label>
                <input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={handleChange}
                  className={styles.input}
                  min={0}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="imageUrl" className={styles.label}>
                  Image URL
                </label>
                <input
                  id="imageUrl"
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Optional image URL"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                className={styles.textarea}
                rows={5}
                placeholder="Optional category description"
              />
            </div>

            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                <span>Active</span>
              </label>
            </div>

            {mode === 'edit' && selectedCategory ? (
              <div className={styles.metaCard}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Slug</span>
                  <strong>{selectedCategory.slug}</strong>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Path</span>
                  <strong>{selectedCategory.path}</strong>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Level</span>
                  <strong>{selectedCategory.level}</strong>
                </div>
              </div>
            ) : null}

            <div className={styles.formActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={handleCreateRoot}
                disabled={saving || deleting}
              >
                Reset
              </button>

              {mode === 'edit' ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => void handleDelete()}
                  disabled={saving || deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              ) : null}

              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || deleting}>
                {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create category'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className={styles.summaryCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Selected category</h3>
            <p>Quick overview of the currently selected node.</p>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.metaLabel}>Category</span>
            <strong>{selectedOption?.breadcrumb || 'No category selected'}</strong>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.metaLabel}>Type</span>
            <strong>{!selectedOption ? '-' : selectedOption.isLeaf ? 'Leaf category' : 'Parent category'}</strong>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.metaLabel}>Children</span>
            <strong>{selectedCategory ? countDirectChildren(selectedCategory.id) : '-'}</strong>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.metaLabel}>Status</span>
            <strong>{selectedCategory ? (selectedCategory.is_active ? 'Active' : 'Inactive') : '-'}</strong>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CategoriesPage;
