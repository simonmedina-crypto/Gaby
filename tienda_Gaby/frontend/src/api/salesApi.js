const API_URL = import.meta.env.VITE_API_URL || '/api';

// Obtener historial de ventas
export const getSalesHistory = async () => {
  try {
    const response = await fetch(`${API_URL}/historial-ventas`);
    if (!response.ok) {
      throw new Error('Error al obtener historial de ventas');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getSalesHistory:', error);
    throw error;
  }
};

// Procesar venta normal
export const processSale = async (saleData) => {
  try {
    const response = await fetch(`${API_URL}/facturar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error al procesar venta');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en processSale:', error);
    throw error;
  }
};

// Obtener ventas por período
export const getSalesByPeriod = async (startDate, endDate) => {
  try {
    const response = await fetch(`${API_URL}/ventas/periodo?start=${startDate}&end=${endDate}`);
    if (!response.ok) {
      throw new Error('Error al obtener ventas por período');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getSalesByPeriod:', error);
    throw error;
  }
};

// Obtener ventas por vendedor
export const getSalesByVendor = async (vendorName) => {
  try {
    const response = await fetch(`${API_URL}/ventas/vendedor/${vendorName}`);
    if (!response.ok) {
      throw new Error('Error al obtener ventas por vendedor');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getSalesByVendor:', error);
    throw error;
  }
};

// Obtener métricas de ventas
export const getSalesMetrics = async (period = 'hoy', vendor = null) => {
  try {
    let url = `${API_URL}/ventas/metricas?periodo=${period}`;
    if (vendor && vendor !== 'Todos') {
      url += `&vendedor=${vendor}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Error al obtener métricas de ventas');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getSalesMetrics:', error);
    throw error;
  }
};

// Obtener resumen diario
export const getDailySummary = async (date) => {
  try {
    const response = await fetch(`${API_URL}/ventas/resumen/${date}`);
    if (!response.ok) {
      throw new Error('Error al obtener resumen diario');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getDailySummary:', error);
    throw error;
  }
};
