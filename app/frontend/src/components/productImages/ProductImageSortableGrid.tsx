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

type ProductImagesSortableGridProps = {
  productId: number;
  images: ProductImage[];
  onImagesChange?: (images: ProductImage[]) => void;
  onSetPrimary?: (imageId: number) => void;
  onDelete?: (imageId: number) => void;
  onEditAltText?: (image: ProductImage) => void;
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

  const persistOrder = async (nextItems: ProductImage[]) => {
    const payload = nextItems.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));

    setSavingOrder(true);

    try {
      await reorderProductImages(productId, payload);

      const normalized = nextItems.map((item, index) => ({
        ...item,
        sort_order: index,
      }));

      setItems(normalized);
      onImagesChange?.(normalized);
    } catch (error) {
      console.error(error);
      setItems([...images].sort((a, b) => a.sort_order - b.sort_order));
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    setItems(reordered);
    await persistOrder(reordered);
  };

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#666' }}>
        {savingOrder ? 'Saving order...' : 'Drag images to reorder'}
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
