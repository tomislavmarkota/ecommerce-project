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
import CategoryTreePicker from '../../../components/categoryTreePicker/CategoryTreePicker';
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

const cloneTree = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
  nodes.map((node) => ({
    ...node,
    children: cloneTree(node.children ?? []),
  }));

const removeNodeFromTree = (
  nodes: CategoryTreeNode[],
  targetId: number,
): { nextTree: CategoryTreeNode[]; removedNode: CategoryTreeNode | null } => {
  let removedNode: CategoryTreeNode | null = null;

  const walk = (items: CategoryTreeNode[]): CategoryTreeNode[] => {
    const result: CategoryTreeNode[] = [];

    for (const item of items) {
      if (item.id === targetId) {
        removedNode = {
          ...item,
          children: cloneTree(item.children ?? []),
        };
        continue;
      }

      result.push({
        ...item,
        children: walk(item.children ?? []),
      });
    }

    return result;
  };

  return {
    nextTree: walk(nodes),
    removedNode,
  };
};

const insertNodeIntoTree = (
  nodes: CategoryTreeNode[],
  parentId: number | null,
  nodeToInsert: CategoryTreeNode,
): CategoryTreeNode[] => {
  if (parentId == null) {
    return [...nodes, nodeToInsert];
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children ?? []), nodeToInsert],
      };
    }

    return {
      ...node,
      children: insertNodeIntoTree(node.children ?? [], parentId, nodeToInsert),
    };
  });
};

const updateNodeInTree = (
  nodes: CategoryTreeNode[],
  targetId: number,
  updater: (node: CategoryTreeNode) => CategoryTreeNode,
): CategoryTreeNode[] =>
  nodes.map((node) => {
    if (node.id === targetId) {
      return updater({
        ...node,
        children: cloneTree(node.children ?? []),
      });
    }

    return {
      ...node,
      children: updateNodeInTree(node.children ?? [], targetId, updater),
    };
  });

const findNodeById = (nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;

    const found = findNodeById(node.children ?? [], id);
    if (found) return found;
  }

  return null;
};

const findNodeWithParent = (
  nodes: CategoryTreeNode[],
  id: number,
  parentId: number | null = null,
): { node: CategoryTreeNode; parentId: number | null } | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return { node, parentId };
    }

    const found = findNodeWithParent(node.children ?? [], id, node.id);
    if (found) return found;
  }

  return null;
};

const isDescendantOf = (nodes: CategoryTreeNode[], ancestorId: number, targetId: number): boolean => {
  const ancestorNode = findNodeById(nodes, ancestorId);

  if (!ancestorNode) {
    return false;
  }

  const walk = (node: CategoryTreeNode): boolean => {
    if (node.id === targetId) {
      return true;
    }

    return (node.children ?? []).some((child) => walk(child));
  };

  return (ancestorNode.children ?? []).some((child) => walk(child));
};

const rebuildPathAndLevel = (nodes: CategoryTreeNode[], parentPath = '', level = 0): CategoryTreeNode[] =>
  nodes.map((node) => {
    const slug = node.slug || '';
    const path = parentPath ? `${parentPath}/${slug}` : slug;

    return {
      ...node,
      level,
      path,
      children: rebuildPathAndLevel(node.children ?? [], path, level + 1),
    };
  });

const buildCategoryDetailsFromTreeNode = (node: CategoryTreeNode, parentId: number | null = null): CategoryDetails => ({
  id: node.id,
  name: node.name,
  slug: node.slug,
  description: node.description ?? '',
  image_url: node.image_url ?? null,
  sort_order: Number(node.sort_order ?? 0),
  is_active: Boolean(node.is_active),
  parent_id: parentId,
  path: node.path,
  level: node.level,
  created_at: '',
  updated_at: '',
});

const applyLocalCategoryPreview = ({
  tree,
  selectedCategory,
  form,
  selectedCategoryId,
  mode,
}: {
  tree: CategoryTreeNode[];
  selectedCategory: CategoryDetails | null;
  form: CategoryFormState;
  selectedCategoryId: number | null;
  mode: Mode;
}) => {
  if (mode !== 'edit' || !selectedCategory || !selectedCategoryId) {
    return {
      previewTree: tree,
      previewSelectedCategory: selectedCategory,
    };
  }

  const originalParentId = selectedCategory.parent_id ?? null;
  const nextParentId = form.parentId === '' ? null : Number(form.parentId);

  let nextTree = cloneTree(tree);

  const updateNode = (node: CategoryTreeNode): CategoryTreeNode => ({
    ...node,
    name: form.name || node.name,
    description: form.description,
    image_url: form.imageUrl || null,
    sort_order: Number(form.sortOrder) || 0,
    is_active: form.isActive,
  });

  if (originalParentId === nextParentId) {
    nextTree = updateNodeInTree(nextTree, selectedCategoryId, updateNode);
  } else {
    const { nextTree: treeWithoutNode, removedNode } = removeNodeFromTree(nextTree, selectedCategoryId);

    if (removedNode) {
      const movedNode = updateNode(removedNode);
      nextTree = insertNodeIntoTree(treeWithoutNode, nextParentId, movedNode);
    } else {
      nextTree = treeWithoutNode;
    }
  }

  nextTree = rebuildPathAndLevel(nextTree);

  const updatedNode = findNodeById(nextTree, selectedCategoryId);

  const previewSelectedCategory: CategoryDetails | null = updatedNode
    ? {
        ...selectedCategory,
        name: form.name || selectedCategory.name,
        description: form.description,
        image_url: form.imageUrl || null,
        sort_order: Number(form.sortOrder) || 0,
        is_active: form.isActive,
        parent_id: nextParentId,
        path: updatedNode.path,
        level: updatedNode.level,
      }
    : selectedCategory;

  return {
    previewTree: nextTree,
    previewSelectedCategory,
  };
};

