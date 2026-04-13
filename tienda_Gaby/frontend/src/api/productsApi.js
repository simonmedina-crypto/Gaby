import axios from 'axios';

// URL de la API local
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Para productos, necesitamos el endpoint correcto
const PRODUCTS_API_URL = `${API_URL}/productos`;
const INVENTORY_CREATE_URL = `${API_URL}/inventory/create`;

export const getProducts = () => axios.get(PRODUCTS_API_URL);
export const createProduct = (data) => axios.post(INVENTORY_CREATE_URL, data);
export const deleteProduct = (id) => axios.delete(`${PRODUCTS_API_URL}/${id}`);