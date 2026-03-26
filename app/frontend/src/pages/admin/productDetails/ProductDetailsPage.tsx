import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Input, { InputType } from '../../../components/input/Input';
import ProductImagesSortableGrid from '../../../components/productImages/ProductImageSortableGrid';
import MultiImageUpload from '../../../components/multiImageUpload/MultiImageUpload';
import { fetchProductById, updateProduct } from '../../../api/product';
import { fetchCategoryTree, type CategoryTreeNode } from '../../../api/category';
import { flattenCategoryTree, type CategoryOption } from '../../../utils/categoryTree';
import {
  deleteProductImage,
  getProductImages,
  setPrimaryProductImage,
  updateProductImageAltText,
  uploadProductImages,
  type ProductImage,
} from '../../../api/productImage';
import styles from './productDetails.module.scss';
import SearchableTreeSelect from '../../../components/searchableTreeSelect/SearchableTreeSelect';

type ProductFormState = {
  name: string;
  description: string;
  stock: number;
  categoryId: number | '';
  isPublished: boolean;
  images: string[];
  pricing: {
    retail: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    business: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
};

type UpdateProductPayload = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  isPublished: boolean;
  pricing: {
    retail: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    business: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
};

type UploadFailedFile = {
  fileName: string;
  message?: string;
};

type UploadImagesResult = {
  uploadedCount: number;
  failedFiles: UploadFailedFile[];
};

const emptyForm: ProductFormState = {
  name: '',
  description: '',
  stock: 0,
  categoryId: '',
  isPublished: false,
  images: [],
  pricing: {
    retail: {
      priceNet: 0,
      vatRate: 25,
      priceGross: 0,
    },
    business: {
      priceNet: 0,
      vatRate: 25,
      priceGross: 0,
    },
  },
};

const round2 = (value: number): number => Math.round(value * 100) / 100;
const grossFromNet = (net: number, vatRate: number): number => round2(net * (1 + vatRate / 100));
const netFromGross = (gross: number, vatRate: number): number => round2(gross / (1 + vatRate / 100));

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const productId = useMemo(() => Number(id), [id]);

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [message, setMessage] = useState('');

  const categoryOptions = useMemo<CategoryOption[]>(() => flattenCategoryTree(categoryTree), [categoryTree]);

  const loadProductImages = async (nextProductId: number): Promise<void> => {
    try {
      const result = await getProductImages(nextProductId);
      setImages(result.data || []);
    } catch (error) {
      console.error(error);
      setImages([]);
    }
  };

  useEffect(() => {
    const loadCategories = async (): Promise<void> => {
      try {
        const data = await fetchCategoryTree();
        setCategoryTree(data);
      } catch (error) {
        console.error(error);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    const loadPage = async (): Promise<void> => {
      if (!productId || Number.isNaN(productId)) {
        setLoading(false);
        return;
      }

      try {
        const product = await fetchProductById(productId);

        const nextForm: ProductFormState = {
          name: product.name || '',
          description: product.description || '',
          stock: product.stock || 0,
          categoryId: product.categoryId || '',
          isPublished: Boolean(product.isPublished),
          images: [],
          pricing: {
            retail: {
              priceNet: product.pricing?.retail?.priceNet ?? 0,
              vatRate: product.pricing?.retail?.vatRate ?? 25,
              priceGross: product.pricing?.retail?.priceGross ?? 0,
            },
            business: {
              priceNet: product.pricing?.business?.priceNet ?? 0,
              vatRate: product.pricing?.business?.vatRate ?? 25,
              priceGross: product.pricing?.business?.priceGross ?? 0,
            },
          },
        };

        setForm(nextForm);
        await loadProductImages(productId);
      } catch (error) {
        console.error(error);
        setMessage('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    void loadPage();
  }, [productId]);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value, type } = e.target;

    const nextValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : name === 'categoryId'
          ? value
            ? Number(value)
            : ''
          : type === 'number'
            ? Number(value)
            : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handlePricingChange = (
    pricingType: 'retail' | 'business',
    field: 'priceNet' | 'priceGross' | 'vatRate',
    value: number,
  ): void => {
    setForm((prev) => {
      const nextPricing = {
        ...prev.pricing[pricingType],
        [field]: value,
      };

      if (field === 'priceNet' || field === 'vatRate') {
        nextPricing.priceGross = grossFromNet(nextPricing.priceNet, nextPricing.vatRate);
      }

      if (field === 'priceGross') {
        nextPricing.priceNet = netFromGross(nextPricing.priceGross, nextPricing.vatRate);
      }

      return {
        ...prev,
        pricing: {
          ...prev.pricing,
          [pricingType]: nextPricing,
        },
      };
    });
  };

  const handleUploadImages = async (
    files: File[],
    onProgress: (file: File, progress: number) => void,
  ): Promise<UploadImagesResult> => {
    if (!productId || files.length === 0) {
      return {
        uploadedCount: 0,
        failedFiles: [],
      };
    }

    setUploadingImages(true);
    setMessage('');

    try {
      const result = await uploadProductImages(productId, files, onProgress);
      await loadProductImages(productId);

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

  const handleSetPrimary = async (imageId: number): Promise<void> => {
    if (!productId) {
      return;
    }

    try {
      await setPrimaryProductImage(productId, imageId);

      setImages((prev) =>
        prev.map((image) => ({
          ...image,
          is_primary: image.id === imageId ? 1 : 0,
        })),
      );

      setMessage('Primary image updated successfully');
    } catch (error) {
      console.error(error);
      setMessage('❌ Failed to update primary image');
    }
  };

  const handleDeleteImage = async (imageId: number): Promise<void> => {
    try {
      await deleteProductImage(imageId);

      setImages((prev) =>
        prev
          .filter((image) => image.id !== imageId)
          .map((image, index) => ({
            ...image,
            sort_order: index,
          })),
      );

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

  const baseInputs: InputType[] = [
    {
      inputProps: {
        type: 'text',
        placeholder: 'Product name',
        name: 'name',
        required: true,
        value: form.name,
        onChange: handleFieldChange,
      },
      label: { text: 'Product name' },
    },
    {
      inputProps: {
        type: 'number',
        placeholder: 'Stock quantity',
        name: 'stock',
        required: true,
        min: 0,
        value: form.stock,
        onChange: handleFieldChange,
      },
      label: { text: 'Stock' },
    },
  ];

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!productId) {
      return;
    }

    setSaving(true);
    setMessage('');

    if (!form.categoryId) {
      setMessage('Please select a category');
      setSaving(false);
      return;
    }

    try {
      const payload: UpdateProductPayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        stock: Number(form.stock),
        categoryId: Number(form.categoryId),
        isPublished: form.isPublished,
        pricing: {
          retail: {
            priceNet: Number(form.pricing.retail.priceNet),
            vatRate: Number(form.pricing.retail.vatRate),
            priceGross: Number(form.pricing.retail.priceGross),
          },
          business: {
            priceNet: Number(form.pricing.business.priceNet),
            vatRate: Number(form.pricing.business.vatRate),
            priceGross: Number(form.pricing.business.priceGross),
          },
        },
      };

      await updateProduct(productId, payload);
      setMessage('✅ Product updated successfully');
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || '❌ Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categoryOptions.find((category) => category.id === form.categoryId);

  if (loading) {
    return <div className={styles.pageState}>Loading product...</div>;
  }

  if (!productId || Number.isNaN(productId)) {
    return <div className={styles.pageState}>Product not found</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>E-commerce / Products</p>
          <h1 className={styles.pageTitle}>Product details</h1>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => navigate('/product')}>
            Back
          </button>

          <button
            type="submit"
            form="product-details-form"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save product'}
          </button>
        </div>
      </div>

      {message && <div className={styles.alert}>{message}</div>}

      <section className={styles.infoCard}>
        <div className={styles.infoLeft}>
          <div className={styles.productAvatar}>{form.name?.slice(0, 1).toUpperCase() || 'P'}</div>

          <div>
            <h2 className={styles.productName}>{form.name || 'Unnamed product'}</h2>
            <p className={styles.joinedText}>Product ID: {productId}</p>

            <div className={styles.roleRow}>
              <span className={`${styles.badge} ${form.isPublished ? styles.published : styles.draft}`}>
                {form.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.infoRight}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Category</span>
            <strong>{selectedCategory?.label || 'No category selected'}</strong>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Stock</span>
            <strong>{form.stock}</strong>
          </div>
        </div>
      </section>

      <form id="product-details-form" onSubmit={handleSubmit} className={styles.formLayout}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>General information</h3>
              <p>Manage base product details and category assignment.</p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.formGrid}>
              {baseInputs.map((input, index) => (
                <div key={index}>
                  <Input {...input} />
                </div>
              ))}

              <SearchableTreeSelect
                id="categoryId"
                label="Category"
                value={form.categoryId}
                options={categoryOptions}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    categoryId: value,
                  }))
                }
                placeholder="Select category"
                searchPlaceholder="Search category..."
                emptyText="No matching categories"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Description
              </label>

              <textarea
                id="description"
                name="description"
                placeholder="Product description"
                value={form.description}
                onChange={handleFieldChange}
                rows={6}
                className={styles.textarea}
              />
            </div>

            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleFieldChange} />
                <span>Published</span>
              </label>
            </div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Product images</h3>
              <p>Upload, preview, manage, and reorder product images.</p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            <MultiImageUpload
              disabled={uploadingImages}
              maxFiles={10}
              maxFileSizeMb={5}
              accept={['image/jpeg', 'image/png', 'image/webp', 'image/avif']}
              onUpload={handleUploadImages}
              onUploaded={() => {
                setMessage('✅ Images uploaded successfully');
              }}
            />

            <div className={styles.imageGridWrapper}>
              <ProductImagesSortableGrid
                productId={productId}
                images={images}
                onImagesChange={setImages}
                onSetPrimary={handleSetPrimary}
                onDelete={handleDeleteImage}
                onEditAltText={handleEditAltText}
              />
            </div>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Pricing</h3>
              <p>Maintain separate retail and business pricing structures.</p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.pricingGrid}>
              <div className={styles.pricingCard}>
                <h4 className={styles.pricingTitle}>Retail pricing</h4>

                <Input
                  inputProps={{
                    type: 'number',
                    step: '0.01',
                    value: form.pricing.retail.priceNet,
                    onChange: (e) => handlePricingChange('retail', 'priceNet', Number(e.target.value)),
                  }}
                  label={{ text: 'Net price' }}
                />

                <Input
                  inputProps={{
                    type: 'number',
                    step: '0.01',
                    value: form.pricing.retail.vatRate,
                    onChange: (e) => handlePricingChange('retail', 'vatRate', Number(e.target.value)),
                  }}
                  label={{ text: 'VAT rate (%)' }}
                />

                <Input
                  inputProps={{
                    type: 'number',
                    step: '0.01',
                    value: form.pricing.retail.priceGross,
                    onChange: (e) => handlePricingChange('retail', 'priceGross', Number(e.target.value)),
                  }}
                  label={{ text: 'Gross price' }}
                />
              </div>

              <div className={styles.pricingCard}>
                <h4 className={styles.pricingTitle}>Business pricing</h4>

                <Input
                  inputProps={{
                    type: 'number',
                    step: '0.01',
                    value: form.pricing.business.priceNet,
                    onChange: (e) => handlePricingChange('business', 'priceNet', Number(e.target.value)),
                  }}
                  label={{ text: 'Net price' }}
                />

                <Input
                  inputProps={{
                    type: 'number',
                    step: '0.01',
                    value: form.pricing.business.vatRate,
                    onChange: (e) => handlePricingChange('business', 'vatRate', Number(e.target.value)),
                  }}
                  label={{ text: 'VAT rate (%)' }}
                />

                <Input
                  inputProps={{
                    type: 'number',
                    step: '0.01',
                    value: form.pricing.business.priceGross,
                    onChange: (e) => handlePricingChange('business', 'priceGross', Number(e.target.value)),
                  }}
                  label={{ text: 'Gross price' }}
                />
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
};

export default ProductDetailsPage;
