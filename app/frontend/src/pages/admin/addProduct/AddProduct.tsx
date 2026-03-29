import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import styles from './AddProduct.module.scss';
import ProductImagesSortableGrid from '../../../components/productImages/ProductImageSortableGrid';
import MultiImageUpload from '../../../components/multiImageUpload/MultiImageUpload';
import { createProduct, type CreateProductPayload } from '../../../api/product';
import {
  deleteProductImage,
  getProductImages,
  setPrimaryProductImage,
  updateProductImageAltText,
  uploadProductImages,
  type ProductImage,
} from '../../../api/productImage';

type ProductDraft = {
  name: string;
  productCode: string;
  sku: string;
  shortDescription: string;
  description: string;
  regularPrice: string;
  salePrice: string;
  taxRate: string;
  stock: string;
  minStock: string;
  weight: string;
  width: string;
  height: string;
  length: string;
  status: 'published' | 'draft';
  visibility: 'public' | 'hidden';
  featured: boolean;
  categoryId: string;
  brand: string;
  tags: string;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: string;
  discountStart: string;
  discountEnd: string;
};

type LocalProductImage = ProductImage & {
  localId: string;
  file?: File;
  isLocal: boolean;
};

type UploadFailedFile = {
  fileName: string;
  message?: string;
};

type UploadImagesResult = {
  uploadedCount: number;
  failedFiles: UploadFailedFile[];
};

const initialState: ProductDraft = {
  discountType: 'none',
  discountValue: '',
  discountStart: '',
  discountEnd: '',
  name: '',
  productCode: '',
  sku: '',
  shortDescription: '',
  description: '',
  regularPrice: '',
  salePrice: '',
  taxRate: '25',
  stock: '',
  minStock: '',
  weight: '',
  width: '',
  height: '',
  length: '',
  status: 'draft',
  visibility: 'public',
  featured: false,
  categoryId: '',
  brand: '',
  tags: '',
};

const fakeCategories = [
  { id: '1', label: 'Kupaonica' },
  { id: '2', label: '- Sanitarije' },
  { id: '3', label: '-- Toaletne školjke' },
  { id: '4', label: '-- Umivaonici' },
  { id: '5', label: 'Pločice i materijali' },
  { id: '6', label: '- Pločice' },
  { id: '7', label: '-- Podne pločice' },
  { id: '8', label: 'Vodovod i instalacije' },
];

const createLocalImageId = (): string => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const normalizeSortOrder = (nextImages: LocalProductImage[]): LocalProductImage[] =>
  nextImages.map((image, index) => ({
    ...image,
    sort_order: index,
  }));

const ensureSinglePrimary = (nextImages: LocalProductImage[]): LocalProductImage[] => {
  if (nextImages.length === 0) {
    return [];
  }

  const primaryIndex = nextImages.findIndex((image) => image.is_primary === 1);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return nextImages.map((image, index) => ({
    ...image,
    sort_order: index,
    is_primary: index === resolvedPrimaryIndex ? 1 : 0,
  }));
};

const normalizeImages = (nextImages: LocalProductImage[]): LocalProductImage[] =>
  ensureSinglePrimary(normalizeSortOrder(nextImages));

const round2 = (value: number): number => Math.round(value * 100) / 100;
const grossFromNet = (net: number, vatRate: number): number => round2(net * (1 + vatRate / 100));

