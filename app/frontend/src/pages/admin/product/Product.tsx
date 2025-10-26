import { useEffect } from 'react';
import PageTitle from '../../../components/pageTitle/PageTitle';
import { fetchProducts } from '../../../api/product';

function Product() {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetchProducts();
        console.log('PRODUCTS:', res);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);
  return (
    <div>
      <PageTitle name={'Product'} />
    </div>
  );
}

export default Product;
