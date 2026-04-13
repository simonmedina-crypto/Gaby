import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Crear un nuevo fiado
export const crearFiado = async (fiadoData) => {
  try {
    const response = await axios.post(`${API_URL}/fiados/crear`, fiadoData);
    return response.data;
  } catch (error) {
    console.error('Error al crear fiado:', error);
    throw error;
  }
};

// Obtener todos los fiados
export const obtenerFiados = async () => {
  try {
    const response = await axios.get(`${API_URL}/fiados`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener fiados:', error);
    throw error;
  }
};

// Obtener solo fiados pendientes
export const obtenerFiadosPendientes = async () => {
  try {
    const response = await axios.get(`${API_URL}/fiados/pendientes`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener fiados pendientes:', error);
    throw error;
  }
};

// Cobrar un fiado (marcar como realizado)
export const cobrarFiado = async (fiadoId, vendedor) => {
  try {
    const response = await axios.post(`${API_URL}/fiados/cobrar`, {
      id: fiadoId,
      vendedor: vendedor
    });
    return response.data;
  } catch (error) {
    console.error('Error al cobrar fiado:', error);
    throw error;
  }
};

// Eliminar un fiado (solo si está pendiente)
export const eliminarFiado = async (fiadoId) => {
  try {
    const response = await axios.delete(`${API_URL}/fiados/${fiadoId}`);
    return response.data;
  } catch (error) {
    console.error('Error al eliminar fiado:', error);
    throw error;
  }
};
