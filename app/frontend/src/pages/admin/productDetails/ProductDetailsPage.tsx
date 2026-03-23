import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Input, { InputType } from '../../../components/input/Input';
import ProductImagesSortableGrid from '../../../components/productImages/ProductImageSortableGrid';
import { fetchProductById, updateProduct } from '../../../api/product';
import { fetchCategories, fetchSubcategories } from '../../../api/category';
import {
  deleteProductImage,
  getProductImages,
  setPrimaryProductImage,
  updateProductImageAltText,
  uploadProductImages,
  type ProductImage,
} from '../../../api/productImage';
import styles from '../../../index.module.scss';

type CategoryOption = {
  id: number;
  name: string;
  slug: string;
};

type SubcategoryOption = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
};

type ProductFormState = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  subcategoryId: string;
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

type UpdateProductPayload = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  subcategoryId: number | null;
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

const emptyForm: ProductFormState = {
  name: '',
  description: '',
  stock: 0,
  categoryId: 0,
  subcategoryId: '',
  isPublished: false,
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

const round2 = (value: number) => Math.round(value * 100) / 100;
const grossFromNet = (net: number, vatRate: number) => round2(net * (1 + vatRate / 100));
const netFromGross = (gross: number, vatRate: number) => round2(gross / (1 + vatRate / 100));

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const productId = useMemo(() => Number(id), [id]);

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [message, setMessage] = useState('');

  const loadSubcategories = async (categoryId: number): Promise<SubcategoryOption[]> => {
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setSubcategories([]);
      return [];
    }

    try {
      const data = await fetchSubcategories(categoryId);
      setSubcategories(data);
      return data;
    } catch (error) {
      console.error(error);
      setSubcategories([]);
      return [];
    }
  };

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
        const data = await fetchCategories();
        setCategories(data);
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
          categoryId: product.categoryId || 0,
          subcategoryId: product.subcategoryId ? String(product.subcategoryId) : '',
          isPublished: Boolean(product.isPublished),
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

        if (nextForm.categoryId > 0) {
          const fetchedSubcategories = await loadSubcategories(nextForm.categoryId);

          const isValidSubcategory = fetchedSubcategories.some(
            (subcategory) => String(subcategory.id) === nextForm.subcategoryId,
          );

          if (!isValidSubcategory) {
            nextForm.subcategoryId = '';
          }
        } else {
          nextForm.subcategoryId = '';
          setSubcategories([]);
        }

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

  const handleFieldChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ): Promise<void> => {
    const { name, value, type } = e.target;

    if (name === 'categoryId') {
      const nextCategoryId = Number(value);

      setForm((prev) => ({
        ...prev,
        categoryId: nextCategoryId,
        subcategoryId: '',
      }));

      await loadSubcategories(nextCategoryId);
      return;
    }

    const nextValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? Number(value) : value;

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

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const fileList = e.target.files;

    if (!fileList) {
      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(Array.from(fileList));
  };

  const handleUploadImages = async (): Promise<void> => {
    if (!productId || selectedFiles.length === 0) {
      return;
    }

    setUploadingImages(true);
    setMessage('');

    try {
      await uploadProductImages(productId, selectedFiles);
      setSelectedFiles([]);
      await loadProductImages(productId);
      setMessage('✅ Images uploaded successfully');
    } catch (error) {
      console.error(error);
      setMessage('❌ Failed to upload images');
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

    try {
      const payload: UpdateProductPayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        stock: Number(form.stock),
        categoryId: Number(form.categoryId),
        subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
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
      await loadProductImages(productId);
      setMessage('✅ Product updated successfully');
    } catch (error: any) {
      console.error(error);
      setMessage(error?.response?.data?.message || '❌ Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.page}>Loading product...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Edit Product</h2>
        {message && <p className={styles.message}>{message}</p>}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          {baseInputs.map((input, index) => (
            <div key={index}>
              <Input {...input} />
            </div>
          ))}

          <div className={styles.field}>
            <label htmlFor="categoryId" className={styles.label}>
              Category
            </label>

            <select
              id="categoryId"
              name="categoryId"
              value={form.categoryId || ''}
              onChange={handleFieldChange}
              className={styles.select}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="subcategoryId" className={styles.label}>
              Subcategory
            </label>

            <select
              id="subcategoryId"
              name="subcategoryId"
              value={form.subcategoryId}
              onChange={handleFieldChange}
              className={styles.select}
              disabled={!form.categoryId}
            >
              <option value="">Select subcategory</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>
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
            rows={5}
            className={styles.textarea}
          />
        </div>

        <section className={styles.imageSection}>
          <div className={styles.sectionHeader}>
            <h3>Product Images</h3>
          </div>

          <div className={styles.uploadBox}>
            <label htmlFor="productImages" className={styles.label}>
              Upload new images
            </label>

            <input
              id="productImages"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              multiple
              onChange={handleFileSelection}
              className={styles.fileInput}
            />

            {selectedFiles.length > 0 && (
              <div className={styles.selectedFiles}>
                {selectedFiles.map((file) => (
                  <span key={`${file.name}-${file.lastModified}`} className={styles.fileTag}>
                    {file.name}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.imageActions}>
              <button
                type="button"
                onClick={handleUploadImages}
                className={styles.secondaryButton}
                disabled={uploadingImages || selectedFiles.length === 0}
              >
                {uploadingImages ? 'Uploading...' : 'Upload selected images'}
              </button>
            </div>
          </div>

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
        </section>

        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <h3>Retail Pricing</h3>

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
            <h3>Business Pricing</h3>

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

        <div className={styles.checkboxRow}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleFieldChange} />
            <span>Published</span>
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={() => navigate('/product')}>
            Back
          </button>

          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductDetailsPage;
