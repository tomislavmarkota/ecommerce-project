import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { createProduct } from '../../../api/product';
import { fetchCategoryTree, CategoryTreeNode } from '../../../api/category';
import { flattenCategoryTree } from '../../../utils/categoryTree';
import styles from './AddProduct.module.scss';

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

const initialState: ProductFormState = {
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

export default function AddProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductFormState>(initialState);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategoryTree();
        setCategoryTree(data);
      } catch (error) {
        console.error('Failed to load category tree', error);
      }
    };

    loadCategories();
  }, []);

  const categoryOptions = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);

  const handleChange = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePricingChange = (
    group: 'retail' | 'business',
    field: 'priceNet' | 'vatRate' | 'priceGross',
    value: number,
  ) => {
    setForm((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [group]: {
          ...prev.pricing[group],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert('Product name is required');
      return;
    }

    if (form.categoryId === '') {
      alert('Category is required');
      return;
    }

    setSubmitting(true);

    try {
      await createProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        stock: form.stock,
        categoryId: Number(form.categoryId),
        isPublished: form.isPublished,
        pricing: form.pricing,
      });

      alert('Product created successfully');
      navigate('/admin/products');
    } catch (error) {
      console.error(error);
      alert('Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="name">Name</label>
        <input id="name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="stock">Stock</label>
        <input
          id="stock"
          type="number"
          min={0}
          value={form.stock}
          onChange={(e) => handleChange('stock', Number(e.target.value))}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="categoryId">Category</label>
        <select
          id="categoryId"
          value={form.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Select category</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.checkboxField}>
        <label>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => handleChange('isPublished', e.target.checked)}
          />
          Published
        </label>
      </div>

      <div className={styles.pricingGrid}>
        <div className={styles.priceCard}>
          <h3>Retail pricing</h3>
          <input
            type="number"
            step="0.01"
            value={form.pricing.retail.priceNet}
            onChange={(e) => handlePricingChange('retail', 'priceNet', Number(e.target.value))}
            placeholder="Net price"
          />
          <input
            type="number"
            step="0.01"
            value={form.pricing.retail.vatRate}
            onChange={(e) => handlePricingChange('retail', 'vatRate', Number(e.target.value))}
            placeholder="VAT"
          />
          <input
            type="number"
            step="0.01"
            value={form.pricing.retail.priceGross}
            onChange={(e) => handlePricingChange('retail', 'priceGross', Number(e.target.value))}
            placeholder="Gross price"
          />
        </div>

        <div className={styles.priceCard}>
          <h3>Business pricing</h3>
          <input
            type="number"
            step="0.01"
            value={form.pricing.business.priceNet}
            onChange={(e) => handlePricingChange('business', 'priceNet', Number(e.target.value))}
            placeholder="Net price"
          />
          <input
            type="number"
            step="0.01"
            value={form.pricing.business.vatRate}
            onChange={(e) => handlePricingChange('business', 'vatRate', Number(e.target.value))}
            placeholder="VAT"
          />
          <input
            type="number"
            step="0.01"
            value={form.pricing.business.priceGross}
            onChange={(e) => handlePricingChange('business', 'priceGross', Number(e.target.value))}
            placeholder="Gross price"
          />
        </div>
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Create product'}
      </button>
    </form>
  );
}
