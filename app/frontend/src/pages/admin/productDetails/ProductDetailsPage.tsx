import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Input, { InputType } from '../../../components/input/Input';
import { fetchProductById, updateProduct } from '../../../api/product';
import { fetchCategories, fetchSubcategories } from '../../../api/category';
import styles from '../addProduct/AddProduct.module.scss';

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

const emptyForm: ProductFormState = {
  name: '',
  description: '',
  stock: 0,
  categoryId: 0,
  subcategoryId: '',
  isPublished: false,
  images: [''],
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

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadSubcategories = async (categoryId: number) => {
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

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!id) return;

      try {
        const product = await fetchProductById(Number(id));

        const nextForm: ProductFormState = {
          name: product.name || '',
          description: product.description || '',
          stock: product.stock || 0,
          categoryId: product.categoryId || 0,
          subcategoryId: product.subcategoryId ? String(product.subcategoryId) : '',
          isPublished: Boolean(product.isPublished),
          images: product.images?.length ? product.images : [''],
          pricing: {
            retail: {
              priceNet: product.pricing.retail?.priceNet ?? 0,
              vatRate: product.pricing.retail?.vatRate ?? 25,
              priceGross: product.pricing.retail?.priceGross ?? 0,
            },
            business: {
              priceNet: product.pricing.business?.priceNet ?? 0,
              vatRate: product.pricing.business?.vatRate ?? 25,
              priceGross: product.pricing.business?.priceGross ?? 0,
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
          setSubcategories([]);
          nextForm.subcategoryId = '';
        }

        setForm(nextForm);
      } catch (err) {
        console.error(err);
        setMessage('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  const handleFieldChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
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
      type === 'number' ? Number(value) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handlePricingChange = (
    pricingType: 'retail' | 'business',
    field: 'priceNet' | 'priceGross' | 'vatRate',
    value: number,
  ) => {
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

  const handleImageChange = (index: number, value: string) => {
    setForm((prev) => {
      const nextImages = [...prev.images];
      nextImages[index] = value;

      return {
        ...prev,
        images: nextImages,
      };
    });
  };

  const addImageField = () => {
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ''],
    }));
  };

  const removeImageField = (index: number) => {
    setForm((prev) => {
      const nextImages = prev.images.filter((_, i) => i !== index);

      return {
        ...prev,
        images: nextImages.length ? nextImages : [''],
      };
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setMessage('');

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        stock: Number(form.stock),
        categoryId: Number(form.categoryId),
        subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
        images: form.images.filter((url) => url.trim() !== ''),
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

      await updateProduct(Number(id), payload);
      setMessage('✅ Product updated successfully');
    } catch (err: any) {
      console.error(err);
      setMessage(err?.response?.data?.message || '❌ Failed to update product');
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
        <h2>Edit Product</h2>
        {message && <p className={styles.message}>{message}</p>}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          {baseInputs.map((input, i) => (
            <div key={i}>
              <Input {...input} />
            </div>
          ))}

          <div>
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

          <div>
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

        <div className={styles.imageSection}>
          <div className={styles.sectionHeader}>
            <h3>Images</h3>
            <button type="button" onClick={addImageField} className={styles.secondaryButton}>
              Add image
            </button>
          </div>

          <div className={styles.imageGrid}>
            {form.images.map((image, index) => (
              <div key={index} className={styles.imageRow}>
                <Input
                  inputProps={{
                    type: 'text',
                    placeholder: 'Image URL',
                    value: image,
                    onChange: (e) => handleImageChange(index, e.target.value),
                  }}
                  label={{ text: `Image ${index + 1}` }}
                />

                <button
                  type="button"
                  onClick={() => removeImageField(index)}
                  className={styles.removeButton}
                  disabled={form.images.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

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
}
