import React, { useEffect } from 'react';
import PageTitle from '../../../components/pageTitle/PageTitle';
import axios from 'axios';
import Table from '../../../components/table/table';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Customers() {
  useEffect(() => {
    const users = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/all`);

        console.log('customers', res.data);
      } catch (err) {
        console.log('err from customers', err);
      }
    };
    users();
  }, []);

  return (
    <div>
      <PageTitle name={'Customers'} />
      <Table />
    </div>
  );
}

export default Customers;