const CategoriesPage: React.FC = () => {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryDetails | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<number, CategoryDetails>>({});

  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [mode, setMode] = useState<Mode>('create-root');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const { previewTree, previewSelectedCategory } = useMemo(
    () =>
      applyLocalCategoryPreview({
        tree,
        selectedCategory,
        form,
        selectedCategoryId,
        mode,
      }),
    [tree, selectedCategory, form, selectedCategoryId, mode],
  );

  const categoryOptions = useMemo<CategoryOption[]>(() => flattenCategoryTree(previewTree), [previewTree]);

  const selectedOption = useMemo(
    () => categoryOptions.find((item) => item.id === selectedCategoryId) ?? null,
    [categoryOptions, selectedCategoryId],
  );

  const countDirectChildren = (categoryId: number | null) => {
    if (!categoryId) return 0;

    const node = findNodeById(previewTree, categoryId);
    return node?.children?.length ?? 0;
  };

  const syncFormFromCategory = (category: CategoryDetails) => {
    setForm({
      name: category.name ?? '',
      description: category.description ?? '',
      imageUrl: category.image_url ?? '',
      sortOrder: Number(category.sort_order ?? 0),
      isActive: Boolean(category.is_active),
      parentId: category.parent_id ?? '',
    });
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
    const cached = detailsCache[categoryId];

    if (cached) {
      setSelectedCategory((prev) => {
        if (prev?.id === cached.id && prev.name === cached.name && prev.path === cached.path) {
          return prev;
        }
        return cached;
      });

      setSelectedCategoryId(cached.id);
      syncFormFromCategory(cached);
      setMode('edit');
      return;
    }

    const category = await fetchCategoryById(categoryId);

    setDetailsCache((prev) => ({
      ...prev,
      [category.id]: category,
    }));

    setSelectedCategory((prev) => {
      if (prev?.id === category.id && prev.name === category.name && prev.path === category.path) {
        return prev;
      }
      return category;
    });

    setSelectedCategoryId(category.id);
    syncFormFromCategory(category);
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

  const handleSelectCategory = async (categoryId: number) => {
    try {
      setMessage('');
      await loadCategoryDetails(categoryId);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load category details');
    }
  };

  const handleTreeSelectionChange = (categoryIds: number[]) => {
    const nextSelectedId = categoryIds[0] ?? null;

    setMessage('');
    setSelectedCategoryId(nextSelectedId);

    if (!nextSelectedId) {
      setSelectedCategory(null);
      setForm(emptyForm);
      setMode('create-root');
      return;
    }

    const treeMatch = findNodeWithParent(previewTree, nextSelectedId);

    if (treeMatch) {
      const optimisticCategory = buildCategoryDetailsFromTreeNode(treeMatch.node, treeMatch.parentId);

      setSelectedCategory(optimisticCategory);
      syncFormFromCategory(optimisticCategory);
      setMode('edit');
    }

    void loadCategoryDetails(nextSelectedId);
  };

  const handleDropCategory = (draggedId: number, targetParentId: number | null) => {
    if (!draggedId) return;

    if (targetParentId === draggedId) {
      setMessage('A category cannot be its own parent');
      return;
    }

    if (targetParentId !== null && isDescendantOf(previewTree, draggedId, targetParentId)) {
      setMessage('A category cannot be moved inside one of its own descendants');
      return;
    }

    const treeMatch = findNodeWithParent(previewTree, draggedId);

    if (treeMatch) {
      const optimisticCategory = buildCategoryDetailsFromTreeNode(treeMatch.node, targetParentId);

      setSelectedCategoryId(draggedId);
      setSelectedCategory(optimisticCategory);
      syncFormFromCategory({
        ...optimisticCategory,
        parent_id: targetParentId,
      });
      setMode('edit');
      setMessage('Parent changed locally. Save changes to persist.');
      return;
    }

    void (async () => {
      try {
        const category = await fetchCategoryById(draggedId);

        setDetailsCache((prev) => ({
          ...prev,
          [draggedId]: category,
        }));

        setSelectedCategoryId(draggedId);
        setSelectedCategory(category);
        syncFormFromCategory({
          ...category,
          parent_id: targetParentId,
        });
        setMode('edit');
        setMessage('Parent changed locally. Save changes to persist.');
      } catch (error) {
        console.error(error);
        setMessage('Failed to load dropped category');
      }
    })();
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

    if (
      mode === 'edit' &&
      selectedCategoryId &&
      value !== '' &&
      isDescendantOf(previewTree, selectedCategoryId, Number(value))
    ) {
      setMessage('A category cannot be moved inside one of its own descendants');
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
        <CategoryTreePicker
          value={selectedCategoryId ? [selectedCategoryId] : []}
          onChange={handleTreeSelectionChange}
          selectionMode="single"
          treeData={previewTree}
          focusedId={selectedCategoryId}
          onDropCategory={handleDropCategory}
          title="Category tree"
          subtitle="Browse, search, select, and drag categories to a new parent."
          className={styles.treeCard}
        />

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

            {mode === 'edit' && previewSelectedCategory ? (
              <div className={styles.metaCard}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Slug</span>
                  <strong>{previewSelectedCategory.slug}</strong>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Path</span>
                  <strong>{previewSelectedCategory.path}</strong>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Level</span>
                  <strong>{previewSelectedCategory.level}</strong>
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
            <strong>{previewSelectedCategory ? countDirectChildren(previewSelectedCategory.id) : '-'}</strong>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.metaLabel}>Status</span>
            <strong>
              {previewSelectedCategory ? (previewSelectedCategory.is_active ? 'Active' : 'Inactive') : '-'}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CategoriesPage;
