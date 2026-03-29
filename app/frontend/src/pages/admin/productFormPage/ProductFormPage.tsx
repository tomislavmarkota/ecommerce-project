import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import styles from './ProductFormPage.module.scss';
import ProductImagesSortableGrid from '../../../components/productImages/ProductImageSortableGrid';
import MultiImageUpload from '../../../components/multiImageUpload/MultiImageUpload';
import {
  createProduct,
  fetchProductById,
  updateProduct,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '../../../api/product';
import {
  deleteProductImage,
  getProductImages,
  setPrimaryProductImage,
  updateProductImageAltText,
  uploadProductImages,
  type ProductImage,
} from '../../../api/productImage';
import CategoryTreePicker, {
  type SelectedCategoryItem,
} from '../../../components/categoryTreePicker/CategoryTreePicker';
type ProductDraft = {
  name: string;
  productCode: string;
  sku: string;
  shortDescription: string;
  description: string;
  priceNet: string;
  priceGross: string;
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
  categoryIds: number[];
  primaryCategoryId: number | '';
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
  priceNet: '',
  priceGross: '',
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
  categoryIds: [],
  primaryCategoryId: '',
  brand: '',
  tags: '',
};

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

const netFromGross = (gross: number, vatRate: number): number => round2(gross / (1 + vatRate / 100));

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const productId = id ? Number(id) : null;
  const isEditMode = Number.isInteger(productId) && Number(productId) > 0;
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<SelectedCategoryItem[]>([]);
  const [form, setForm] = useState<ProductDraft>(initialState);
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);
  const [images, setImages] = useState<LocalProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [message, setMessage] = useState('');

  const previewImage = images.find((image) => image.is_primary === 1)?.image_url || images[0]?.image_url || null;

  const selectedCategoryIds = form.categoryIds;

  const resolvedPrimaryCategoryId = useMemo(() => {
    if (form.primaryCategoryId !== '') {
      return Number(form.primaryCategoryId);
    }

    return form.categoryIds[0] ?? null;
  }, [form.primaryCategoryId, form.categoryIds]);

  const selectedCategoryMap = useMemo(
    () => new Map(selectedCategoryItems.map((item) => [item.id, item.name])),
    [selectedCategoryItems],
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

  useEffect(() => {
    if (!isEditMode || !productId) {
      return;
    }

    let cancelled = false;

    const loadProduct = async () => {
      try {
        setPageLoading(true);
        setMessage('');

        const product = await fetchProductById(productId);

        if (cancelled) return;

        setCreatedProductId(product.id);

        setForm((prev) => ({
          ...prev,
          name: product.name ?? '',
          description: product.description ?? '',
          priceNet:
            product.pricing?.priceNet !== undefined && product.pricing?.priceNet !== null
              ? String(product.pricing.priceNet)
              : '',
          priceGross:
            product.pricing?.priceGross !== undefined && product.pricing?.priceGross !== null
              ? String(product.pricing.priceGross)
              : '',
          taxRate:
            product.pricing?.vatRate !== undefined && product.pricing?.vatRate !== null
              ? String(product.pricing.vatRate)
              : '25',
          stock: product.stock !== undefined && product.stock !== null ? String(product.stock) : '',
          categoryIds: product.categoryIds ?? [],
          primaryCategoryId: product.primaryCategoryId ?? '',
          status: product.isPublished ? 'published' : 'draft',
        }));

        const result = await getProductImages(productId);

        if (cancelled) return;

        const persistedImages: LocalProductImage[] = (result.data || []).map((image) => ({
          ...image,
          localId: `server-${image.id}`,
          isLocal: false,
        }));

        setImages(normalizeImages(persistedImages));
      } catch (error: any) {
        console.error(error);
        if (!cancelled) {
          setMessage(error?.response?.data?.message || 'Failed to load product');
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, productId]);

  const handleCategoryTreeChange = (categoryIds: number[]) => {
    setForm((prev) => {
      const currentPrimary = prev.primaryCategoryId === '' ? null : Number(prev.primaryCategoryId);

      let nextPrimaryCategoryId: number | '' = prev.primaryCategoryId;

      if (categoryIds.length === 0) {
        nextPrimaryCategoryId = '';
      } else if (currentPrimary === null || !categoryIds.includes(currentPrimary)) {
        nextPrimaryCategoryId = categoryIds[0];
      }

      return {
        ...prev,
        categoryIds,
        primaryCategoryId: nextPrimaryCategoryId,
      };
    });
  };

  const handlePrimaryCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setForm((prev) => ({
      ...prev,
      primaryCategoryId: value ? Number(value) : '',
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const nextValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleTaxRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vatRate = Number(e.target.value || 0);

    setForm((prev) => {
      const currentNet = Number(prev.priceNet || 0);

      return {
        ...prev,
        taxRate: e.target.value,
        priceGross: prev.priceNet ? String(grossFromNet(currentNet, vatRate)) : '',
      };
    });
  };

  const handlePriceNetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setForm((prev) => {
      const vatRate = Number(prev.taxRate || 0);
      const net = Number(value || 0);

      return {
        ...prev,
        priceNet: value,
        priceGross: value === '' ? '' : String(grossFromNet(net, vatRate)),
      };
    });
  };

  const handlePriceGrossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setForm((prev) => {
      const vatRate = Number(prev.taxRate || 0);
      const gross = Number(value || 0);

      return {
        ...prev,
        priceGross: value,
        priceNet: value === '' ? '' : String(netFromGross(gross, vatRate)),
      };
    });
  };

  const loadProductImages = async (nextProductId: number): Promise<void> => {
    try {
      const result = await getProductImages(nextProductId);

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
    setMessage(
      createdProductId
        ? 'Images added locally.'
        : 'Images added locally. They will be uploaded after the product is created.',
    );

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

  const uploadPendingLocalImages = async (nextProductId: number, filesToUpload?: File[]): Promise<void> => {
    const localFiles =
      filesToUpload ??
      images
        .filter((image) => image.isLocal && image.file)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((image) => image.file as File);

    if (localFiles.length === 0) {
      await loadProductImages(nextProductId);
      setMessage('✅ Product saved successfully');
      return;
    }

    setUploadingImages(true);

    try {
      const result = await uploadProductImages(nextProductId, localFiles, () => {});
      await loadProductImages(nextProductId);

      if (result.failedFiles.length > 0 && result.uploadedCount > 0) {
        setMessage('Product saved. Some images uploaded, but a few failed.');
      } else if (result.failedFiles.length > 0) {
        setMessage('Product saved, but image upload failed.');
      } else {
        setMessage('✅ Product saved and images uploaded successfully');
      }
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || 'Product saved, but failed to upload images.');
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
      if (target.isLocal && target.image_url?.startsWith('blob:')) {
        URL.revokeObjectURL(target.image_url);
      }

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

  const buildProductPayload = (publish: boolean): CreateProductPayload | UpdateProductPayload | null => {
    const name = form.name.trim();
    const description = form.description.trim();
    const stock = Number(form.stock || 0);
    const vatRate = Number(form.taxRate || 25);
    const priceNet = Number(form.priceNet || 0);
    const priceGross = Number(form.priceGross || 0);
    const primaryCategoryId =
      form.primaryCategoryId !== '' ? Number(form.primaryCategoryId) : (form.categoryIds[0] ?? 0);

    if (!name) {
      setMessage('Product name is required');
      return null;
    }

    if (!form.categoryIds.length) {
      setMessage('Please select at least one category');
      return null;
    }

    if (!primaryCategoryId || Number.isNaN(primaryCategoryId)) {
      setMessage('Please choose a primary category');
      return null;
    }

    if (!form.categoryIds.includes(primaryCategoryId)) {
      setMessage('Primary category must be one of the selected categories');
      return null;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setMessage('Please enter a valid stock quantity');
      return null;
    }

    if (Number.isNaN(priceNet) || priceNet < 0) {
      setMessage('Please enter a valid net price');
      return null;
    }

    if (Number.isNaN(priceGross) || priceGross < 0) {
      setMessage('Please enter a valid gross price');
      return null;
    }

    return {
      name,
      description,
      stock,
      categoryIds: form.categoryIds,
      primaryCategoryId,
      isPublished: publish,
      pricing: {
        priceNet: round2(priceNet),
        vatRate: round2(vatRate),
        priceGross: round2(priceGross),
      },
    };
  };

  const handleSaveProduct = async (publish: boolean): Promise<void> => {
    const payload = buildProductPayload(publish);

    if (!payload) {
      return;
    }

    const pendingLocalFiles = images
      .filter((image) => image.isLocal && image.file)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.file as File);

    try {
      setSaving(true);
      setMessage('');

      if (isEditMode && productId) {
        await updateProduct(productId, payload);
        setCreatedProductId(productId);

        setForm((prev) => ({
          ...prev,
          status: publish ? 'published' : 'draft',
        }));

        if (pendingLocalFiles.length > 0) {
          await uploadPendingLocalImages(productId, pendingLocalFiles);
        } else {
          await loadProductImages(productId);
          setMessage('✅ Product updated successfully');
        }

        return;
      }

      const created = await createProduct(payload);
      const nextProductId = created?.productId ?? created?.id;

      if (!nextProductId) {
        throw new Error('Product created but no id was returned');
      }

      setCreatedProductId(nextProductId);
      setForm((prev) => ({
        ...prev,
        status: publish ? 'published' : 'draft',
      }));

      await uploadPendingLocalImages(nextProductId, pendingLocalFiles);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || error?.message || '❌ Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.alert}>Loading product...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <p className={styles.breadcrumb}>Apps / Ecommerce</p>
          <h1 className={styles.title}>{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
          <p className={styles.subtitle}>
            {isEditMode
              ? 'Update product information, media, pricing, inventory, and publish settings.'
              : 'Build out product information, media, pricing, inventory, and publish settings.'}
          </p>
        </div>

        <div className={styles.topActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => navigate('/product')}>
            Cancel
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => handleSaveProduct(false)}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditMode ? 'Save Draft Changes' : 'Save as Draft'}
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => handleSaveProduct(true)}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditMode ? 'Update Product' : 'Publish Product'}
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
                <p>Set product base pricing, tax settings, and promotional discount preview.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldThird}>
                <label htmlFor="priceNet">Net Price</label>
                <input
                  id="priceNet"
                  name="priceNet"
                  value={form.priceNet}
                  onChange={handlePriceNetChange}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.fieldThird}>
                <label htmlFor="priceGross">Gross Price</label>
                <input
                  id="priceGross"
                  name="priceGross"
                  value={form.priceGross}
                  onChange={handlePriceGrossChange}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.fieldThird}>
                <label htmlFor="taxRate">Tax Rate (%)</label>
                <select id="taxRate" name="taxRate" value={form.taxRate} onChange={handleTaxRateChange}>
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
            <CategoryTreePicker
              value={selectedCategoryIds}
              onChange={handleCategoryTreeChange}
              onSelectionDetailsChange={setSelectedCategoryItems}
              selectionMode="multiple"
              title="Product Categories"
              subtitle="Select one or more categories for this product."
            />

            <div className={styles.sideStack}>
              <div className={styles.field}>
                <label htmlFor="primaryCategoryId">Primary Category</label>
                <select
                  id="primaryCategoryId"
                  name="primaryCategoryId"
                  value={resolvedPrimaryCategoryId ?? ''}
                  onChange={handlePrimaryCategoryChange}
                  disabled={selectedCategoryIds.length === 0}
                >
                  <option value="">Select primary category</option>
                  {selectedCategoryIds.map((categoryId) => (
                    <option key={categoryId} value={categoryId}>
                      {selectedCategoryMap.get(categoryId) ?? `Category #${categoryId}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.summaryBox}>
                <span className={styles.summaryLabel}>Selected Categories</span>
                <strong>{selectedCategoryIds.length}</strong>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Preview</h2>
                <p>Quick product summary before saving.</p>
              </div>
            </div>

            <div className={styles.sideStack}>
              {previewImage ? (
                <img src={previewImage} alt="Product preview" className={styles.previewImage} />
              ) : (
                <div className={styles.previewPlaceholder}>No image selected</div>
              )}

              <div className={styles.summaryBox}>
                <span className={styles.summaryLabel}>Base Price</span>
                <strong>{form.priceGross ? `${form.priceGross} €` : 'Not set'}</strong>
              </div>

              <div className={styles.summaryBox}>
                <span className={styles.summaryLabel}>VAT</span>
                <strong>{form.taxRate || '0'}%</strong>
              </div>

              <div className={styles.summaryBox}>
                <span className={styles.summaryLabel}>Status</span>
                <strong>{form.status}</strong>
              </div>

              <div className={styles.summaryBox}>
                <span className={styles.summaryLabel}>Primary Category</span>
                <strong>
                  {resolvedPrimaryCategoryId
                    ? (selectedCategoryMap.get(resolvedPrimaryCategoryId) ?? `Category #${resolvedPrimaryCategoryId}`)
                    : 'Not selected'}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
