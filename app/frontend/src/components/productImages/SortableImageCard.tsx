import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type ProductImage = {
  id: number;
  product_id: number;
  image_url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: number;
};
type SortableImageCardProps = {
  image: ProductImage;
  onSetPrimary?: (imageId: number) => void;
  onDelete?: (imageId: number) => void;
  onEditAltText?: (image: ProductImage) => void;
};

const SortableImageCard: React.FC<SortableImageCardProps> = ({ image, onSetPrimary, onDelete, onEditAltText }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: 'grab',
  };

  const previewSrc = image.thumbnail_url || image.image_url;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 12,
          background: '#fff',
        }}
      >
        <div
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            borderRadius: 8,
            marginBottom: 12,
            background: '#f6f6f6',
          }}
        >
          <img
            src={previewSrc}
            alt={image.alt_text || 'Product image'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {image.is_primary === 1 && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                padding: '4px 8px',
                borderRadius: 999,
                background: '#111',
                color: '#fff',
                fontSize: 12,
              }}
            >
              Primary
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Order: {image.sort_order}</div>

          <div style={{ fontSize: 13 }}>{image.alt_text || 'No alt text'}</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {image.is_primary !== 1 && (
              <button type="button" onClick={() => onSetPrimary?.(image.id)}>
                Set primary
              </button>
            )}

            <button type="button" onClick={() => onEditAltText?.(image)}>
              Edit alt
            </button>

            <button type="button" onClick={() => onDelete?.(image.id)}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SortableImageCard;
