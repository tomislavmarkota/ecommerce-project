import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import Input, { InputType } from '../../../components/input/Input';
import { useCreateProduct } from '../../../hooks/useCreateProduct';
import styles from './AddProduct.module.scss';

type ProductFormState = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  subcategoryId: number | '';
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

const initialForm: ProductFormState = {
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

const AdminAddProduct = () => {
  const navigate = useNavigate();
  const createProductMutation = useCreateProduct();

  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [message, setMessage] = useState('');

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
    {
      inputProps: {
        type: 'number',
        placeholder: 'Category ID',
        name: 'categoryId',
        required: true,
        min: 1,
        value: form.categoryId || '',
        onChange: handleFieldChange,
      },
      label: { text: 'Category ID' },
    },
    {
      inputProps: {
        type: 'number',
        placeholder: 'Subcategory ID',
        name: 'subcategoryId',
        min: 1,
        value: form.subcategoryId,
        onChange: handleFieldChange,
      },
      label: { text: 'Subcategory ID (optional)' },
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const res = await createProductMutation.mutateAsync(payload);

      setMessage(`✅ Product added with ID: ${res.productId}`);
      setForm(initialForm);

      // navigate('/product');
    } catch (err: any) {
      setMessage(err?.response?.data?.message || '❌ Failed to add product');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Add New Product</h2>
        {message && <p className={styles.message}>{message}</p>}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          {baseInputs.map((input, i) => (
            <div key={i}>
              <Input {...input} />
            </div>
          ))}
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
            Cancel
          </button>

          <button type="submit" className={styles.primaryButton} disabled={createProductMutation.isPending}>
            {createProductMutation.isPending ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddProduct;