export default function AddProductPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductDraft>(initialState);
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);
  const [images, setImages] = useState<LocalProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selectedCategory = useMemo(
    () => fakeCategories.find((item) => item.id === form.categoryId)?.label ?? 'No category selected',
    [form.categoryId],
  );

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image.isLocal && image.image_url?.startsWith('blob:')) {
          URL.revokeObjectURL(image.image_url);
        }
      });
    };
  }, [images]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    const nextValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const loadProductImages = async (productId: number): Promise<void> => {
    try {
      const result = await getProductImages(productId);

      const persistedImages: LocalProductImage[] = (result.data || []).map((image) => ({
        ...image,
        localId: `server-${image.id}`,
        isLocal: false,
      }));

      setImages(normalizeImages(persistedImages));
    } catch (error) {
      console.error(error);
      setImages([]);
    }
  };

  const handleLocalImagesSelected = async (
    files: File[],
    _onProgress: (file: File, progress: number) => void,
  ): Promise<UploadImagesResult> => {
    if (files.length === 0) {
      return {
        uploadedCount: 0,
        failedFiles: [],
      };
    }

    const currentCount = images.length;

    const newLocalImages: LocalProductImage[] = files.map((file, index) => ({
      id: -(currentCount + index + 1),
      localId: createLocalImageId(),
      file,
      isLocal: true,
      product_id: createdProductId ?? 0,
      blob_name: file.name,
      image_url: URL.createObjectURL(file),
      alt_text: file.name.replace(/\.[^.]+$/, ''),
      sort_order: currentCount + index,
      is_primary: currentCount === 0 && index === 0 ? 1 : 0,
      mime_type: file.type || null,
      file_size: file.size || null,
      width: null,
      height: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setImages((prev) => normalizeImages([...prev, ...newLocalImages]));
    setMessage('Images added locally. They will be uploaded after the product is created.');

    return {
      uploadedCount: files.length,
      failedFiles: [],
    };
  };

  const handlePersistedUpload = async (
    files: File[],
    onProgress: (file: File, progress: number) => void,
  ): Promise<UploadImagesResult> => {
    if (!createdProductId || files.length === 0) {
      return {
        uploadedCount: 0,
        failedFiles: [],
      };
    }

    setUploadingImages(true);
    setMessage('');

    try {
      const result = await uploadProductImages(createdProductId, files, onProgress);
      await loadProductImages(createdProductId);

      if (result.failedFiles.length > 0 && result.uploadedCount > 0) {
        setMessage('Some images were uploaded, but a few failed.');
      } else if (result.failedFiles.length > 0) {
        setMessage('Failed to upload images.');
      } else {
        setMessage('✅ Images uploaded successfully');
      }

      return result;
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || '❌ Failed to upload images');

      return {
        uploadedCount: 0,
        failedFiles: files.map((file) => ({
          fileName: file.name,
          message: 'Upload failed',
        })),
      };
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadPendingLocalImages = async (productId: number): Promise<void> => {
    const localFiles = images
      .filter((image) => image.isLocal && image.file)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.file as File);

    if (localFiles.length === 0) {
      await loadProductImages(productId);
      return;
    }

    setUploadingImages(true);

    try {
      const result = await uploadProductImages(productId, localFiles, () => {});
      await loadProductImages(productId);

      if (result.failedFiles.length > 0 && result.uploadedCount > 0) {
        setMessage('Product created. Some images uploaded, but a few failed.');
      } else if (result.failedFiles.length > 0) {
        setMessage('Product created, but image upload failed.');
      } else {
        setMessage('✅ Product created and images uploaded successfully');
      }
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || 'Product created, but failed to upload images.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSetPrimary = async (imageId: number): Promise<void> => {
    const target = images.find((image) => image.id === imageId);

    if (!target) {
      return;
    }

    if (!createdProductId || target.isLocal) {
      setImages((prev) =>
        normalizeImages(
          prev.map((image) => ({
            ...image,
            is_primary: image.id === imageId ? 1 : 0,
          })),
        ),
      );
      return;
    }

    try {
      await setPrimaryProductImage(createdProductId, imageId);

      setImages((prev) =>
        normalizeImages(
          prev.map((image) => ({
            ...image,
            is_primary: image.id === imageId ? 1 : 0,
          })),
        ),
      );

      setMessage('Primary image updated successfully');
    } catch (error) {
      console.error(error);
      setMessage('❌ Failed to update primary image');
    }
  };

  const handleDeleteImage = async (imageId: number): Promise<void> => {
    const target = images.find((image) => image.id === imageId);

    if (!target) {
      return;
    }

    if (!createdProductId || target.isLocal) {
      setImages((prev) => normalizeImages(prev.filter((image) => image.id !== imageId)));
      return;
    }

    try {
      await deleteProductImage(imageId);
      setImages((prev) => normalizeImages(prev.filter((image) => image.id !== imageId)));
      setMessage('Image deleted successfully');
    } catch (error) {
      console.error(error);
      setMessage('❌ Failed to delete image');
    }
  };

  const handleEditAltText = async (image: ProductImage): Promise<void> => {
    const altText = window.prompt('Enter alt text', image.alt_text || '');

    if (altText === null) {
      return;
    }

    const localImage = image as LocalProductImage;
    const isLocalImage = Boolean(localImage.isLocal);

    if (!createdProductId || isLocalImage) {
      setImages((prev) =>
        prev.map((item) =>
          item.id === image.id
            ? {
                ...item,
                alt_text: altText || null,
              }
            : item,
        ),
      );
      return;
    }

    try {
      await updateProductImageAltText(image.id, altText);

      setImages((prev) =>
        prev.map((item) =>
          item.id === image.id
            ? {
                ...item,
                alt_text: altText || null,
              }
            : item,
        ),
      );

      setMessage('Alt text updated successfully');
    } catch (error) {
      console.error(error);
      setMessage('❌ Failed to update alt text');
    }
  };
  const handleImagesChange = (nextImages: ProductImage[]) => {
    setImages(normalizeImages(nextImages as LocalProductImage[]));
  };

  const buildCreatePayload = (publish: boolean): CreateProductPayload | null => {
    const name = form.name.trim();
    const description = form.description.trim();
    const stock = Number(form.stock || 0);
    const categoryId = Number(form.categoryId || 0);
    const vatRate = Number(form.taxRate || 25);
    const retailNet = Number(form.regularPrice || 0);
    const businessNet = Number(form.salePrice || 0);

    if (!name) {
      setMessage('Product name is required');
      return null;
    }

    if (!categoryId || Number.isNaN(categoryId)) {
      setMessage('Please select a category');
      return null;
    }

    const payload: CreateProductPayload = {
      name,
      description,
      stock,
      categoryId,
      isPublished: publish,
      pricing: {
        retail: {
          priceNet: retailNet,
          vatRate,
          priceGross: grossFromNet(retailNet, vatRate),
        },
        business: {
          priceNet: businessNet,
          vatRate,
          priceGross: grossFromNet(businessNet, vatRate),
        },
      },
    };

    return payload;
  };

  const handleCreateProduct = async (publish: boolean): Promise<void> => {
    const payload = buildCreatePayload(publish);

    if (!payload) {
      return;
    }

    try {
      setSaving(true);
      setMessage('');

      const created = await createProduct(payload);

      const nextProductId = created?.id;

      if (!nextProductId) {
        throw new Error('Product created but no id was returned');
      }

      setCreatedProductId(nextProductId);
      setForm((prev) => ({
        ...prev,
        status: publish ? 'published' : 'draft',
      }));

      await uploadPendingLocalImages(nextProductId);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || error?.message || '❌ Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const previewImage = images.find((image) => image.is_primary === 1)?.image_url || images[0]?.image_url || null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <p className={styles.breadcrumb}>Apps / Ecommerce</p>
          <h1 className={styles.title}>Add Product</h1>
          <p className={styles.subtitle}>
            Build out product information, media, pricing, inventory, and publish settings.
          </p>
        </div>

        <div className={styles.topActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => navigate('/product')}>
            Cancel
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => handleCreateProduct(false)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => handleCreateProduct(true)}
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish Product'}
          </button>
        </div>
      </div>

      {message && <div className={styles.alert}>{message}</div>}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Product Information</h2>
                <p>Basic product information and descriptions.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldFull}>
                <label htmlFor="name">Product Name</label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                />
              </div>

              <div className={styles.fieldThird}>
                <label htmlFor="productCode">Product Code</label>
                <input
                  id="productCode"
                  name="productCode"
                  value={form.productCode}
                  onChange={handleChange}
                  placeholder="PRD-1001"
                />
              </div>

              <div className={styles.fieldThird}>
                <label htmlFor="sku">SKU</label>
                <input id="sku" name="sku" value={form.sku} onChange={handleChange} placeholder="Enter SKU" />
              </div>

              <div className={styles.fieldThird}>
                <label htmlFor="brand">Brand</label>
                <input id="brand" name="brand" value={form.brand} onChange={handleChange} placeholder="Brand name" />
              </div>

              <div className={styles.fieldFull}>
                <label htmlFor="shortDescription">Short Description</label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Write a short description"
                />
              </div>

              <div className={styles.fieldFull}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={8}
                  placeholder="Write a detailed description"
                />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Product Images</h2>
                <p>Upload, preview, manage, and reorder product images.</p>
              </div>
            </div>

            <div className={styles.sectionBody}>
              <MultiImageUpload
                disabled={uploadingImages}
                maxFiles={10}
                maxFileSizeMb={5}
                accept={['image/jpeg', 'image/png', 'image/webp', 'image/avif']}
                onUpload={createdProductId ? handlePersistedUpload : handleLocalImagesSelected}
                onUploaded={() => {
                  if (createdProductId) {
                    setMessage('✅ Images uploaded successfully');
                  } else {
                    setMessage('Images added locally. They will be uploaded after product creation.');
                  }
                }}
              />

              {images.length > 0 && (
                <div className={styles.imageGridWrapper}>
                  <ProductImagesSortableGrid
                    productId={createdProductId}
                    images={images}
                    onImagesChange={handleImagesChange}
                    onSetPrimary={handleSetPrimary}
                    onDelete={handleDeleteImage}
                    onEditAltText={handleEditAltText}
                  />
                </div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Pricing</h2>
                <p>Set product pricing, sale pricing, and tax settings.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldThird}>
                <label htmlFor="regularPrice">Regular Price</label>
                <input
                  id="regularPrice"
                  name="regularPrice"
                  value={form.regularPrice}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.fieldThird}>
                <label htmlFor="salePrice">Business Price</label>
                <input
                  id="salePrice"
                  name="salePrice"
                  value={form.salePrice}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.fieldThird}>
                <label htmlFor="taxRate">Tax Rate (%)</label>
                <select id="taxRate" name="taxRate" value={form.taxRate} onChange={handleChange}>
                  <option value="25">25%</option>
                  <option value="13">13%</option>
                  <option value="5">5%</option>
                  <option value="0">0%</option>
                </select>
              </div>
            </div>

            <div className={styles.sectionDivider} />

            <div className={styles.innerSection}>
              <div className={styles.innerSectionHeader}>
                <div>
                  <h3>Discount</h3>
                  <p>Configure promotional pricing and active discount period.</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.fieldThird}>
                  <label htmlFor="discountType">Discount Type</label>
                  <select id="discountType" name="discountType" value={form.discountType} onChange={handleChange}>
                    <option value="none">No discount</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>

                <div className={styles.fieldThird}>
                  <label htmlFor="discountValue">Discount Value</label>
                  <input
                    id="discountValue"
                    name="discountValue"
                    value={form.discountValue}
                    onChange={handleChange}
                    placeholder={form.discountType === 'percentage' ? '10' : '5.00'}
                    disabled={form.discountType === 'none'}
                  />
                </div>

                <div className={styles.fieldThird}>
                  <label htmlFor="salePricePreview">Preview</label>
                  <input
                    id="salePricePreview"
                    value={
                      form.discountType === 'none'
                        ? 'No discount'
                        : form.discountType === 'percentage'
                          ? `${form.discountValue || '0'}% off`
                          : `${form.discountValue || '0.00'} fixed discount`
                    }
                    readOnly
                  />
                </div>

                <div className={styles.fieldHalf}>
                  <label htmlFor="discountStart">Discount Start</label>
                  <input
                    id="discountStart"
                    name="discountStart"
                    type="datetime-local"
                    value={form.discountStart}
                    onChange={handleChange}
                    disabled={form.discountType === 'none'}
                  />
                </div>

                <div className={styles.fieldHalf}>
                  <label htmlFor="discountEnd">Discount End</label>
                  <input
                    id="discountEnd"
                    name="discountEnd"
                    type="datetime-local"
                    value={form.discountEnd}
                    onChange={handleChange}
                    disabled={form.discountType === 'none'}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Inventory</h2>
                <p>Track stock levels and low-stock limits.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldHalf}>
                <label htmlFor="stock">Stock Quantity</label>
                <input id="stock" name="stock" value={form.stock} onChange={handleChange} placeholder="0" />
              </div>

              <div className={styles.fieldHalf}>
                <label htmlFor="minStock">Minimum Stock Alert</label>
                <input id="minStock" name="minStock" value={form.minStock} onChange={handleChange} placeholder="5" />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Shipping Details</h2>
                <p>Enter product shipping dimensions and weight.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldQuarter}>
                <label htmlFor="weight">Weight</label>
                <input id="weight" name="weight" value={form.weight} onChange={handleChange} placeholder="1.2 kg" />
              </div>

              <div className={styles.fieldQuarter}>
                <label htmlFor="width">Width</label>
                <input id="width" name="width" value={form.width} onChange={handleChange} placeholder="20 cm" />
              </div>

              <div className={styles.fieldQuarter}>
                <label htmlFor="height">Height</label>
                <input id="height" name="height" value={form.height} onChange={handleChange} placeholder="30 cm" />
              </div>

              <div className={styles.fieldQuarter}>
                <label htmlFor="length">Length</label>
                <input id="length" name="length" value={form.length} onChange={handleChange} placeholder="40 cm" />
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Publish</h2>
                <p>Control visibility and publication settings.</p>
              </div>
            </div>

            <div className={styles.sideStack}>
              <div className={styles.field}>
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={form.status} onChange={handleChange}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="visibility">Visibility</label>
                <select id="visibility" name="visibility" value={form.visibility} onChange={handleChange}>
                  <option value="public">Public</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <label className={styles.checkboxRow}>
                <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} />
                <span>Featured product</span>
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Product Category</h2>
                <p>Assign the product to a category and add tags.</p>
              </div>
            </div>

            <div className={styles.sideStack}>
              <div className={styles.field}>
                <label htmlFor="categoryId">Category</label>
                <select id="categoryId" name="categoryId" value={form.categoryId} onChange={handleChange}>
                  <option value="">Select category</option>
                  {fakeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.summaryBox}>
                <span className={styles.summaryLabel}>Selected Category</span>
                <strong>{selectedCategory}</strong>
              </div>

              <div className={styles.field}>
                <label htmlFor="tags">Tags</label>
                <input
                  id="tags"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="bathroom, ceramic, premium"
                />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
