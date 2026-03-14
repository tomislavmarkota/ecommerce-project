import { useEffect, useState } from 'react';
import PageTitle from '../../../components/pageTitle/PageTitle';
import { fetchProducts } from '../../../api/product';
import { useNavigate } from 'react-router';

type Product = {
  id: number;
  name: string;
};

function Product() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetchProducts();
        console.log('PRODUCTS:', res);
        setProducts(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);
  return (
    <div>
      <PageTitle name={'Product'} />
      <button onClick={() => navigate('/product/add-product')}>Add product</button>
      <button>Add category</button>
      <button>Add subcategory</button>
      <ul>
        {products &&
          products.map((product) => {
            return <li key={product.id}>{product.name}</li>;
          })}
      </ul>
    </div>
  );
}

export default Product;
