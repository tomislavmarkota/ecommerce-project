import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import SortableImageCard from './SortableImageCard';
import type { ProductImage } from './SortableImageCard';
import { reorderProductImages } from '../../api/productImage';

type ProductImagesSortableGridProps<TImage extends ProductImage = ProductImage> = {
  productId?: number | null;
  images: TImage[];
  onImagesChange?: (images: TImage[]) => void;
  onSetPrimary?: (imageId: number) => void;
  onDelete?: (imageId: number) => void;
  onEditAltText?: (image: TImage) => void;
};

const ProductImagesSortableGrid: React.FC<ProductImagesSortableGridProps> = ({
  productId,
  images,
  onImagesChange,
  onSetPrimary,
  onDelete,
  onEditAltText,
}) => {
  const [items, setItems] = useState<ProductImage[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const isPersistedMode = Boolean(productId);

  useEffect(() => {
    const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
    setItems(sorted);
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const normalizeSortOrder = (nextItems: ProductImage[]): ProductImage[] =>
    nextItems.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

  const persistOrder = async (nextItems: ProductImage[]): Promise<void> => {
    const normalized = normalizeSortOrder(nextItems);

    // CREATE MODE:
    // Product does not exist yet, so reorder only in local state.
    if (!isPersistedMode || !productId) {
      setItems(normalized);
      onImagesChange?.(normalized);
      return;
    }

    // EDIT MODE:
    // Persist reordered image positions to backend.
    const payload = normalized.map((item) => ({
      id: item.id,
      sortOrder: item.sort_order,
    }));

    setSavingOrder(true);

    try {
      await reorderProductImages(productId, payload);
      setItems(normalized);
      onImagesChange?.(normalized);
    } catch (error) {
      console.error(error);
      setItems([...images].sort((a, b) => a.sort_order - b.sort_order));
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(items, oldIndex, newIndex);
    const normalized = normalizeSortOrder(reordered);

    setItems(normalized);
    onImagesChange?.(normalized);

    await persistOrder(normalized);
  };

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#666' }}>
        {savingOrder
          ? 'Saving order...'
          : isPersistedMode
            ? 'Drag images to reorder'
            : 'Drag images to reorder (saved locally until product is created)'}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {items.map((image) => (
              <SortableImageCard
                key={image.id}
                image={image}
                onSetPrimary={onSetPrimary}
                onDelete={onDelete}
                onEditAltText={onEditAltText}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default ProductImagesSortableGrid;
