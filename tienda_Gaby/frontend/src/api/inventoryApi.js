const API_URL = import.meta.env.VITE_API_URL || '/api';

// Obtener todos los productos
export const getInventory = async () => {
  try {
    const response = await fetch(`${API_URL}/productos`);
    if (!response.ok) {
      throw new Error('Error al obtener inventario');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getInventory:', error);
    throw error;
  }
};

// Crear nuevo producto
export const createProduct = async (productData) => {
  try {
    const response = await fetch(`${API_URL}/inventory/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error al crear producto');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en createProduct:', error);
    throw error;
  }
};

// Actualizar producto
export const updateProduct = async (id, productData) => {
  try {
    const response = await fetch(`${API_URL}/inventory/update/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error al actualizar producto');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en updateProduct:', error);
    throw error;
  }
};

// Eliminar producto
export const deleteProduct = async (id) => {
  try {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error al eliminar producto');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en deleteProduct:', error);
    throw error;
  }
};

// Buscar producto por ID
export const getProductById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/inventory/${id}`);
    if (!response.ok) {
      throw new Error('Error al obtener producto');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getProductById:', error);
    throw error;
  }
};

// Buscar producto por código de barras
export const getProductByBarcode = async (barcode) => {
  try {
    const response = await fetch(`${API_URL}/inventory/barcode/${barcode}`);
    if (!response.ok) {
      throw new Error('Error al buscar producto por código de barras');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getProductByBarcode:', error);
    throw error;
  }
};
