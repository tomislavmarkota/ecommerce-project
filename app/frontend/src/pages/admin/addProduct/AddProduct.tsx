import React, { useState } from 'react';
import { addProduct } from '../../../api/product';
import { ProductInput } from '../../../types/product';
import Input, { InputType } from '../../../components/input/Input';

const AdminAddProduct = () => {
  const [form, setForm] = useState<ProductInput>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    categoryId: 0,
    subcategoryId: undefined,
    imageUrl: '',
    isPublished: true,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const inputs: InputType[] = [
    {
      inputProps: {
        type: 'text',
        placeholder: 'Product name',
        name: 'name',
        required: true,
        value: form.name,
        onChange: handleChange,
      },
      label: { text: 'Product Name' },
    },
    {
      inputProps: {
        type: 'number',
        placeholder: 'Price',
        name: 'price',
        required: true,
        value: form.price,
        onChange: handleChange,
      },
      label: { text: 'Price' },
    },
    {
      inputProps: {
        type: 'number',
        placeholder: 'Stock quantity',
        name: 'stock',
        required: true,
        value: form.stock,
        onChange: handleChange,
      },
      label: { text: 'Quantity' },
    },
    {
      inputProps: {
        type: 'number',
        placeholder: 'Category ID',
        name: 'categoryId',
        required: true,
        value: form.categoryId,
        onChange: handleChange,
      },
      label: { text: 'Category ID' },
    },
    {
      inputProps: {
        type: 'number',
        placeholder: 'Subcategory ID (optional)',
        name: 'subcategoryId',
        value: form.subcategoryId || '',
        onChange: handleChange,
      },
      label: { text: 'Subcategory ID' },
    },
    {
      inputProps: {
        type: 'text',
        placeholder: 'Image URL',
        name: 'imageUrl',
        value: form.imageUrl,
        onChange: handleChange,
      },
      label: { text: 'Image URL' },
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await addProduct(form);
      setMessage(`✅ Product added with ID: ${res.productId}`);
      setForm({
        name: '',
        description: '',
        price: 0,
        stock: 0,
        categoryId: 0,
        subcategoryId: undefined,
        imageUrl: '',
        isPublished: true,
      });
    } catch (err: any) {
      setMessage(err.response?.data?.message || '❌ Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-add-product">
      <h2>Add New Product</h2>
      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        {inputs.map((input, i) => (
          <div key={i} style={{ marginBottom: '10px' }}>
            <Input {...input} />
          </div>
        ))}

        {/* Description (textarea) */}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="description">Description</label>
          <textarea
            name="description"
            id="description"
            placeholder="Product description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            style={{ width: '100%' }}
          />
        </div>

        {/* Publish checkbox */}
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleChange} /> Published
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

export default AdminAddProduct;
