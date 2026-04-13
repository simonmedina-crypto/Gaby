import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Login from './Login';
import { Card, Metric, Text, Title, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Button, Grid, DatePicker, BarChart, DonutChart, TabGroup, TabList, Tab } from "@tremor/react";
import { es } from 'date-fns/locale';
import { Barcode, TrendingUp, TrendingDown, X, Save, Plus, Edit3, Trash2, Search, Menu, LogOut, Package, LayoutDashboard, ShoppingCart, ScanLine, Zap, CreditCard, DollarSign, Wallet, Users, Calendar, Clock, Award, Eye, ChevronRight, User, CheckCircle, AlertCircle, Wine, RefreshCw, FileDown, AlertTriangle, Beer, GlassWater, Upload, Image as ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import { crearFiado, obtenerFiados, obtenerFiadosPendientes, cobrarFiado, eliminarFiado } from './api/fiadosApi';
import { getInventory, createProduct, updateProduct, deleteProduct, getProductByBarcode } from './api/inventoryApi';
import { getSalesHistory, processSale, getSalesMetrics, getDailySummary } from './api/salesApi';
import './dashboard-calendar.css';
import './styles-simple.css';

const API_URL = import.meta.env.VITE_API_URL;

const getProductos = () => getInventory();
// Función para formatear moneda colombiana
const formatCOP = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

function App() {
  // Estados principales
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [pagoCon, setPagoCon] = useState(0);
  const [ventasTurno, setVentasTurno] = useState([]);
  const [busquedaInventario, setBusquedaInventario] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosPorPagina] = useState(12);
  const [ventasPorPagina] = useState(10);
  const [paginaActualVentas, setPaginaActualVentas] = useState(1);
  const [paginaActualFiados, setPaginaActualFiados] = useState(1);
  const [fiadosPorPagina] = useState(8);
  const [paginaActualVentasEspeciales, setPaginaActualVentasEspeciales] = useState(1);
  const [ventasEspecialesPorPagina] = useState(12);
  const [periodoDashboard, setPeriodoDashboard] = useState('dia');
  const [fechaBaseDashboard, setFechaBaseDashboard] = useState(new Date());
  const [filtroVendedorDashboard, setFiltroVendedorDashboard] = useState('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  
  // Estados para Ventas Especiales (Módulo Kevin)
  const [ventaEspecialModal, setVentaEspecialModal] = useState(false);
  const [productoEspecial, setProductoEspecial] = useState(null);
  const [precioEspecial, setPrecioEspecial] = useState(0);
  const [cantidadEspecial, setCantidadEspecial] = useState(1);
  const [clienteEspecial, setClienteEspecial] = useState("Kevin");
  const [usarPrecioCosto, setUsarPrecioCosto] = useState(false);

  // Estados para fiados
  const [mostrarImagenCarga, setMostrarImagenCarga] = useState(false);
  const [fiados, setFiados] = useState([]);
  const [fiadosPendientes, setFiadosPendientes] = useState([]);
  const [esFiado, setEsFiado] = useState(false);
  const [nombreClienteFiado, setNombreClienteFiado] = useState('');

  const inputRef = useRef(null);
  const cantidadRef = useRef(null);

  // --- FUNCIÓN CENTRALIZADA PARA AGREGAR AL CARRITO (CON SONIDO Y VALIDACIÓN) ---
  const agregarProductoAlCarrito = (producto, cantidadSolicitada = 1) => {
    // 1. Validar Stock Absoluto
    if (cantidadSolicitada > producto.cant) {
      Swal.fire({
        toast: true,
        icon: 'error',
        title: '¡Stock Insuficiente!',
        text: `Solo quedan ${producto.cant} unidades.`,
        position: 'center',
        timer: 2000,
        showConfirmButton: false
      });
      return false;
    }

    // 2. Validar Stock considerando lo que ya está en el carrito
    const indiceExistente = carrito.findIndex(item => item.id === producto.id);
    let cantidadTotal = cantidadSolicitada;
    
    if (indiceExistente !== -1) {
      cantidadTotal += carrito[indiceExistente].cantidad;
    }

    if (cantidadTotal > producto.cant) {
      Swal.fire({
        toast: true,
        icon: 'warning',
        title: 'Límite de Stock',
        text: `No puedes agregar más. Total disponible: ${producto.cant}`,
        position: 'center',
        timer: 2000,
        showConfirmButton: false
      });
      return false;
    }

    // 3. Agregar o Actualizar State
    let nuevoCarrito = [...carrito];
    if (indiceExistente !== -1) {
      nuevoCarrito[indiceExistente] = {
        ...nuevoCarrito[indiceExistente],
        cantidad: cantidadTotal,
        subtotal: nuevoCarrito[indiceExistente].precio * cantidadTotal
      };
    } else {
      nuevoCarrito.push({
        ...producto,
        cantidad: cantidadSolicitada,
        precio: producto.venta,
        subtotal: producto.venta * cantidadSolicitada
      });
    }

    setCarrito(nuevoCarrito);
    
    // 4. Sonido y Feedback
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.warn(e));
    } catch(e) {}

    return true;
  };

  // --- LÓGICA VENTAS ESPECIALES (KEVIN) ---
  const iniciarVentaEspecial = (producto) => {
    setProductoEspecial(producto);
    setCantidadEspecial(1);
    setPrecioEspecial(usarPrecioCosto ? producto.costo : producto.venta);
    setVentaEspecialModal(true);
  };

  const confirmarVentaEspecial = async () => {
    if (!productoEspecial) return;
    
    if (cantidadEspecial > productoEspecial.cant) {
       Swal.fire({ toast: true, icon: 'warning', title: 'Stock insuficiente', position: 'center', timer: 2000, showConfirmButton: false });
       return;
    }

    const fiadoData = {
        cliente_nombre: clienteEspecial,
        productos: [{
            id: String(productoEspecial.id),
            nombre: productoEspecial.name,
            cantidad: Number(cantidadEspecial),
            precio: Number(precioEspecial)
        }],
        total_fiado: Number(precioEspecial) * Number(cantidadEspecial),
        vendedor: usuarioLogueado?.nombre || 'Sistema'
    };

    try {
        await crearFiado(fiadoData);
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        audio.volume = 0.5; audio.play().catch(e => {});
        
        setVentaEspecialModal(false);
        cargarDatos(); 
        cargarFiados();
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo registrar la venta especial', 'error');
    }
  };

  // Cargar datos iniciales usando APIs
  const cargarDatos = async () => {
    try {
      const [resProductos, resVentas] = await Promise.all([
        getInventory(),
        getSalesHistory()
      ]);
      
      setProductos(resProductos);
      setVentas(resVentas);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
    }
  };

  // Cargar datos de fiados
  const cargarFiados = async () => {
    try {
      const [todosFiados, fiadosPend] = await Promise.all([
        obtenerFiados(),
        obtenerFiadosPendientes()
      ]);
      
      setFiados(todosFiados || []);
      setFiadosPendientes(fiadosPend || []);
    } catch (error) {
      console.error('Error al cargar fiados:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'ventas') {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, carrito]);

  useEffect(() => {
    cargarDatos();
    cargarFiados();
  }, []);

  // Funciones de búsqueda y filtrado
  const filtrarProductos = useCallback(() => {
    const filtrados = productos.filter(p => 
      p.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id.toString().includes(busqueda) ||
      (p.barcode && p.barcode.includes(busqueda))
    );
    setSugerencias(filtrados.slice(0, 5));
  }, [productos, busqueda]);

  useEffect(() => {
    if (busqueda.length > 0) {
      filtrarProductos();
    } else {
      setSugerencias([]);
    }
  }, [busqueda, filtrarProductos]);

  // Función para procesar ventas (normales y fiados)
  const procesarVenta = async () => {
    if (carrito.length === 0) {
      Swal.fire('Carrito vacío', 'Agrega productos antes de continuar', 'warning');
      return;
    }

    const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    // Si es fiado, validar nombre del cliente
    if (esFiado) {
      if (!nombreClienteFiado.trim()) {
        Swal.fire('Nombre requerido', 'Ingresa el nombre del cliente para el fiado', 'warning');
        return;
      }
    } else {
      // Validaciones para venta normal
      if (metodoPago === "efectivo" && Number(pagoCon) < total) {
        Swal.fire('Pago insuficiente', 'El valor recibido es menor al total a pagar', 'warning');
        return;
      }
    }

    try {
      if (esFiado) {
        // Procesar como fiado
        const fiadoData = {
          cliente_nombre: nombreClienteFiado,
          productos: carrito.map(i => ({
            id: String(i.id),
            nombre: i.name,
            cantidad: Number(i.cantidad) || 1,
            precio: i.precio
          })),
          total_fiado: total,
          vendedor: usuarioLogueado?.nombre || 'Sistema'
        };

        await crearFiado(fiadoData);
        
        Swal.fire({
          title: '¡Fiado Registrado!',
          text: `Fiado para ${nombreClienteFiado} por ${formatCOP(total)}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // Procesar como venta normal usando API
        const saleData = {
          items: carrito.map(i => ({ id: String(i.id), cantidad: Number(i.cantidad) || 1 })),
          vendedor: usuarioLogueado?.nombre || 'Sistema',
          metodo: metodoPago,
          valor_recibido: Number(pagoCon)
        };

        await processSale(saleData);

        setVentasTurno([...ventasTurno, {
          items: carrito,
          total: total,
          fecha: new Date(),
          metodo: metodoPago,
          valor_recibido: Number(pagoCon)
        }]);

        Swal.fire({
          title: metodoPago === "transferencia" ? '¡Transferencia Registrada!' : '¡Venta Exitosa!',
          text: `${metodoPago === "transferencia" ? "Transferencia" : "Venta"} registrada por ${usuarioLogueado?.nombre || 'Sistema'}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }

      // Limpiar carrito y estados
      setCarrito([]);
      setBarcode("");
      setCantidadVenta(1);
      setPagoCon(0);
      setMetodoPago("efectivo");
      setEsFiado(false);
      setNombreClienteFiado('');
      
      // Recargar datos
      cargarDatos();
      cargarFiados();
      setTimeout(() => {
        cargarDatos();
        cargarFiados();
      }, 500);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo procesar la operación', 'error');
    }
  };

  // Handlers para fiados
  const cobrarFiadoHandler = async (fiado) => {
    const result = await Swal.fire({
      title: '¿Cobrar Fiado?',
      html: `
        <div style="text-align: left;">
          <p><strong>Cliente:</strong> ${fiado.cliente_nombre}</p>
          <p><strong>Fecha:</strong> ${new Date(fiado.fecha_fiado).toLocaleDateString('es-CO')}</p>
          <p><strong>Total:</strong> ${formatCOP(fiado.total_fiado)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cobrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });

    if (result.isConfirmed) {
      try {
        await cobrarFiado(fiado.id, usuarioLogueado?.nombre || 'Sistema');
        
        Swal.fire({
          title: '¡Fiado Cobrado!',
          text: `El fiado de ${fiado.cliente_nombre} ha sido cobrado exitosamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        cargarFiados();
        cargarDatos();
      } catch (error) {
        console.error('Error al cobrar fiado:', error);
        Swal.fire('Error', 'No se pudo cobrar el fiado', 'error');
      }
    }
  };

  const eliminarFiadoHandler = async (fiado) => {
    const result = await Swal.fire({
      title: '¿Eliminar Fiado?',
      html: `
        <div style="text-align: left;">
          <p><strong>Cliente:</strong> ${fiado.cliente_nombre}</p>
          <p><strong>Fecha:</strong> ${new Date(fiado.fecha_fiado).toLocaleDateString('es-CO')}</p>
          <p><strong>Total:</strong> ${formatCOP(fiado.total_fiado)}</p>
          <p style="color: #dc2626;"><strong>⚠️ El stock será devuelto al inventario</strong></p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    });

    if (result.isConfirmed) {
      try {
        await eliminarFiado(fiado.id);
        
        Swal.fire({
          title: '¡Fiado Eliminado!',
          text: `El fiado de ${fiado.cliente_nombre} ha sido eliminado y el stock devuelto`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        cargarFiados();
        cargarDatos();
      } catch (error) {
        console.error('Error al eliminar fiado:', error);
        Swal.fire('Error', 'No se pudo eliminar el fiado', 'error');
      }
    }
  };

  // --- CÁLCULOS AVANZADOS DASHBOARD ---
  const valorInventario = useMemo(() => {
    return productos.reduce((acc, p) => acc + (p.costo * p.cant), 0);
  }, [productos]);

  const totalCartera = useMemo(() => {
    return fiadosPendientes.reduce((acc, f) => acc + f.total_fiado, 0);
  }, [fiadosPendientes]);

  const productosBajoStock = useMemo(() => {
    return productos.filter(p => p.cant <= 5).sort((a,b) => a.cant - b.cant);
  }, [productos]);

  const productosRentables = useMemo(() => {
    const map = {};
    ventas.forEach(v => {
      const ganancia = (v.precio_venta || 0) - (v.precio_costo || 0);
      const nombre = v.nombre_producto || 'Desconocido';
      if (!map[nombre]) map[nombre] = 0;
      map[nombre] += ganancia;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nombre, total]) => ({ nombre, total }));
  }, [ventas]);

  const productosHueso = useMemo(() => {
    // Productos con stock > 0 que no se han vendido en los últimos 30 días
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);
    
    const vendidosRecientemente = new Set(
      ventas
        .filter(v => new Date(v.fecha) >= treintaDiasAtras)
        .map(v => v.producto_id)
    );
    
    return productos
      .filter(p => !vendidosRecientemente.has(String(p.id)) && p.cant > 0)
      .slice(0, 5); // Mostrar solo 5 ejemplos
  }, [productos, ventas]);

  const exportarReporte = () => {
    const fecha = new Date().toLocaleDateString('es-CO');
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Resumen
    csvContent += `REPORTE FINANCIERO - ${fecha}\n\n`;
    csvContent += `Ventas Brutas,${formatCOP(datosDashboard.totalVentas).replace(/[^0-9,-]/g, '')}\n`;
    csvContent += `Ganancia Neta,${formatCOP(datosDashboard.ganancias).replace(/[^0-9,-]/g, '')}\n`;
    csvContent += `Valor Inventario,${formatCOP(valorInventario).replace(/[^0-9,-]/g, '')}\n`;
    csvContent += `Cuentas por Cobrar (Cartera),${formatCOP(totalCartera).replace(/[^0-9,-]/g, '')}\n\n`;
    
    csvContent += "TOP PRODUCTOS RENTABLES\nProducto,Ganancia Total\n";
    productosRentables.forEach(p => {
        csvContent += `${p.nombre},${p.total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Gaby_${fecha.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Resto de las funciones existentes...
  const seleccionarProductoSugerencia = (producto) => {
    const agregado = agregarProductoAlCarrito(producto, Number(cantidadVenta) || 1);
    if (!agregado) return;
    
    setBusqueda("");
    setSugerencias([]);
    setBarcode("");
    setCantidadVenta(1);
    inputRef.current?.focus();
  };

  // Función para manejar escaneo con código de barras usando API
  const manejarPistola = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    
    try {
      // Primero buscar por código de barras
      let producto = null;
      if (barcode.trim()) {
        try {
          producto = await getProductByBarcode(barcode.trim());
        } catch (error) {
          // Si no encuentra por barcode, buscar por ID
          producto = productos.find(p => p.id === barcode);
        }
      }
      
      if (producto) {
        if (producto.cant >= (Number(cantidadVenta) || 1)) {
          agregarProductoAlCarrito(producto, Number(cantidadVenta) || 1);
          setBarcode(""); // Limpiar código tras agregar
        } else {
          Swal.fire('Stock insuficiente', `Solo hay ${producto.cant} unidades disponibles`, 'warning');
        }
      } else {
        Swal.fire('Producto no encontrado', 'El código de barras no existe en el inventario', 'error');
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      Swal.fire('Error', 'No se pudo buscar el producto', 'error');
    }
  };

  const eliminarDelCarrito = (index) => {
    const nuevoCarrito = carrito.filter((_, i) => i !== index);
    setCarrito(nuevoCarrito);
  };

  const actualizarCantidadCarrito = (index, nuevaCantidad) => {
    const cantidad = parseInt(nuevaCantidad);
    if (isNaN(cantidad) || cantidad < 1) return;

    const nuevoCarrito = [...carrito];
    const item = nuevoCarrito[index];
    
    const productoOriginal = productos.find(p => p.id === item.id);
    
    if (productoOriginal && cantidad > productoOriginal.cant) {
      Swal.fire({ toast: true, icon: 'warning', title: `Solo hay ${productoOriginal.cant} unidades`, position: 'center', timer: 1500, showConfirmButton: false });
      return;
    }

    nuevoCarrito[index] = {
      ...item,
      cantidad: cantidad,
      subtotal: item.precio * cantidad
    };
    setCarrito(nuevoCarrito);
  };

  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Funciones CRUD para Inventario
  const handleCreateProduct = async () => {
    try {
      const nameTrim = (formData.name || '').trim();
      if (!nameTrim) {
        Swal.fire('Nombre requerido', 'El nombre del producto es obligatorio', 'warning');
        return;
      }

      const existing = productos.find(p => p.id === formData.id);
      if (existing) {
        Swal.fire('ID duplicado', 'Ya existe un producto con este ID', 'warning');
        return;
      }

      const nameDup = productos.find(p => p.name === nameTrim);
      if (nameDup) { 
        Swal.fire('Nombre duplicado', 'Ya existe un producto con este nombre', 'warning'); 
        return; 
      }

      const cant = Number(formData.cant) || 0;
      const costo = Number(formData.costo) || 0;
      const venta = Number(formData.venta) || 0;
      if (cant < 0 || costo < 0 || venta < 0) { 
        Swal.fire('Valores inválidos', 'Stock y precios no pueden ser negativos', 'warning'); 
        return; 
      }
      
      if (venta < costo) {
        const resWarn = await Swal.fire({ 
          title: 'Precio de venta menor al costo', 
          text: '¿Deseas continuar?', 
          icon: 'warning', 
          showCancelButton: true, 
          confirmButtonText: 'Si, continuar' 
        });
        if (!resWarn.isConfirmed) return;
      }

      const payload = { 
        ...formData, 
        name: nameTrim, 
        cant, 
        costo, 
        venta, 
        barcode: (formData.barcode || '').trim() 
      };
      
      await createProduct(payload);
      
      Swal.fire({ 
        title: '¡Éxito!', 
        icon: 'success', 
        timer: 1500, 
        showConfirmButton: false 
      });
      
      setIsModalOpen(false);
      setIsEditing(false);
      setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message || 'Error de conexión', 'error');
    }
  };

  const handleUpdateProduct = async () => {
    try {
      const nameTrim = (formData.name || '').trim();
      if (!nameTrim) {
        Swal.fire('Nombre requerido', 'El nombre del producto es obligatorio', 'warning');
        return;
      }

      const nameDup = productos.find(p => p.name === nameTrim && p.id !== formData.id);
      if (nameDup) { 
        Swal.fire('Nombre duplicado', 'Ya existe un producto con este nombre', 'warning'); 
        return; 
      }

      const cant = Number(formData.cant) || 0;
      const costo = Number(formData.costo) || 0;
      const venta = Number(formData.venta) || 0;
      if (cant < 0 || costo < 0 || venta < 0) { 
        Swal.fire('Valores inválidos', 'Stock y precios no pueden ser negativos', 'warning'); 
        return; 
      }
      
      if (venta < costo) {
        const resWarn = await Swal.fire({ 
          title: 'Precio de venta menor al costo', 
          text: '¿Deseas continuar?', 
          icon: 'warning', 
          showCancelButton: true, 
          confirmButtonText: 'Si, continuar' 
        });
        if (!resWarn.isConfirmed) return;
      }

      const payload = { 
        ...formData, 
        name: nameTrim, 
        cant, 
        costo, 
        venta, 
        barcode: (formData.barcode || '').trim() 
      };
      
      await updateProduct(formData.id, payload);
      
      Swal.fire({ 
        title: '¡Éxito!', 
        icon: 'success', 
        timer: 1500, 
        showConfirmButton: false 
      });
      
      setIsModalOpen(false);
      setIsEditing(false);
      setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message || 'Error de conexión', 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const result = await Swal.fire({
        title: '¿Eliminar producto?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        await deleteProduct(productId);
        
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El producto ha sido eliminado',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        cargarDatos();
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message || 'No se pudo eliminar el producto', 'error');
    }
  };
  const obtenerDatosCompletosPorPeriodo = useCallback(() => {
    const ventasFiltradas = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      const fechaReferencia = new Date(fechaBaseDashboard || new Date());
      // Normalizamos a inicio del día para comparaciones precisas
      const vDate = new Date(fechaVenta.getFullYear(), fechaVenta.getMonth(), fechaVenta.getDate());
      const rDate = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), fechaReferencia.getDate());
      
      switch (periodoDashboard) {
        case 'dia':
          return vDate.getTime() === rDate.getTime();
        case 'semana': {
          const day = rDate.getDay();
          // Ajustar para que la semana empiece el Lunes (si es domingo 0, retrocede 6 días)
          const diff = rDate.getDate() - day + (day === 0 ? -6 : 1);
          const lunes = new Date(rDate);
          lunes.setDate(diff);
          const domingo = new Date(lunes);
          domingo.setDate(lunes.getDate() + 6);
          return vDate >= lunes && vDate <= domingo;
        }
        case 'mes':
          return vDate.getMonth() === rDate.getMonth() && vDate.getFullYear() === rDate.getFullYear();
        default:
          return vDate.getTime() === rDate.getTime();
      }
    });

    if (filtroVendedorDashboard !== 'Todos') {
      return ventasFiltradas.filter(v => (v.vendedor || 'Sistema') === filtroVendedorDashboard);
    }
    
    return ventasFiltradas;
  }, [ventas, periodoDashboard, filtroVendedorDashboard, fechaBaseDashboard]);

  const datosDashboard = useMemo(() => {
    const ventasFiltradas = obtenerDatosCompletosPorPeriodo();
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.precio_venta || 0), 0);
    const ganancias = ventasFiltradas.reduce((sum, v) => {
      const producto = productos.find(p => p.id === v.producto_id);
      // Usar el costo histórico si existe (v.precio_costo), si no, usar el actual
      const costo = v.precio_costo !== undefined ? v.precio_costo : (producto ? producto.costo : 0);
      return sum + ((v.precio_venta || 0) - costo);
    }, 0);
    
    const ventasPorProducto = {};
    const ventasPorVendedor = {};
    
    ventasFiltradas.forEach(v => {
      const producto = productos.find(p => p.id === v.producto_id);
      const nombre = v.nombre_producto || (producto ? producto.name : 'Desconocido');
      ventasPorProducto[nombre] = (ventasPorProducto[nombre] || 0) + (v.precio_venta || 0); // Sumar valor venta
      
      ventasPorVendedor[v.vendedor] = (ventasPorVendedor[v.vendedor] || 0) + 1;
    });
    
    return {
      titulo: periodoDashboard === 'dia' ? 'Día Seleccionado' : periodoDashboard === 'semana' ? 'Semana Seleccionada' : 'Mes Seleccionado',
      periodo: fechaBaseDashboard ? new Date(fechaBaseDashboard).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Seleccione fecha',
      totalVentas,
      ganancias,
      cantidadVentas: ventasFiltradas.length,
      ventasPorProducto: Object.entries(ventasPorProducto).map(([nombre, total]) => ({ nombre, total })).sort((a,b) => b.total - a.total).slice(0, 5),
      ventasPorVendedor: Object.entries(ventasPorVendedor).map(([vendedor, cantidad]) => ({ vendedor, cantidad })),
      ventasDetalladas: ventasFiltradas
    };
  }, [obtenerDatosCompletosPorPeriodo, productos, periodoDashboard, fechaBaseDashboard]);

  const vendedoresUnicos = useMemo(() => {
    const vendedores = new Set(ventas.map(v => v.vendedor));
    return ['Todos', ...Array.from(vendedores)];
  }, [ventas]);

  const categorias = useMemo(() => {
    const cats = new Set(productos.map(p => {
      const n = p.name.toLowerCase();
      if (n.includes('whisky') || n.includes('old par') || n.includes('buchanan')) return 'Whisky';
      if (n.includes('vino')) return 'Vino';
      if (n.includes('cerveza') || n.includes('aguila') || n.includes('poker')) return 'Cerveza';
      if (n.includes('tequila')) return 'Tequila';
      if (n.includes('ron') || n.includes('caldas') || n.includes('medellin')) return 'Ron';
      if (n.includes('aguardiente') || n.includes('antioqueño')) return 'Aguardiente';
      return 'Otros';
    }));
    return ['Todos', ...Array.from(cats)];
  }, [productos]);

  // Calculamos los productos filtrados para el inventario (Fix para el error .slice)
  const productosFiltrados = useMemo(() => {
    if (!productos) return [];
    const termino = (busquedaInventario || "").toLowerCase();
    
    let filtrados = productos.filter(p => 
      p.name.toLowerCase().includes(termino) ||
      p.id.toString().includes(termino) ||
      (p.barcode && p.barcode.includes(termino))
    );

    if (filtroCategoria !== 'Todos') {
      filtrados = filtrados.filter(p => {
        const n = p.name.toLowerCase();
        if (filtroCategoria === 'Whisky') return n.includes('whisky') || n.includes('old par') || n.includes('buchanan');
        if (filtroCategoria === 'Vino') return n.includes('vino');
        if (filtroCategoria === 'Cerveza') return n.includes('cerveza') || n.includes('aguila') || n.includes('poker');
        if (filtroCategoria === 'Tequila') return n.includes('tequila');
        if (filtroCategoria === 'Ron') return n.includes('ron') || n.includes('caldas');
        if (filtroCategoria === 'Aguardiente') return n.includes('aguardiente') || n.includes('antioqueño');
        return !n.includes('whisky') && !n.includes('vino') && !n.includes('cerveza') && !n.includes('tequila') && !n.includes('ron') && !n.includes('aguardiente');
      });
    }

    return filtrados;
  }, [productos, busquedaInventario, filtroCategoria]);

  const productosEspecialesPaginados = useMemo(() => {
    const inicio = (paginaActualVentasEspeciales - 1) * ventasEspecialesPorPagina;
    return productosFiltrados.slice(inicio, inicio + ventasEspecialesPorPagina);
  }, [productosFiltrados, paginaActualVentasEspeciales, ventasEspecialesPorPagina]);

  const totalPaginasVentasEspeciales = Math.max(1, Math.ceil(productosFiltrados.length / ventasEspecialesPorPagina));

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'Whisky': return <GlassWater className="w-4 h-4" />;
      case 'Vino': return <Wine className="w-4 h-4" />;
      case 'Cerveza': return <Beer className="w-4 h-4" />;
      default: return <Wine className="w-4 h-4" />;
    }
  };

  // Si no hay nadie logueado, mostramos el componente Login
  if (!usuarioLogueado) {
    return <Login onLoginSuccess={(user) => setUsuarioLogueado(user)} />;
  }

  return (
    <div className="min-h-screen licorera-root selection:bg-[#D4AF37]/30 bg-gradient-to-br from-slate-950 via-slate-900 to-[#050a1d] text-slate-100">
      {/* Header con colores Licorera Pro Pomerania */}
      <header className="sticky top-0 z-50 border-b border-amber-500/30 shadow-lg bg-gradient-to-r from-slate-900 to-slate-800/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 text-slate-100">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-300/30 shadow-sm transition-all duration-300"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg group-hover:scale-105 transition-transform duration-300 ring-2 ring-amber-200">
                  <img
                    src="https://dinastiadelcachorro.com/wp-content/uploads/2024/11/Dinastia-del-Cachorro-Home-pomerania-mini-medellin.png"
                    alt="Pomerania Gaby"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-lg shadow-emerald-500/50" title="Tienda Abierta"></div>
              </div>
              <div>
                <Title className="text-2xl font-black text-white tracking-tight flex items-center gap-2 drop-shadow-sm">
                  <Wine className="text-amber-500" size={24} />
                  Liccore Gaby
                </Title>
                <Text className="text-[10px] text-amber-500/80 font-bold uppercase tracking-[0.2em]">Premium Spirits & Pomeranias</Text>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <Text className="text-[10px] text-amber-200 font-medium uppercase tracking-wider">Operador</Text>
              <Text className="text-sm font-black text-white">{usuarioLogueado.nombre}</Text>
            </div>
            <div className="px-3 py-1 bg-amber-500/20 rounded-full border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.45)]">
              <Text className="text-[10px] font-black text-amber-200 uppercase tracking-wider">{usuarioLogueado.rol}</Text>
            </div>
            <button
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'Salir',
                  text: '¿Estás seguro de que quieres cerrar sesión?',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Sí, salir',
                  cancelButtonText: 'No, quedarme',
                  reverseButtons: true,
                  backdrop: true,
                  customClass: {
                    popup: 'rounded-2xl bg-slate-900 border border-amber-500/30',
                    title: 'text-amber-300 font-black',
                    content: 'text-slate-100',
                    confirmButton: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
                    cancelButton: 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                  }
                });

                if (result.isConfirmed) {
                  setUsuarioLogueado(null);
                }
              }}
              className="p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-red-300 transition-all"
              title="Salir"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-88px)] overflow-hidden">
        {/* Sidebar elegante */}
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 border-r border-amber-500/20 text-slate-200 transition-all duration-300 flex flex-col relative`}>
          <nav className="p-6 space-y-4">
            <button
              onClick={() => setActiveTab('ventas')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 p-3 rounded-xl transition-all duration-200 ${
                activeTab === 'ventas' 
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-900/50 ring-1 ring-amber-400/50' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-amber-400'
              }`}
            >
              <ShoppingCart className="w-6 h-6" />
              {!sidebarCollapsed && <span className="text-sm font-black tracking-wider">Ventas</span>}
            </button>
            
            {usuarioLogueado.rol === 'Administrador' && (
              <button
                onClick={() => setActiveTab('inventario')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 p-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'inventario' 
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-900/50 ring-1 ring-amber-400/50' 
                    : 'text-slate-300 hover:bg-amber-500/15 hover:text-amber-200'
                }`}
              >
                <Package className="w-6 h-6" />
                {!sidebarCollapsed && <span className="text-sm font-black tracking-wider">Inventario</span>}
              </button>
            )}
            
            {usuarioLogueado.rol === 'Administrador' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 p-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'dashboard' 
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-900/50 ring-1 ring-amber-400/50' 
                    : 'text-slate-300 hover:bg-amber-500/15 hover:text-amber-200'
                }`}
              >
                <LayoutDashboard className="w-6 h-6" />
                {!sidebarCollapsed && <span className="text-sm font-black tracking-wider">Dashboard</span>}
              </button>
            )}
            
            {usuarioLogueado.rol === 'Administrador' && (
              <button
                onClick={() => setActiveTab('fiados')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 p-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'fiados' 
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-900/50 ring-1 ring-amber-400/50' 
                    : 'text-slate-300 hover:bg-amber-500/15 hover:text-amber-200'
                }`}
              >
                <User className="w-6 h-6" />
                {!sidebarCollapsed && <span className="text-sm font-black tracking-wider">Fiados</span>}
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('ventas-especiales')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 p-3 rounded-xl transition-all duration-200 ${
                activeTab === 'ventas-especiales' 
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-900/50 ring-1 ring-amber-400/50' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-amber-400'
              }`}
            >
              <Zap className="w-6 h-6" />
              {!sidebarCollapsed && <span className="text-sm font-black tracking-wider">Ventas {clienteEspecial}</span>}
            </button>
          </nav>
          
          {!sidebarCollapsed && (
            <div className="p-6 mt-auto">
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-4 border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-200/20 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-500/30 shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop&crop=face&auto=format"
                      alt="Pomerania"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <Title className="text-xs font-black text-amber-700">Mascota Oficial</Title>
                    <Text className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Gaby the Pom</Text>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content con Estilo Pomerania */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          {/* Tab de Ventas - Estilo Pomerania */}
          {activeTab === 'ventas' && (
            <div className="flex flex-col lg:flex-row gap-6 pb-20 items-start">
              
              {/* IZQUIERDA: CONSTRUIR PEDIDO */}
              <div className="flex-1 w-full space-y-6">
                
                {/* 1. BUSCADOR & CANTIDAD (Unificados) */}
                <Card className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    
                    {/* Control de Cantidad */}
                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-[#e2ebf8] w-full sm:w-auto justify-center">
                      <button onClick={() => setCantidadVenta(Math.max(1, cantidadVenta - 1))} className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-white font-bold text-xl flex items-center justify-center transition-all active:scale-95 border border-amber-100">-</button>
                      <input
                        type="number"
                        value={cantidadVenta}
                        onChange={(e) => setCantidadVenta(Math.max(1, parseInt(e.target.value) || 1))} 
                        className="w-16 text-center bg-white font-black text-xl text-amber-700 outline-none"
                      />
                      <button onClick={() => setCantidadVenta(cantidadVenta + 1)} className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-white font-bold text-xl flex items-center justify-center transition-all active:scale-95 border border-amber-100">+</button>
                    </div>

                    {/* Input de Búsqueda */}
                    <div className="relative flex-1 w-full group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors">
                        <Search size={22} />
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Escanea código o busca producto..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const term = busqueda.trim();
                            // 1. Exact Match (Barcode/ID)
                            const exactMatch = productos.find(p => 
                              (p.barcode && p.barcode === term) || 
                              p.id.toString() === term
                            );
                            if (exactMatch) {
                              seleccionarProductoSugerencia(exactMatch);
                              return;
                            }
                            // 2. Name Suggestion
                            if (sugerencias.length > 0) {
                              seleccionarProductoSugerencia(sugerencias[0]);
                            } else {
                              Swal.fire({ toast: true, icon: 'info', title: 'Producto no encontrado', position: 'center', timer: 1000, showConfirmButton: false });
                            }
                          }
                        }}
                        className="w-full h-14 pl-12 pr-4 bg-white border border-[#f7e0c2] rounded-xl focus:ring-2 focus:ring-amber-300 focus:border-amber-300 text-lg text-[#1e293b] placeholder-[#9f7a4f] transition-all font-medium"
                      />
                      
                      {/* Lista de Sugerencias */}
                      {sugerencias.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#f7e0c2] rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto ring-1 ring-amber-100">
                          {sugerencias.map(p => (
                            <div
                              key={p.id}
                              onClick={() => seleccionarProductoSugerencia(p)}
                              className="p-4 hover:bg-amber-50 cursor-pointer transition-colors border-b border-[#f0e5d1] last:border-0"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-amber-700">{p.name}</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-2">
                                    <span>Stock: {p.cant}</span>
                                    {p.cant <= 5 && <span className="text-red-400 font-black flex items-center gap-1"><AlertTriangle size={10} /> BAJO</span>}
                                    <span className="text-slate-600">|</span> 
                                    <span className="font-mono text-slate-500">{p.barcode || 'Sin código'}</span>
                                  </div>
                                </div>
                                <div className="font-black text-amber-400 bg-amber-950/50 px-3 py-1 rounded-lg border border-amber-900/50">
                                  {formatCOP(p.venta)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* 2. CARRITO GRANDE */}
                <Card className="bg-slate-900/80 border border-amber-500/25 rounded-2xl overflow-hidden flex flex-col min-h-[400px] shadow-lg">
                  <div className="p-4 border-b border-amber-500/30 bg-slate-950/70 flex justify-between items-center backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="text-amber-500 w-5 h-5" />
                      <span className="font-black text-amber-700 uppercase tracking-wide text-sm">Carrito de Compras</span>
                      <Badge color="amber" size="xs">{carrito.reduce((a,c)=>a+c.cantidad,0)} items</Badge>
                    </div>
                    {carrito.length > 0 && (
                      <button onClick={() => setCarrito([])} className="text-xs font-bold text-red-400 hover:bg-red-950/30 px-3 py-1 rounded-lg transition-colors">
                        Vaciar Carrito
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-x-auto">
                    {carrito.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-amber-500">
                        <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
                        <p className="font-medium text-sm text-amber-600">Escanea o busca productos para vender</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-amber-50 text-[10px] uppercase text-amber-700 font-bold sticky top-0 z-10 border-b border-[#f4d7a8]">
                          <tr>
                            <th className="p-4 font-black tracking-wider">Producto</th>
                            <th className="p-4 font-black tracking-wider text-center">Cantidad</th>
                            <th className="p-4 font-black tracking-wider text-right">Subtotal</th>
                            <th className="p-4 font-black tracking-wider w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e7f0fb]">                          {carrito.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                              <td className="p-4">
                                <div className="font-bold text-amber-800">{item.name}</div>
                                <div className="text-xs text-amber-500 font-mono mt-1">{formatCOP(item.precio)} un.</div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => actualizarCantidadCarrito(idx, item.cantidad - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold transition-colors border border-white/5">-</button>
                                  <input 
                                    type="number" 
                                    value={item.cantidad} 
                                    onChange={(e) => actualizarCantidadCarrito(idx, e.target.value)}
                                    className="w-12 text-center font-bold text-amber-400 bg-transparent outline-none" 
                                  />
                                  <button onClick={() => actualizarCantidadCarrito(idx, item.cantidad + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold transition-colors border border-white/5">+</button>
                                </div>
                              </td>
                              <td className="p-4 text-right font-black text-amber-800 text-lg">
                                {formatCOP(item.subtotal)}
                              </td>
                              <td className="p-4 text-center">
                                <button onClick={() => eliminarDelCarrito(idx)} className="p-2 text-amber-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              </div>

              {/* DERECHA: PAGAR & INFO */}
              <div className="lg:w-[400px] flex flex-col gap-6 shrink-0 w-full">
                
                {/* TARJETA DE PAGO */}
                <Card className="bg-slate-900/80 border border-amber-500/25 shadow-lg rounded-3xl overflow-hidden p-0 relative">
                  <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500"></div>
                  <div className="p-6 pb-4 bg-slate-950/70">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-amber-500 font-bold uppercase text-xs tracking-[0.2em]">Total a Pagar</span>
                      <span className="text-amber-500 text-xs font-mono">{carrito.length} items</span>
                    </div>
                    <div className="text-4xl font-black text-amber-800 tracking-tighter">{formatCOP(total)}</div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Selector Método Pago */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Método de Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setMetodoPago('efectivo')}
                          className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${metodoPago === 'efectivo' ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/5 bg-slate-800/50 hover:bg-slate-800 text-slate-400'}`}
                        >
                          <Wallet size={18} /> Efectivo
                        </button>
                        <button 
                          onClick={() => setMetodoPago('transferencia')}
                          className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${metodoPago === 'transferencia' ? 'border-blue-500/50 bg-blue-950/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5 bg-slate-800/50 hover:bg-slate-800 text-slate-400'}`}
                        >
                          <CreditCard size={18} /> Transf.
                        </button>
                      </div>
                    </div>

                    {/* Input Dinero (Solo Efectivo) */}
                    {metodoPago === 'efectivo' && !esFiado && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Dinero Recibido</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</div>
                          <input
                            type="number"
                            value={pagoCon}
                            onChange={(e) => setPagoCon(Number(e.target.value))}
                            placeholder="0"
                            className="w-full p-4 pl-8 bg-slate-950 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-black text-xl text-white outline-none transition-all placeholder-slate-700"
                          />
                        </div>
                        <div className="flex justify-between items-center mt-3 px-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cambio</span>
                          <span className={`text-xl font-black ${pagoCon >= total ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {formatCOP(Math.max(0, pagoCon - total))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Toggle Fiado */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <User size={18} className="text-amber-500" />
                        <span className="font-bold text-slate-300 text-sm">Venta a Crédito (Fiado)</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={esFiado} 
                        onChange={(e) => setEsFiado(e.target.checked)}
                        className="w-5 h-5 accent-amber-500 cursor-pointer" 
                      />
                    </div>

                    {esFiado && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <input
                          type="text"
                          value={nombreClienteFiado}
                          onChange={(e) => setNombreClienteFiado(e.target.value)}
                          placeholder="Nombre del Cliente..."
                          className="w-full p-3 bg-slate-950 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-bold text-amber-100 outline-none placeholder-slate-600"
                        />
                      </div>
                    )}

                    {/* BOTÓN CONFIRMAR */}
                    <button
                      onClick={procesarVenta}
                      disabled={carrito.length === 0}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 ${
                        carrito.length === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed shadow-none' :
                        esFiado ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-amber-900/50' :
                        'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-900/50'
                      }`}
                    >
                      {esFiado ? <User /> : <CheckCircle />}
                      {esFiado ? 'Registrar Fiado' : 'Confirmar Venta'}
                    </button>
                  </div>
                </Card>

                {/* HISTORIAL RÁPIDO */}
                <Card className="bg-slate-900 border-0 ring-1 ring-white/10 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-slate-400 text-sm uppercase tracking-wider">Últimas Ventas</span>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {ventasTurno.length === 0 ? (
                      <div className="text-center py-6 text-slate-600 text-xs">Sin ventas recientes</div>
                    ) : (
                      ventasTurno.slice().reverse().map((v, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                          <div>
                            <div className="font-bold text-slate-200 text-sm">{formatCOP(v.total)}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{new Date(v.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                          <Badge size="xs" color={v.metodo === 'transferencia' ? 'blue' : 'emerald'}>
                            {v.metodo === 'transferencia' ? 'Transf' : 'Efec'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

              </div>
            </div>
          )}

          {/* Tab de Fiados - Estilo Pomerania */}
          {activeTab === 'fiados' && usuarioLogueado.rol === 'Administrador' && (
            <div className="space-y-6 pb-20">
              {/* Resumen de Fiados Pomerania */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-slate-900/80 border border-amber-500/30 shadow-lg ring-1 ring-amber-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-amber-100/20 rounded-xl text-amber-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <Text className="text-amber-200 text-sm font-bold uppercase">Total Fiados</Text>
                        <Title className="text-2xl font-black text-amber-100">{fiados.length}</Title>
                      </div>
                    </div>
                </Card>
                
                <Card className="bg-slate-900/80 border border-amber-500/30 shadow-lg ring-1 ring-amber-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-amber-100/20 rounded-xl text-amber-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <Text className="text-amber-200 text-sm font-bold uppercase">Pendientes</Text>
                        <Title className="text-2xl font-black text-amber-100">{fiadosPendientes.length}</Title>
                      </div>
                    </div>
                </Card>
                
                <Card className="bg-slate-900/80 border border-amber-500/30 shadow-lg ring-1 ring-amber-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-amber-100/20 rounded-xl text-amber-400">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <Text className="text-amber-200 text-sm font-bold uppercase">Deuda Total</Text>
                        <Title className="text-2xl font-black text-amber-100">{formatCOP(fiadosPendientes.reduce((sum, f) => sum + f.total_fiado, 0))}</Title>
                      </div>
                    </div>
                </Card>
              </div>

              {/* Lista de Fiados Pomerania */}
              <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-[0_24px_60px_rgba(245,145,32,0.35)] ring-1 ring-amber-400/35 rounded-2xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-amber-300/20 rounded-lg text-amber-200">
                        <User className="w-5 h-5" />
                      </div>
                      <Title className="text-xl font-black text-amber-100">
                        📋 Lista de Fiados
                      </Title>
                    </div>
                    <button
                      onClick={cargarFiados}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all font-bold text-sm"
                    >
                      🔄 Actualizar
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow className="bg-amber-300/20 border-b border-amber-400/40">
                          <TableHeaderCell className="font-black text-xs uppercase text-orange-100">Fecha</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-orange-100">Cliente</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-orange-100">Productos</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-orange-100 text-right">Total</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-orange-100">Estado</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-orange-100 text-right">Acciones</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fiados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12">
                              <div className="text-center">
                                <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <Text className="text-slate-400 font-medium">No hay fiados registrados</Text>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          fiados
                            .slice((paginaActualFiados - 1) * fiadosPorPagina, paginaActualFiados * fiadosPorPagina)
                            .map((fiado) => {
                              const productos = JSON.parse(fiado.productos);
                              return (
                                <TableRow key={fiado.id} className="bg-slate-900/40 hover:bg-amber-500/25 transition-all border-b border-amber-500/20">
                                <TableCell className="text-sm text-amber-100">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-amber-100">{new Date(fiado.fecha_fiado).toLocaleDateString('es-CO')}</span>
                                    <span className="text-xs text-amber-200">{new Date(fiado.fecha_fiado).toLocaleTimeString('es-CO')}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-bold text-amber-100 text-base">{fiado.cliente_nombre}</TableCell>
                                <TableCell className="text-sm text-amber-200">
                                  <div className="max-w-xs">
                                    {productos.map((p, idx) => (
                                      <div key={idx} className="text-xs">
                                        <span className="font-bold text-amber-100">{p.cantidad}x</span> {p.nombre}
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-amber-200">{formatCOP(fiado.total_fiado)}</TableCell>
                                <TableCell>
                                    <Badge color={fiado.estado === 'pendiente' ? 'rose' : 'emerald'} size="xs">
                                    {fiado.estado === 'pendiente' ? (
                                      <span className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Pendiente
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Pagado
                                      </span>
                                    )}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-3 justify-end">
                                    {fiado.estado === 'pendiente' && (
                                      <>
                                        <button
                                          onClick={() => cobrarFiadoHandler(fiado)}
                                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all text-xs font-bold"
                                        >
                                          💰 Cobrar
                                        </button>
                                        <button
                                          onClick={() => eliminarFiadoHandler(fiado)}
                                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                    {fiado.estado === 'realizado' && (
                                      <Text className="text-xs text-slate-400 font-medium">
                                        {new Date(fiado.fecha_pago).toLocaleDateString('es-CO')}
                                      </Text>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {fiados.length > fiadosPorPagina && (
                    <div className="flex justify-between items-center p-4 bg-slate-950/70 border-t border-slate-800 text-sm text-slate-300">
                      <span>
                        Mostrando {((paginaActualFiados - 1) * fiadosPorPagina) + 1} - {Math.min(paginaActualFiados * fiadosPorPagina, fiados.length)} de {fiados.length} fiados
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPaginaActualFiados(Math.max(1, paginaActualFiados - 1))}
                          disabled={paginaActualFiados === 1}
                          className="px-3 py-1 bg-slate-800 border border-amber-500 text-amber-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-700/20 transition-all"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setPaginaActualFiados(Math.min(Math.ceil(fiados.length / fiadosPorPagina), paginaActualFiados + 1))}
                          disabled={paginaActualFiados === Math.ceil(fiados.length / fiadosPorPagina)}
                          className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-all"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Tab de Inventario - Estilo Pomerania con CRUD Completo */}
          {activeTab === 'inventario' && usuarioLogueado.rol === 'Administrador' && (
            <div className="space-y-6 pb-20">
              <Card className="bg-slate-900/80 border border-amber-500/30 shadow-lg ring-1 ring-amber-400/30 rounded-2xl">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <Package className="w-6 h-6" />
                      </div>
                      <Title className="text-xl font-black text-slate-800 tracking-tight">
                        Bodega de Licores
                      </Title>
                    </div>
                    <button
                      onClick={() => {
                        setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
                        setIsEditing(false);
                        setIsModalOpen(true);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-500/30 transition-all font-bold text-sm flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Producto
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="relative flex items-center group">
                      <div className="absolute left-4 text-slate-400">
                        <Search size={24} />
                      </div>
                      <input
                        type="text"
                        value={busquedaInventario}
                        onChange={(e) => setBusquedaInventario(e.target.value)}
                        placeholder="Buscar en bodega..."
                        className="w-full p-4 pl-12 bg-slate-800/60 border border-amber-600/50 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-amber-100 placeholder-amber-300 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/80 border border-slate-700/30 shadow-lg ring-1 ring-amber-400/20 rounded-2xl overflow-hidden">
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow className="bg-slate-950/70 border-b border-slate-800">
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300">ID</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300">Código</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300">Nombre</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300 text-right">Stock</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300 text-right">Costo</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300 text-right">Venta</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300 text-right">Ganancia</TableHeaderCell>
                          <TableHeaderCell className="font-black text-xs uppercase text-slate-300 text-center">Acciones</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productosFiltrados
                          .slice((paginaActual - 1) * productosPorPagina, paginaActual * productosPorPagina)
                          .map((producto) => (
                            <TableRow key={producto.id} className="hover:bg-slate-800/70 transition-all">
                              <TableCell className="text-sm font-mono text-slate-400">{producto.id}</TableCell>
                              <TableCell className="text-xs font-mono text-slate-500">{producto.barcode || '-'}</TableCell>
                              <TableCell className="font-bold text-slate-100">{producto.name}</TableCell>
                              <TableCell className={`text-right font-black ${
                                producto.cant <= 5 ? 'text-red-600' : producto.cant <= 10 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                <Badge color={producto.cant <= 5 ? 'red' : 'emerald'} size="xs">{producto.cant} u.</Badge>
                              </TableCell>
                              <TableCell className="text-right text-slate-300 text-sm">{formatCOP(producto.costo)}</TableCell>
                              <TableCell className="text-right font-black text-slate-100 text-sm">{formatCOP(producto.venta)}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-500 text-sm">
                                {formatCOP(producto.venta - producto.costo)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => {
                                      setFormData(producto);
                                      setIsEditing(true);
                                      setIsModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(producto.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {productosFiltrados.length > productosPorPagina && (
                    <div className="flex justify-between items-center p-4 bg-slate-950/70 border-t border-amber-500/20">
                      <Text className="text-xs text-amber-200 font-medium">
                        Mostrando {((paginaActual - 1) * productosPorPagina) + 1} - {Math.min(paginaActual * productosPorPagina, productosFiltrados.length)} de {productosFiltrados.length} productos
                      </Text>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                          disabled={paginaActual === 1}
                          className="px-3 py-1 bg-slate-800 border border-amber-500 text-amber-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-700/30 transition-all text-sm font-bold"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setPaginaActual(Math.min(Math.ceil(productosFiltrados.length / productosPorPagina), paginaActual + 1))}
                          disabled={paginaActual === Math.ceil(productosFiltrados.length / productosPorPagina)}
                          className="px-3 py-1 bg-amber-500 border border-amber-400 text-slate-950 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-all text-sm font-bold"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'dashboard' && usuarioLogueado.rol === 'Administrador' && (
            <div className="space-y-6 pb-20">
              {/* Filtros Dashboard */}
              <Card className="bg-slate-900/80 border border-amber-500/20 shadow-lg ring-1 ring-amber-400/30 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                      <Title className="text-lg font-black text-amber-100">Panel de Control</Title>
                      <Text className="text-xs text-amber-200 uppercase tracking-wider">Métricas de Rendimiento</Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    
                    {/* Selector de Vendedor */}
                    <select 
                      value={filtroVendedorDashboard}
                      onChange={(e) => setFiltroVendedorDashboard(e.target.value)}
                      className="bg-slate-800 text-amber-100 text-xs font-bold uppercase rounded-lg px-3 py-2 border border-amber-500/30 focus:ring-amber-500 outline-none cursor-pointer"
                    >
                      <option value="Todos">Todos</option>
                      {vendedoresUnicos.filter(v => v !== 'Todos').map(v => <option key={v} value={v}>{v}</option>)}
                    </select>

                    {/* Selector de Fecha con Calendario Personalizado */}
                    <div className="relative z-50">
                      <DatePicker 
                        value={fechaBaseDashboard} 
                        onValueChange={(d) => d && setFechaBaseDashboard(d)}
                        locale={es}
                        className="max-w-[140px] dashboard-datepicker"
                        placeholder="Seleccionar fecha"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setPeriodoDashboard('dia')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${periodoDashboard === 'dia' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Día</button>
                      <button onClick={() => setPeriodoDashboard('semana')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${periodoDashboard === 'semana' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Semana</button>
                      <button onClick={() => setPeriodoDashboard('mes')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${periodoDashboard === 'mes' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Mes</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={exportarReporte} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-full border border-transparent hover:border-emerald-200 transition-all" title="Descargar Excel">
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button onClick={cargarDatos} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* KPIs Principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-900/80 border border-amber-400/20 shadow-lg ring-1 ring-amber-400/30 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-bl-full opacity-25"></div>
                  <Text className="text-amber-200 font-bold uppercase text-[10px] tracking-wider">Venta Bruta ({periodoDashboard})</Text>
                  <Metric className="text-2xl font-black text-amber-100 mt-1">{formatCOP(datosDashboard.totalVentas)}</Metric>
                  <Text className="text-emerald-400 text-[10px] font-bold mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Ingresos
                  </Text>
                </Card>
                
                <Card className="bg-slate-900/80 border border-amber-400/20 shadow-lg ring-1 ring-amber-400/30 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-bl-full opacity-25"></div>
                  <Text className="text-amber-200 font-bold uppercase text-[10px] tracking-wider">Ganancia Neta</Text>
                  <Metric className="text-2xl font-black text-emerald-300 mt-1">{formatCOP(datosDashboard.ganancias)}</Metric>
                  <Text className="text-amber-300 text-[10px] mt-1">Utilidad real</Text>
                </Card>

                <Card className="bg-slate-900/80 border border-amber-400/20 shadow-lg ring-1 ring-amber-400/30 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-bl-full opacity-25"></div>
                  <Text className="text-amber-200 font-bold uppercase text-[10px] tracking-wider">Valor Inventario</Text>
                  <Metric className="text-2xl font-black text-amber-200 mt-1">{formatCOP(valorInventario)}</Metric>
                  <Text className="text-amber-300 text-[10px] mt-1">Dinero en bodega</Text>
                </Card>

                <Card className="bg-slate-900/80 border border-amber-400/20 shadow-lg ring-1 ring-amber-400/30 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-bl-full opacity-25"></div>
                  <Text className="text-amber-200 font-bold uppercase text-[10px] tracking-wider">Cuentas por Cobrar</Text>
                  <Metric className="text-2xl font-black text-rose-400 mt-1">{formatCOP(totalCartera)}</Metric>
                  <Text className="text-amber-300 text-[10px] mt-1">Cartera pendiente</Text>
                </Card>
              </div>

              {/* Sección de Análisis Detallado */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* A. Monitor de Stock Bajo */}
                <Card className="bg-slate-900/80 border border-amber-500/30 shadow-lg ring-1 ring-amber-400/30 rounded-2xl p-0 overflow-hidden lg:col-span-1">
                  <div className="p-4 border-b border-amber-500/30 bg-red-950/30 flex justify-between items-center">
                    <Title className="font-bold text-rose-300 flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4" /> Stock Crítico ({productosBajoStock.length})
                    </Title>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {productosBajoStock.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">Todo el inventario está saludable</div>
                    ) : (
                      <table className="w-full text-left">
                        <thead className="text-[10px] uppercase text-slate-400 bg-slate-50 sticky top-0">
                          <tr>
                            <th className="p-2">Producto</th>
                            <th className="p-2 text-right">Cant</th>
                            <th className="p-2 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {productosBajoStock.map(p => (
                            <tr key={p.id} className="hover:bg-red-50/30">
                              <td className="p-2 text-xs font-bold text-slate-700 truncate max-w-[120px]">{p.name}</td>
                              <td className="p-2 text-xs font-black text-red-600 text-right">{p.cant}</td>
                              <td className="p-2 text-center">
                                <button 
                                  onClick={() => window.open(`https://wa.me/?text=Hola, necesito pedir: ${p.name}`, '_blank')}
                                  className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold"
                                >
                                  Pedir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>

                {/* B. Top Rentables & Huesos */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className=" border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl p-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 ">
                      <Title className="font-bold text-emerald-700 text-sm flex items-center gap-2">
                        <Award className="w-4 h-4" /> Top Rentables
                      </Title>
                    </div>
                    <div className="p-2">
                      {productosRentables.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 hover:bg-[#0D0D0D] rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 w-4">#{idx+1}</span>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{p.nombre}</span>
                          </div>
                          <span className="text-xs font-black text-emerald-600">{formatCOP(p.total)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl p-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <Title className="font-bold text-slate-600 text-sm flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" /> "Hueso" (Lento Movimiento)
                      </Title>
                    </div>
                    <div className="p-2">
                      {productosHueso.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">Todo se está vendiendo bien</div>
                      ) : (
                        productosHueso.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 hover:bg-[#0D0D0D] rounded-lg">
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{p.name}</span>
                            <Badge size="xs" color="slate">Stock: {p.cant}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl p-6">
                  <Title className="font-bold text-slate-800 mb-4">Top Productos Vendidos</Title>
                  <BarChart
                    className="h-72"
                    data={datosDashboard.ventasPorProducto}
                    index="nombre"
                    categories={["total"]}
                    colors={["amber"]}
                    valueFormatter={formatCOP}
                    yAxisWidth={80}
                  />
                </Card>
                <Card className="bg-white border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl p-6">
                  <Title className="font-bold text-slate-800 mb-4">Ventas por Vendedor</Title>
                  <DonutChart
                    className="h-72"
                    data={datosDashboard.ventasPorVendedor}
                    category="cantidad"
                    index="vendedor"
                    valueFormatter={(number) => `${number} ventas`}
                    colors={["slate", "violet", "indigo", "rose", "amber", "orange"]}
                  />
                </Card>
              </div>

              {/* Tabla Detallada */}
              <Card className="bg-white border-0 shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <Title className="font-bold text-slate-800">Detalle de Transacciones</Title>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow className="bg-slate-50">
                        <TableHeaderCell className="text-slate-500">Hora</TableHeaderCell>
                        <TableHeaderCell className="text-slate-500">Producto</TableHeaderCell>
                        <TableHeaderCell className="text-slate-500">Vendedor</TableHeaderCell>
                        <TableHeaderCell className="text-slate-500 text-right">Monto</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {datosDashboard.ventasDetalladas.slice(0, 10).map((venta, idx) => (
                        <TableRow key={idx} className="hover:bg-[#0D0D0D]">
                          <TableCell className="text-slate-600 font-mono text-xs">
                            {new Date(venta.fecha).toLocaleDateString()} {new Date(venta.fecha).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs max-w-[200px] truncate">
                            {venta.nombre_producto || 'Venta General'}
                          </TableCell>
                          <TableCell>
                            <Badge size="xs" color="slate">{venta.vendedor || 'Sistema'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-800">
                            {formatCOP(venta.precio_venta)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {/* Tab de Ventas Especiales (Kevin) */}
          {activeTab === 'ventas-especiales' && (
            <div className="space-y-6 pb-20">
              <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-0 shadow-lg rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full blur-3xl opacity-10 -mr-16 -mt-16"></div>
                <div className="flex flex-col md:flex-row justify-between items-center relative z-10 gap-4">
                  <div>
                    <Text className="text-amber-400 font-bold uppercase tracking-wider text-xs mb-1">Módulo de Crédito Directo</Text>
                    <Title className="text-2xl font-black text-white">Cartera de {clienteEspecial}</Title>
                  </div>
                  <div className="text-right bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                    <Text className="text-slate-300 text-xs uppercase font-bold">Deuda Actual</Text>
                    <Title className="text-3xl font-black text-amber-400">
                      {formatCOP(fiadosPendientes.filter(f => f.cliente_nombre.toLowerCase() === clienteEspecial.toLowerCase()).reduce((acc, curr) => acc + curr.total_fiado, 0))}
                    </Title>
                  </div>
                </div>
              </Card>

              <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-900/75 p-4 rounded-2xl border border-amber-500/30 shadow-[0_20px_40px_rgba(245,145,32,0.18)]">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-300" size={20} />
                  <input
                    type="text"
                    value={busquedaInventario}
                    onChange={(e) => setBusquedaInventario(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full p-3 pl-12 bg-slate-800 border border-amber-400/30 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-amber-100"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                   <input
                      type="text"
                      value={clienteEspecial}
                      onChange={(e) => setClienteEspecial(e.target.value)}
                      className="p-3 border border-amber-400/30 rounded-xl font-bold text-amber-100 w-32 text-center focus:ring-2 focus:ring-amber-400 outline-none bg-slate-900"
                      placeholder="Cliente"
                   />
                   <button
                    onClick={() => setUsarPrecioCosto(!usarPrecioCosto)}
                    className={`p-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${usarPrecioCosto ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                   >
                    {usarPrecioCosto ? '💲 Precio COSTO Activo' : '💲 Precio VENTA'}
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {productosEspecialesPaginados.map(p => (
                  <Card 
                    key={p.id} 
                    className="cursor-pointer bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-400/35 hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-900/40 transition-all group active:scale-[0.985]"
                    onClick={() => iniciarVentaEspecial(p)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge size="xs" color={p.cant > 5 ? 'emerald' : 'red'}>{p.cant} unid</Badge>
                      <Text className="text-[10px] text-slate-400 font-mono">#{p.id}</Text>
                    </div>
                    <Text className="font-bold text-amber-100 leading-tight mb-2 h-10 line-clamp-2">{p.name}</Text>
                    <div className="flex justify-between items-center mt-2">
                      <Text className="text-xs text-amber-300 line-through decoration-red-400">{usarPrecioCosto ? formatCOP(p.venta) : ''}</Text>
                      <Text className={`font-black text-lg ${usarPrecioCosto ? 'text-red-400' : 'text-amber-300'}`}>
                        {formatCOP(usarPrecioCosto ? p.costo : p.venta)}
                      </Text>
                    </div>
                  </Card>
                ))}
              </div>

              {productosFiltrados.length > ventasEspecialesPorPagina && (
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-slate-950/70 border border-amber-400/30 rounded-xl">
                  <div className="text-slate-300 text-sm">
                    Mostrando {((paginaActualVentasEspeciales - 1) * ventasEspecialesPorPagina) + 1} - {Math.min(paginaActualVentasEspeciales * ventasEspecialesPorPagina, productosFiltrados.length)} de {productosFiltrados.length} productos
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPaginaActualVentasEspeciales(Math.max(1, paginaActualVentasEspeciales - 1))}
                      disabled={paginaActualVentasEspeciales === 1}
                      className="px-3 py-1 bg-amber-500 text-slate-900 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-all"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPaginaActualVentasEspeciales(Math.min(totalPaginasVentasEspeciales, paginaActualVentasEspeciales + 1))}
                      disabled={paginaActualVentasEspeciales === totalPaginasVentasEspeciales}
                      className="px-3 py-1 bg-amber-500 text-slate-900 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-all"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal CRUD - Estilo Pomerania */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8 bg-white rounded-3xl shadow-2xl border-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                  <Package className="w-6 h-6" />
                </div>
                <Title className="text-xl font-black text-slate-800">
                  {isEditing ? 'Editar' : 'Nuevo'}
                </Title>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditing(false);
                  setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
                }}
                className="p-2 text-slate-400 hover:text-red-500 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (isEditing) {
                handleUpdateProduct();
              } else {
                handleCreateProduct();
              }
            }} className="space-y-6">
              <div>
                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">ID del Producto</Text>
                <input
                  disabled={isEditing}
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                  required
                />
              </div>
              
              <div>
                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Código de Barras</Text>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400">
                    <Barcode size={20} />
                  </div>
                  <input
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Código de barras (opcional)"
                  />
                </div>
              </div>
              
              <div>
                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Nombre del Licor</Text>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800"
                  placeholder="Ej: Whisky Buchanans 12 Años"
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Text className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Stock</Text>
                  <input
                    type="number"
                    value={formData.cant}
                    onChange={e => setFormData({ ...formData, cant: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <Text className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Costo</Text>
                  <input
                    type="number"
                    value={formData.costo}
                    onChange={e => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-600"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <Text className="text-xs font-bold text-emerald-600 uppercase mb-2 text-center">Venta</Text>
                  <input
                    type="number"
                    value={formData.venta}
                    onChange={e => setFormData({ ...formData, venta: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center font-black text-emerald-700"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all mt-4"
              >
                <div className="flex items-center justify-center gap-3 text-lg">
                  <Save className="w-5 h-5" />
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </div>
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Venta Especial (Kevin) */}
      {ventaEspecialModal && productoEspecial && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-6 bg-white rounded-3xl shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agregando a cuenta de {clienteEspecial}</Text>
              <Title className="text-xl font-black text-slate-800 leading-tight mt-1">{productoEspecial.name}</Title>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    autoFocus
                    value={cantidadEspecial}
                    onChange={(e) => setCantidadEspecial(Math.max(1, Number(e.target.value)))}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-center text-lg focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Precio Unit.</label>
                  <input
                    type="number"
                    value={precioEspecial}
                    onChange={(e) => setPrecioEspecial(Number(e.target.value))}
                    className={`w-full p-3 bg-slate-50 border-2 rounded-xl font-black text-center text-lg focus:border-amber-500 outline-none ${precioEspecial < productoEspecial.venta ? 'text-red-500 border-red-100' : 'text-slate-800 border-slate-200'}`}
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button onClick={confirmarVentaEspecial} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black uppercase shadow-lg shadow-amber-500/30 transition-all active:scale-95">
                  Confirmar {formatCOP(precioEspecial * cantidadEspecial)}
                </button>
                <button onClick={() => setVentaEspecialModal(false)} className="w-full py-3 text-slate-400 font-bold text-sm mt-2 hover:text-slate-600">Cancelar</button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;
