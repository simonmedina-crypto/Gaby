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
  const [activeTab, setActiveTab] = useState('inventario');
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
  const [productosPorPagina] = useState(10);
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
        icon: 'error',
        title: '¡Stock Insuficiente!',
        text: `Solo quedan ${producto.cant} unidades. Ya tienes ${carrito[indiceExistente]?.cantidad || 0} en el carrito.`,
        position: 'center',
        timer: 2000,
        showConfirmButton: false
      });
      return false;
    }

    // 3. Sonido de confirmación
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    // 4. Agregar al carrito
    if (indiceExistente !== -1) {
      const nuevoCarrito = [...carrito];
      nuevoCarrito[indiceExistente].cantidad += cantidadSolicitada;
      nuevoCarrito[indiceExistente].subtotal = nuevoCarrito[indiceExistente].cantidad * nuevoCarrito[indiceExistente].precio_venta;
      setCarrito(nuevoCarrito);
    } else {
      setCarrito([...carrito, {
        ...producto,
        cantidad: cantidadSolicitada,
        subtotal: cantidadSolicitada * producto.venta
      }]);
    }

    // 5. Limpiar inputs
    setBarcode("");
    setCantidadVenta(1);
    if (inputRef.current) {
      inputRef.current.focus();
    }

    return true;
  };

  // --- FUNCIÓN PARA ELIMINAR DEL CARRITO ---
  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  // --- FUNCIÓN PARA ACTUALIZAR CANTIDAD EN CARRITO ---
  const actualizarCantidadCarrito = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(id);
      return;
    }

    const producto = productos.find(p => p.id === id);
    if (nuevaCantidad > producto.cant) {
      Swal.fire({
        toast: true,
        icon: 'error',
        title: '¡Stock Insuficiente!',
        text: `Solo quedan ${producto.cant} unidades.`,
        position: 'center',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    const nuevoCarrito = carrito.map(item => 
      item.id === id 
        ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precio_venta }
        : item
    );
    setCarrito(nuevoCarrito);
  };

  // --- FUNCIÓN PARA PROCESAR VENTA ---
  const procesarVenta = async () => {
    if (carrito.length === 0) {
      Swal.fire('Error', 'El carrito está vacío', 'error');
      return;
    }

    if (esFiado && !nombreClienteFiado.trim()) {
      Swal.fire('Error', 'Debe ingresar el nombre del cliente para el fiado', 'error');
      return;
    }

    if (metodoPago === 'efectivo' && pagoCon < total) {
      Swal.fire('Error', 'El dinero recibido es insuficiente', 'error');
      return;
    }

    try {
      const ventaData = {
        items: carrito.map(item => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.venta,
          subtotal: item.subtotal
        })),
        metodo_pago: metodoPago,
        total: total,
        es_fiado: esFiado,
        nombre_cliente: esFiado ? nombreClienteFiado : null,
        pago_con: metodoPago === 'efectivo' ? pagoCon : null,
        cambio: metodoPago === 'efectivo' ? pagoCon - total : 0
      };

      await processSale(ventaData);

      // Sonido de venta exitosa
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.5;
      audio.play().catch(() => {});

      Swal.fire({
        title: '¡Venta Exitosa!',
        text: esFiado ? `Fiado registrado para ${nombreClienteFiado}` : `Venta procesada correctamente`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      // Limpiar carrito y formulario
      setCarrito([]);
      setPagoCon(0);
      setEsFiado(false);
      setNombreClienteFiado('');
      
      // Recargar datos
      await cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message || 'No se pudo procesar la venta', 'error');
    }
  };

  // --- FUNCIÓN PARA BUSCAR PRODUCTO POR CÓDIGO DE BARRAS ---
  const buscarProductoPorBarcode = async (barcode) => {
    if (!barcode.trim()) return;
    
    try {
      const producto = await getProductByBarcode(barcode.trim());
      if (producto) {
        agregarProductoAlCarrito(producto, cantidadVenta);
      } else {
        Swal.fire({
          toast: true,
          icon: 'warning',
          title: 'Producto no encontrado',
          text: `No hay producto con el código: ${barcode}`,
          position: 'center',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      Swal.fire('Error', 'No se pudo buscar el producto', 'error');
    }
  };

  // --- FUNCIÓN PARA CARGAR DATOS ---
  const cargarDatos = async () => {
    try {
      const productosData = await getProductos();
      setProductos(productosData);
      
      const ventasData = await getSalesHistory();
      setVentas(ventasData);
      
      // Cargar ventas del turno actual
      const hoy = new Date().toDateString();
      const ventasHoy = ventasData.filter(v => new Date(v.fecha).toDateString() === hoy);
      setVentasTurno(ventasHoy);
      
      // Cargar fiados
      const fiadosData = await obtenerFiados();
      setFiados(fiadosData);
      
      const fiadosPendientesData = await obtenerFiadosPendientes();
      setFiadosPendientes(fiadosPendientesData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
    }
  };

  // --- FUNCIÓN PARA CREAR/EDITAR PRODUCTO ---
  const handleSaveProduct = async () => {
    try {
      if (isEditing) {
        await updateProduct(formData.id, formData);
        Swal.fire('¡Actualizado!', 'El producto ha sido actualizado', 'success');
      } else {
        await createProduct(formData);
        Swal.fire('¡Creado!', 'El producto ha sido creado', 'success');
      }
      
      setIsModalOpen(false);
      setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
      setIsEditing(false);
      await cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message || 'No se pudo guardar el producto', 'error');
    }
  };

  // --- FUNCIÓN PARA ELIMINAR PRODUCTO ---
  const handleDeleteProduct = async (productId) => {
    try {
      const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
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

  // --- EFECTOS ---
  useEffect(() => {
    cargarDatos();
  }, []);

  // --- CÁLCULOS ---
  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const totalProductos = productos.reduce((sum, p) => sum + p.cant, 0);
  const productosFiltrados = productos.filter(p => 
    p.name.toLowerCase().includes(busquedaInventario.toLowerCase()) ||
    p.id.toLowerCase().includes(busquedaInventario.toLowerCase()) ||
    (p.barcode && p.barcode.includes(busquedaInventario))
  );
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

  // --- RENDER ---
  if (!usuarioLogueado) {
    return <Login onLogin={setUsuarioLogueado} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* SIDEBAR */}
      <div className={`fixed left-0 top-0 h-full bg-slate-800 border-r border-slate-700 transition-all duration-300 z-50 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Wine className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-xl text-white">Licorera Gaby</span>
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'inventario', label: 'Inventario', icon: Package },
              { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'fiados', label: 'Fiados', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {!sidebarCollapsed && <span className="font-medium">{tab.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => setUsuarioLogueado(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-6">
          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">
              {activeTab === 'inventario' && 'Inventario de Productos'}
              {activeTab === 'ventas' && 'Punto de Venta'}
              {activeTab === 'dashboard' && 'Dashboard de Ventas'}
              {activeTab === 'fiados' && 'Gestión de Fiados'}
            </h1>
            <p className="text-slate-400">
              {activeTab === 'inventario' && `Gestiona tu catálogo de ${totalProductos} productos`}
              {activeTab === 'ventas' && 'Procesa ventas rápidamente'}
              {activeTab === 'dashboard' && 'Visualiza el rendimiento del negocio'}
              {activeTab === 'fiados' && 'Controla los créditos a clientes'}
            </p>
          </div>

          {/* INVENTARIO */}
          {activeTab === 'inventario' && (
            <div className="space-y-6">
              {/* TARJETA DE ESTADÍSTICAS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Productos</p>
                      <p className="text-2xl font-bold">{productos.length}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-200" />
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Stock Total</p>
                      <p className="text-2xl font-bold">{totalProductos}</p>
                    </div>
                    <Package className="w-8 h-8 text-green-200" />
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Bajo Stock</p>
                      <p className="text-2xl font-bold">{productos.filter(p => p.cant <= 5).length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-amber-200" />
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Valor Inventario</p>
                      <p className="text-2xl font-bold">{formatCOP(productos.reduce((sum, p) => sum + (p.cant * p.costo), 0))}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-200" />
                  </div>
                </Card>
              </div>

              {/* BARRA DE BÚSQUEDA Y ACCIONES */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        value={busquedaInventario}
                        onChange={(e) => setBusquedaInventario(e.target.value)}
                        placeholder="Buscar productos..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
                      setIsEditing(false);
                      setIsModalOpen(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Nuevo Producto
                  </button>
                </div>
              </Card>

              {/* TABLA DE PRODUCTOS */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow className="bg-slate-900/50 border-b border-slate-700">
                        <TableHeaderCell className="text-slate-300 font-semibold">ID</TableHeaderCell>
                        <TableHeaderCell className="text-slate-300 font-semibold">Código</TableHeaderCell>
                        <TableHeaderCell className="text-slate-300 font-semibold">Producto</TableHeaderCell>
                        <TableHeaderCell className="text-slate-300 font-semibold text-right">Stock</TableHeaderCell>
                        <TableHeaderCell className="text-slate-300 font-semibold text-right">Costo</TableHeaderCell>
                        <TableHeaderCell className="text-slate-300 font-semibold text-right">Venta</TableHeaderCell>
                        <TableHeaderCell className="text-slate-300 font-semibold text-right">Ganancia</TableHeaderCell>
                        <TableHeaderCell className="text-slate-300 font-semibold text-center">Acciones</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productosFiltrados
                        .slice((paginaActual - 1) * productosPorPagina, paginaActual * productosPorPagina)
                        .map((producto) => (
                          <TableRow key={producto.id} className="hover:bg-slate-700/30 transition-colors border-b border-slate-700/30">
                            <TableCell className="text-slate-300 font-mono">{producto.id}</TableCell>
                            <TableCell className="text-slate-400 font-mono text-sm">{producto.barcode || '-'}</TableCell>
                            <TableCell className="text-white font-medium">{producto.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                color={producto.cant <= 5 ? 'red' : producto.cant <= 10 ? 'amber' : 'emerald'}
                                className="font-semibold"
                              >
                                {producto.cant} u.
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300 text-right">{formatCOP(producto.costo)}</TableCell>
                            <TableCell className="text-white font-semibold text-right">{formatCOP(producto.venta)}</TableCell>
                            <TableCell className="text-emerald-400 font-semibold text-right">
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
                                  className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                                  title="Editar"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(producto.id)}
                                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                  title="Eliminar"
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

                {/* PAGINACIÓN */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 border-t border-slate-700">
                    <div className="text-slate-400 text-sm">
                      Mostrando {((paginaActual - 1) * productosPorPagina) + 1} - {Math.min(paginaActual * productosPorPagina, productosFiltrados.length)} de {productosFiltrados.length} productos
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                        disabled={paginaActual === 1}
                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                      >
                        Anterior
                      </button>
                      <span className="px-3 py-1 bg-amber-500 text-white rounded-lg font-semibold">
                        {paginaActual}
                      </span>
                      <button
                        onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                        disabled={paginaActual === totalPaginas}
                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* VENTAS */}
          {activeTab === 'ventas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PANEL DE VENTA */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-amber-500" />
                        Nueva Venta
                      </h2>
                      
                      {/* ESCÁNER DE CÓDIGO */}
                      <div className="mb-6">
                        <label className="block text-slate-300 text-sm font-medium mb-2">Código de Barras</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                              ref={inputRef}
                              type="text"
                              value={barcode}
                              onChange={(e) => setBarcode(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  buscarProductoPorBarcode(barcode);
                                }
                              }}
                              placeholder="Escanear o ingresar código..."
                              className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                          </div>
                          <input
                            type="number"
                            value={cantidadVenta}
                            onChange={(e) => setCantidadVenta(Number(e.target.value))}
                            placeholder="Cant"
                            min="1"
                            className="w-20 px-3 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* CARRITO */}
                      <div className="space-y-2">
                        <h3 className="text-slate-300 font-medium">Carrito ({carrito.length} productos)</h3>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {carrito.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>Carrito vacío</p>
                            </div>
                          ) : (
                            carrito.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-white font-medium">{item.name}</p>
                                  <p className="text-slate-400 text-sm">{formatCOP(item.venta)} c/u</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={item.cantidad}
                                    onChange={(e) => actualizarCantidadCarrito(item.id, Number(e.target.value))}
                                    min="1"
                                    className="w-16 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-center"
                                  />
                                  <button
                                    onClick={() => eliminarDelCarrito(item.id)}
                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* TOTAL Y MÉTODO DE PAGO */}
                      <div className="mt-6 space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-700/30 rounded-lg">
                          <span className="text-slate-300 font-medium">Total:</span>
                          <span className="text-2xl font-bold text-white">{formatCOP(total)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setMetodoPago('efectivo')}
                            className={`p-3 rounded-xl font-semibold transition-all ${
                              metodoPago === 'efectivo'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            <Wallet className="w-4 h-4 inline mr-2" />
                            Efectivo
                          </button>
                          <button
                            onClick={() => setMetodoPago('transferencia')}
                            className={`p-3 rounded-xl font-semibold transition-all ${
                              metodoPago === 'transferencia'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 inline mr-2" />
                            Transferencia
                          </button>
                        </div>

                        {metodoPago === 'efectivo' && (
                          <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">Dinero Recibido</label>
                            <input
                              type="number"
                              value={pagoCon}
                              onChange={(e) => setPagoCon(Number(e.target.value))}
                              placeholder="0"
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            {pagoCon > 0 && (
                              <div className="mt-2 text-emerald-400 font-semibold">
                                Cambio: {formatCOP(pagoCon - total)}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={procesarVenta}
                          disabled={carrito.length === 0}
                          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg"
                        >
                          <CheckCircle className="w-5 h-5 inline mr-2" />
                          Procesar Venta
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* PANEL LATERAL */}
                <div className="space-y-6">
                  {/* ESTADÍSTICAS RÁPIDAS */}
                  <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Resumen del Día</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ventas hoy:</span>
                          <span className="text-white font-semibold">{ventasTurno.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total vendido:</span>
                          <span className="text-emerald-400 font-semibold">
                            {formatCOP(ventasTurno.reduce((sum, v) => sum + (v.total || 0), 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* VENTAS RECIENTES */}
                  <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Ventas Recientes</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {ventasTurno.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sin ventas hoy</p>
                          </div>
                        ) : (
                          ventasTurno.slice().reverse().map((venta, index) => (
                            <div key={index} className="p-3 bg-slate-700/30 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-medium">{formatCOP(venta.total || 0)}</p>
                                  <p className="text-slate-400 text-xs">
                                    {new Date(venta.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                </div>
                                <Badge size="xs" color={venta.metodo_pago === 'transferencia' ? 'blue' : 'emerald'}>
                                  {venta.metodo_pago === 'transferencia' ? 'Transf' : 'Efec'}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Dashboard de Ventas</h2>
                  <p className="text-slate-400">Panel de análisis y métricas del negocio</p>
                </div>
              </Card>
            </div>
          )}

          {/* FIADOS */}
          {activeTab === 'fiados' && (
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Gestión de Fiados</h2>
                  <p className="text-slate-400">Control de créditos a clientes</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-slate-800 border-slate-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">ID</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                    placeholder="Ej: 001"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Cerveza Corona"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Código de Barras</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    placeholder="Ej: 750100123456"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Stock</label>
                    <input
                      type="number"
                      value={formData.cant}
                      onChange={(e) => setFormData({...formData, cant: Number(e.target.value)})}
                      placeholder="0"
                      min="0"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Costo</label>
                    <input
                      type="number"
                      value={formData.costo}
                      onChange={(e) => setFormData({...formData, costo: Number(e.target.value)})}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Venta</label>
                    <input
                      type="number"
                      value={formData.venta}
                      onChange={(e) => setFormData({...formData, venta: Number(e.target.value)})}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveProduct}
                  className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold transition-all"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default App;
