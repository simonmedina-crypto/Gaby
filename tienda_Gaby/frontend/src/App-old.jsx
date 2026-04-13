import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Login from './Login';
import { Card, Metric, Text, Title, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Button, Grid, DatePicker, BarChart, DonutChart, TabGroup, TabList, Tab } from "@tremor/react";
import { es } from 'date-fns/locale';
import { Barcode, TrendingUp, TrendingDown, X, Save, Plus, Edit3, Trash2, Search, Menu, LogOut, Package, LayoutDashboard, ShoppingCart, ScanLine, Zap, CreditCard, DollarSign, Wallet, Users, Calendar, Clock, Award, Eye, ChevronRight, User, CheckCircle, AlertCircle, Wine, RefreshCw, FileDown, AlertTriangle, Beer, GlassWater, Upload, Image as ImageIcon, Star, Crown, Sparkles } from 'lucide-react';
import Swal from 'sweetalert2';
import { crearFiado, obtenerFiados, obtenerFiadosPendientes, cobrarFiado, eliminarFiado } from './api/fiadosApi';
import { getInventory, createProduct, updateProduct, deleteProduct, getProductByBarcode } from './api/inventoryApi';
import { getSalesHistory, processSale, getSalesMetrics, getDailySummary } from './api/salesApi';
import './dashboard-calendar.css';
import './styles-pomerania.css';

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
  const [productosPorPagina] = useState(8);
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
  const [mostrarImagenCarga, setMostrarImagenCarga] = useState(false);
  
  // Estados para fiados
  const [fiados, setFiados] = useState([]);
  const [fiadosPendientes, setFiadosPendientes] = useState([]);
  const [esFiado, setEsFiado] = useState(false);
  const [nombreClienteFiado, setNombreClienteFiado] = useState('');

  const inputRef = useRef(null);
  const cantidadRef = useRef(null);

  // --- FUNCIÓN CENTRALIZADA PARA AGREGAR AL CARRITO ---
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
    <div className="min-h-screen">
      {/* SIDEBAR */}
      <div className={`fixed left-0 top-0 h-full transition-all duration-300 z-50 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4">
          <div className={`flex items-center justify-between mb-8 ${sidebarCollapsed ? 'flex-col' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shine">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-black text-xl text-yellow-600">Licorera</span>
                <span className="font-black text-xl text-yellow-700 ml-1">Gaby</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-yellow-600 hover:text-yellow-700 transition-all hover:scale-110"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <nav className="space-y-3">
            {[
              { id: 'inventario', label: 'Inventario', icon: Package },
              { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'fiados', label: 'Fiados', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg glow' 
                    : 'text-yellow-700 hover:bg-yellow-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {!sidebarCollapsed && <span className="font-bold">{tab.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => setUsuarioLogueado(null)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="font-bold">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-6">
          {/* HEADER */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shine">
                <Wine className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text text-transparent">
                  {activeTab === 'inventario' && 'Bodega de Licores'}
                  {activeTab === 'ventas' && 'Punto de Venta'}
                  {activeTab === 'dashboard' && 'Panel de Control'}
                  {activeTab === 'fiados' && 'Gestión de Fiados'}
                </h1>
                <p className="text-yellow-700 font-medium">
                  {activeTab === 'inventario' && `Gestiona tu catálogo de ${totalProductos} productos`}
                  {activeTab === 'ventas' && 'Procesa ventas rápidamente'}
                  {activeTab === 'dashboard' && 'Visualiza el rendimiento del negocio'}
                  {activeTab === 'fiados' && 'Controla los créditos a clientes'}
                </p>
              </div>
            </div>
          </div>

          {/* INVENTARIO */}
          {activeTab === 'inventario' && (
            <div className="space-y-6">
              {/* TARJETAS DE ESTADÍSTICAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="metric-card shine">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Total Productos</p>
                      <p className="text-3xl font-black">{productos.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Card>
                
                <Card className="metric-card shine">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Stock Total</p>
                      <p className="text-3xl font-black">{totalProductos}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Card>
                
                <Card className="metric-card shine">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Bajo Stock</p>
                      <p className="text-3xl font-black">{productos.filter(p => p.cant <= 5).length}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Card>
                
                <Card className="metric-card shine">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Valor Inventario</p>
                      <p className="text-3xl font-black">{formatCOP(productos.reduce((sum, p) => sum + (p.cant * p.costo), 0))}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* BARRA DE BÚSQUEDA Y ACCIONES */}
              <Card className="shine">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-600 w-5 h-5" />
                      <input
                        type="text"
                        value={busquedaInventario}
                        onChange={(e) => setBusquedaInventario(e.target.value)}
                        placeholder="Buscar en la bodega dorada..."
                        className="w-full pl-12 pr-4 py-4 bg-white/90 border-2 border-yellow-400 rounded-2xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
                      setIsEditing(false);
                      setIsModalOpen(true);
                    }}
                    className="btn shine flex items-center gap-2 px-6 py-4"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-bold">Nuevo Producto</span>
                  </button>
                </div>
              </Card>

              {/* TABLA DE PRODUCTOS */}
              <Card className="shine overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell className="text-white font-bold">ID</TableHeaderCell>
                        <TableHeaderCell className="text-white font-bold">Código</TableHeaderCell>
                        <TableHeaderCell className="text-white font-bold">Producto</TableHeaderCell>
                        <TableHeaderCell className="text-white font-bold text-right">Stock</TableHeaderCell>
                        <TableHeaderCell className="text-white font-bold text-right">Costo</TableHeaderCell>
                        <TableHeaderCell className="text-white font-bold text-right">Venta</TableHeaderCell>
                        <TableHeaderCell className="text-white font-bold text-right">Ganancia</TableHeaderCell>
                        <TableHeaderCell className="text-white font-bold text-center">Acciones</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productosFiltrados
                        .slice((paginaActual - 1) * productosPorPagina, paginaActual * productosPorPagina)
                        .map((producto) => (
                          <TableRow key={producto.id} className="hover:bg-yellow-50/50 transition-all">
                            <TableCell className="font-mono font-medium">{producto.id}</TableCell>
                            <TableCell className="font-mono text-sm">{producto.barcode || '-'}</TableCell>
                            <TableCell className="font-bold">{producto.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                color={producto.cant <= 5 ? 'red' : producto.cant <= 10 ? 'amber' : 'emerald'}
                                className="font-bold"
                              >
                                {producto.cant} u.
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCOP(producto.costo)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCOP(producto.venta)}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
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
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all hover:scale-110"
                                  title="Editar"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(producto.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-110"
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
                  <div className="flex justify-between items-center p-4 bg-yellow-50/50 border-t-2 border-yellow-400">
                    <div className="text-yellow-700 font-medium">
                      Mostrando {((paginaActual - 1) * productosPorPagina) + 1} - {Math.min(paginaActual * productosPorPagina, productosFiltrados.length)} de {productosFiltrados.length} productos
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                        disabled={paginaActual === 1}
                        className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-xl font-bold">
                        {paginaActual}
                      </span>
                      <button
                        onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                        disabled={paginaActual === totalPaginas}
                        className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <Card className="shine">
                    <div className="p-6">
                      <h2 className="text-2xl font-bold text-yellow-700 mb-6 flex items-center gap-3">
                        <ShoppingCart className="w-6 h-6" />
                        Nueva Venta
                      </h2>
                      
                      {/* ESCÁNER DE CÓDIGO */}
                      <div className="mb-6">
                        <label className="block text-yellow-700 font-bold mb-3">Código de Barras</label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-600 w-5 h-5" />
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
                              className="w-full pl-12 pr-4 py-4 bg-white/90 border-2 border-yellow-400 rounded-2xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                            />
                          </div>
                          <input
                            type="number"
                            value={cantidadVenta}
                            onChange={(e) => setCantidadVenta(Number(e.target.value))}
                            placeholder="Cant"
                            min="1"
                            className="w-24 px-4 py-4 bg-white/90 border-2 border-yellow-400 rounded-2xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                          />
                        </div>
                      </div>

                      {/* CARRITO */}
                      <div className="space-y-4 mb-6">
                        <h3 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5" />
                          Carrito ({carrito.length} productos)
                        </h3>
                        <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                          {carrito.length === 0 ? (
                            <div className="text-center py-12 text-yellow-600">
                              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg font-medium">Carrito vacío</p>
                              <p className="text-sm">Agrega productos para comenzar</p>
                            </div>
                          ) : (
                            carrito.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-4 bg-yellow-50/50 rounded-2xl border border-yellow-200">
                                <div className="flex-1">
                                  <p className="font-bold text-yellow-800 text-lg">{item.name}</p>
                                  <p className="text-yellow-600 font-medium">{formatCOP(item.venta)} c/u</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="number"
                                    value={item.cantidad}
                                    onChange={(e) => actualizarCantidadCarrito(item.id, Number(e.target.value))}
                                    min="1"
                                    className="w-20 px-3 py-2 bg-white border-2 border-yellow-400 rounded-xl text-yellow-800 text-center font-medium"
                                  />
                                  <button
                                    onClick={() => eliminarDelCarrito(item.id)}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-110"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* TOTAL Y MÉTODO DE PAGO */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-6 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-2xl border-2 border-yellow-400">
                          <span className="text-yellow-700 font-bold text-xl">Total:</span>
                          <span className="text-4xl font-black text-yellow-800">{formatCOP(total)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setMetodoPago('efectivo')}
                            className={`btn-secondary flex items-center gap-2 justify-center py-4 ${
                              metodoPago === 'efectivo' ? 'ring-4 ring-yellow-400/50' : ''
                            }`}
                          >
                            <Wallet className="w-5 h-5" />
                            Efectivo
                          </button>
                          <button
                            onClick={() => setMetodoPago('transferencia')}
                            className={`btn-secondary flex items-center gap-2 justify-center py-4 ${
                              metodoPago === 'transferencia' ? 'ring-4 ring-yellow-400/50' : ''
                            }`}
                          >
                            <CreditCard className="w-5 h-5" />
                            Transferencia
                          </button>
                        </div>

                        {metodoPago === 'efectivo' && (
                          <div>
                            <label className="block text-yellow-700 font-bold mb-3">Dinero Recibido</label>
                            <input
                              type="number"
                              value={pagoCon}
                              onChange={(e) => setPagoCon(Number(e.target.value))}
                              placeholder="0"
                              className="w-full px-6 py-4 bg-white/90 border-2 border-yellow-400 rounded-2xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-bold text-xl"
                            />
                            {pagoCon > 0 && (
                              <div className="mt-3 text-green-600 font-bold text-xl">
                                Cambio: {formatCOP(pagoCon - total)}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={procesarVenta}
                          disabled={carrito.length === 0}
                          className="btn w-full py-6 text-xl font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shine"
                        >
                          <CheckCircle className="w-6 h-6" />
                          Procesar Venta
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* PANEL LATERAL */}
                <div className="space-y-6">
                  {/* ESTADÍSTICAS RÁPIDAS */}
                  <Card className="shine">
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Resumen del Día
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                          <span className="text-yellow-700 font-medium">Ventas hoy:</span>
                          <span className="font-black text-yellow-800 text-xl">{ventasTurno.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                          <span className="text-green-700 font-medium">Total vendido:</span>
                          <span className="font-black text-green-800 text-xl">
                            {formatCOP(ventasTurno.reduce((sum, v) => sum + (v.total || 0), 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* VENTAS RECIENTES */}
                  <Card className="shine">
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Ventas Recientes
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {ventasTurno.length === 0 ? (
                          <div className="text-center py-8 text-yellow-600">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Sin ventas hoy</p>
                          </div>
                        ) : (
                          ventasTurno.slice().reverse().map((venta, index) => (
                            <div key={index} className="p-4 bg-yellow-50/50 rounded-2xl border border-yellow-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-yellow-800 text-lg">{formatCOP(venta.total || 0)}</p>
                                  <p className="text-yellow-600 text-sm">
                                    {new Date(venta.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                </div>
                                <Badge size="sm" color={venta.metodo_pago === 'transferencia' ? 'blue' : 'emerald'}>
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
              <Card className="shine">
                <div className="p-8 text-center">
                  <Sparkles className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-yellow-700 mb-4">Dashboard de Ventas</h2>
                  <p className="text-yellow-600 text-lg">Panel de análisis y métricas del negocio</p>
                  <p className="text-yellow-500 mt-4">Próximamente con gráficas y estadísticas detalladas...</p>
                </div>
              </Card>
            </div>
          )}

          {/* FIADOS */}
          {activeTab === 'fiados' && (
            <div className="space-y-6">
              <Card className="shine">
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-yellow-700 mb-4">Gestión de Fiados</h2>
                  <p className="text-yellow-600 text-lg">Control de créditos a clientes</p>
                  <p className="text-yellow-500 mt-4">Próximamente con gestión completa de fiados...</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 shine">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-yellow-700 flex items-center gap-3">
                  <Package className="w-6 h-6" />
                  {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-yellow-600 hover:text-yellow-700 transition-all hover:scale-110"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-yellow-700 font-bold mb-3">ID</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                    placeholder="Ej: 001"
                    className="w-full px-4 py-3 bg-white/90 border-2 border-yellow-400 rounded-xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-yellow-700 font-bold mb-3">Código de Barras</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    placeholder="Ej: 750100123456"
                    className="w-full px-4 py-3 bg-white/90 border-2 border-yellow-400 rounded-xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-yellow-700 font-bold mb-3">Nombre del Producto</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Cerveza Corona"
                    className="w-full px-4 py-3 bg-white/90 border-2 border-yellow-400 rounded-xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-yellow-700 font-bold mb-3">Stock</label>
                  <input
                    type="number"
                    value={formData.cant}
                    onChange={(e) => setFormData({...formData, cant: Number(e.target.value)})}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 bg-white/90 border-2 border-yellow-400 rounded-xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-yellow-700 font-bold mb-3">Costo</label>
                  <input
                    type="number"
                    value={formData.costo}
                    onChange={(e) => setFormData({...formData, costo: Number(e.target.value)})}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/90 border-2 border-yellow-400 rounded-xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-yellow-700 font-bold mb-3">Precio de Venta</label>
                  <input
                    type="number"
                    value={formData.venta}
                    onChange={(e) => setFormData({...formData, venta: Number(e.target.value)})}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/90 border-2 border-yellow-400 rounded-xl text-yellow-800 placeholder-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 focus:border-transparent font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleSaveProduct}
                  className="flex-1 btn py-4 text-lg font-bold shine flex items-center justify-center gap-3"
                >
                  <Save className="w-5 h-5" />
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 btn-secondary py-4 text-lg font-bold"
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
