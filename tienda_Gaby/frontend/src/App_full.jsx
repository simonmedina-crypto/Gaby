import React, { useState, useEffect, useRef, useCallback } from 'react';
import Login from './Login';
import { Card, Metric, Text, Title, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Button, Grid, DatePicker } from "@tremor/react";
import { es } from 'date-fns/locale';
import { Barcode, TrendingUp, X, Save, Plus, Edit3, Trash2, Search, Menu, LogOut, Package, LayoutDashboard, ShoppingCart, ScanLine, Zap, CreditCard, DollarSign, Wallet, Users, Calendar, Clock, Award, Eye, ChevronRight, User, CheckCircle, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { crearFiado, obtenerFiados, obtenerFiadosPendientes, cobrarFiado, eliminarFiado } from './api/fiadosApi';

const API_URL = 'http://localhost:8000';

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
  const [productosPorPagina] = useState(10);
  const [ventasPorPagina] = useState(10);
  const [paginaActualVentas, setPaginaActualVentas] = useState(1);
  const [periodoDashboard, setPeriodoDashboard] = useState('hoy');
  const [calendarioDesplegado, setCalendarioDesplegado] = useState(false);
  const [filtroVendedorDashboard, setFiltroVendedorDashboard] = useState('Todos');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [diaSeleccionadoCalendario, setDiaSeleccionadoCalendario] = useState(null);
  const [vistaDiaEspecifico, setVistaDiaEspecifico] = useState(false);
  
  // Estados para fiados
  const [fiados, setFiados] = useState([]);
  const [fiadosPendientes, setFiadosPendientes] = useState([]);
  const [esFiado, setEsFiado] = useState(false);
  const [nombreClienteFiado, setNombreClienteFiado] = useState('');

  const inputRef = useRef(null);
  const cantidadRef = useRef(null);

  // Cargar datos iniciales
  const cargarDatos = async () => {
    try {
      const [resProductos, resVentas] = await Promise.all([
        fetch(`${API_URL}/inventory`),
        fetch(`${API_URL}/historial-ventas`)
      ]);
      
      if (resProductos.ok && resVentas.ok) {
        const dataProductos = await resProductos.json();
        const dataVentas = await resVentas.json();
        
        setProductos(dataProductos);
        setVentas(dataVentas);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
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
        // Procesar como venta normal
        const response = await fetch(`${API_URL}/facturar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: carrito.map(i => ({ id: String(i.id), cantidad: Number(i.cantidad) || 1 })),
            vendedor: usuarioLogueado?.nombre || 'Sistema',
            metodo: metodoPago,
            valor_recibido: Number(pagoCon)
          })
        });

        if (!response.ok) {
          throw new Error('Error al procesar venta');
        }

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

  // Resto de las funciones existentes...
  const seleccionarProductoSugerencia = (producto) => {
    setCarrito([...carrito, {
      ...producto,
      cantidad: Number(cantidadVenta) || 1,
      precio: producto.venta,
      subtotal: producto.venta * (Number(cantidadVenta) || 1)
    }]);
    setBusqueda("");
    setSugerencias([]);
    setBarcode("");
    setCantidadVenta(1);
    inputRef.current?.focus();
  };

  const manejarPistola = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    
    const producto = productos.find(p => p.barcode === barcode);
    if (producto) {
      if (producto.cant >= (Number(cantidadVenta) || 1)) {
        seleccionarProductoSugerencia(producto);
      } else {
        Swal.fire('Stock insuficiente', `Solo hay ${producto.cant} unidades disponibles`, 'warning');
      }
    } else {
      Swal.fire('Producto no encontrado', 'El código de barras no existe en el inventario', 'error');
    }
  };

  const eliminarDelCarrito = (index) => {
    const nuevoCarrito = carrito.filter((_, i) => i !== index);
    setCarrito(nuevoCarrito);
  };

  const actualizarCantidadCarrito = (index, nuevaCantidad) => {
    const nuevoCarrito = [...carrito];
    const producto = nuevoCarrito[index];
    const cantidad = Number(nuevaCantidad) || 1;
    
    const productoOriginal = productos.find(p => p.id === producto.id);
    if (productoOriginal && cantidad <= productoOriginal.cant) {
      nuevoCarrito[index] = {
        ...producto,
        cantidad,
        subtotal: producto.precio * cantidad
      };
      setCarrito(nuevoCarrito);
    } else {
      Swal.fire('Stock insuficiente', `Solo hay ${productoOriginal?.cant || 0} unidades disponibles`, 'warning');
    }
  };

  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Funciones de dashboard
  const obtenerDatosCompletosPorPeriodo = useCallback(() => {
    const ventasFiltradas = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      const ahora = new Date();
      const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      const inicioSemana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - ahora.getDay());
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      
      let fechaLimite;
      switch (periodoDashboard) {
        case 'hoy':
          fechaLimite = inicioDia;
          break;
        case 'semana':
          fechaLimite = inicioSemana;
          break;
        case 'mes':
          fechaLimite = inicioMes;
          break;
        default:
          fechaLimite = inicioDia;
      }
      
      return fechaVenta >= fechaLimite;
    });

    if (filtroVendedorDashboard !== 'Todos') {
      return ventasFiltradas.filter(v => v.vendedor === filtroVendedorDashboard);
    }
    
    return ventasFiltradas;
  }, [ventas, periodoDashboard, filtroVendedorDashboard]);

  const obtenerDatosDiaEspecifico = useCallback(() => {
    if (!diaSeleccionadoCalendario) return null;
    
    const ventasFiltradas = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      const fechaSeleccionada = new Date(diaSeleccionadoCalendario);
      return fechaVenta.toDateString() === fechaSeleccionada.toDateString();
    });

    if (filtroVendedorDashboard !== 'Todos') {
      return ventasFiltradas.filter(v => v.vendedor === filtroVendedorDashboard);
    }
    
    return ventasFiltradas;
  }, [ventas, diaSeleccionadoCalendario, filtroVendedorDashboard]);

  const datosDashboard = useMemo(() => {
    const ventasFiltradas = obtenerDatosCompletosPorPeriodo();
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.precio_venta || 0), 0);
    const ganancias = ventasFiltradas.reduce((sum, v) => {
      const producto = productos.find(p => p.id === v.producto_id);
      if (producto) {
        return sum + ((v.precio_venta || 0) - producto.costo);
      }
      return sum;
    }, 0);
    
    const ventasPorProducto = {};
    const ventasPorVendedor = {};
    
    ventasFiltradas.forEach(v => {
      const producto = productos.find(p => p.id === v.producto_id);
      if (producto) {
        ventasPorProducto[producto.name] = (ventasPorProducto[producto.name] || 0) + 1;
      }
      
      ventasPorVendedor[v.vendedor] = (ventasPorVendedor[v.vendedor] || 0) + 1;
    });
    
    return {
      titulo: periodoDashboard === 'hoy' ? 'Hoy' : periodoDashboard === 'semana' ? 'Esta Semana' : 'Este Mes',
      periodo: `Del ${new Date().toLocaleDateString('es-CO')}`,
      totalVentas,
      ganancias,
      cantidadVentas: ventasFiltradas.length,
      ventasPorProducto: Object.entries(ventasPorProducto).map(([nombre, cantidad]) => ({ nombre, cantidad })),
      ventasPorVendedor: Object.entries(ventasPorVendedor).map(([vendedor, cantidad]) => ({ vendedor, cantidad })),
      ventasDetalladas: ventasFiltradas
    };
  }, [obtenerDatosCompletosPorPeriodo, productos]);

  const datosDiaEspecifico = useMemo(() => {
    const ventasFiltradas = obtenerDatosDiaEspecifico();
    if (!ventasFiltradas || ventasFiltradas.length === 0) return null;
    
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.precio_venta || 0), 0);
    const ganancias = ventasFiltradas.reduce((sum, v) => {
      const producto = productos.find(p => p.id === v.producto_id);
      if (producto) {
        return sum + ((v.precio_venta || 0) - producto.costo);
      }
      return sum;
    }, 0);
    
    const ventasPorProducto = {};
    const ventasPorVendedor = {};
    
    ventasFiltradas.forEach(v => {
      const producto = productos.find(p => p.id === v.producto_id);
      if (producto) {
        ventasPorProducto[producto.name] = (ventasPorProducto[producto.name] || 0) + 1;
      }
      
      ventasPorVendedor[v.vendedor] = (ventasPorVendedor[v.vendedor] || 0) + 1;
    });
    
    return {
      fecha: diaSeleccionadoCalendario.toLocaleDateString('es-CO'),
      totalVentas,
      ganancias,
      cantidadVentas: ventasFiltradas.length,
      ventasPorProducto: Object.entries(ventasPorProducto).map(([nombre, cantidad]) => ({ nombre, cantidad })),
      ventasPorVendedor: Object.entries(ventasPorVendedor).map(([vendedor, cantidad]) => ({ vendedor, cantidad })),
      ventasDetalladas: ventasFiltradas
    };
  }, [obtenerDatosDiaEspecifico, productos, diaSeleccionadoCalendario]);

  const vendedoresUnicos = useMemo(() => {
    const vendedores = new Set(ventas.map(v => v.vendedor));
    return ['Todos', ...Array.from(vendedores)];
  }, [ventas]);

  // Si no hay nadie logueado, mostramos el componente Login
  if (!usuarioLogueado) {
    return <Login onLoginSuccess={(user) => setUsuarioLogueado(user)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      {/* Header con colores profesionales */}
      <header className="bg-gradient-to-r from-slate-800 to-zinc-800 border-b border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl hover:bg-slate-700 transition-all duration-300 hover:scale-105 group"
            >
              <Menu className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-zinc-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <img
                    src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop&crop=face&auto=format"
                    alt="Pomerania Gaby"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div>
                <Title className="text-2xl font-bold text-white">
                  🐕 Tienda Gaby
                </Title>
                <Text className="text-xs text-slate-300">Sistema de Gestión</Text>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <Text className="text-sm text-slate-300 font-medium">Usuario</Text>
              <Text className="text-base font-bold text-white">{usuarioLogueado.nombre}</Text>
            </div>
            <div className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg">
              <Text className="text-sm font-bold text-white uppercase">{usuarioLogueado.rol}</Text>
            </div>
            <button
              onClick={() => setUsuarioLogueado(null)}
              className="p-2 rounded-xl hover:bg-slate-700 transition-all duration-300 hover:scale-105 group"
            >
              <LogOut className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar con colores profesionales */}
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-800 to-zinc-800 border-r border-slate-700 min-h-screen transition-all duration-300 shadow-lg`}>
          <nav className="p-6 space-y-4">
            <button
              onClick={() => setActiveTab('ventas')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                activeTab === 'ventas' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                  : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <ShoppingCart className="w-6 h-6" />
              {!sidebarCollapsed && <span className="text-sm font-semibold">Ventas</span>}
            </button>
            
            {usuarioLogueado.rol === 'Administrador' && (
              <button
                onClick={() => setActiveTab('inventario')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  activeTab === 'inventario' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                    : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <Package className="w-6 h-6" />
                {!sidebarCollapsed && <span className="text-sm font-semibold">Inventario</span>}
              </button>
            )}
            
            {usuarioLogueado.rol === 'Administrador' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  activeTab === 'dashboard' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                    : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <LayoutDashboard className="w-6 h-6" />
                {!sidebarCollapsed && <span className="text-sm font-semibold">Dashboard</span>}
              </button>
            )}
            
            {usuarioLogueado.rol === 'Administrador' && (
              <button
                onClick={() => setActiveTab('fiados')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  activeTab === 'fiados' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                    : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <User className="w-6 h-6" />
                {!sidebarCollapsed && <span className="text-sm font-semibold">Fiados</span>}
              </button>
            )}
          </nav>
          
          {!sidebarCollapsed && (
            <div className="p-6 mt-8">
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 border border-amber-500 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-400">
                    <img
                      src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop&crop=face&auto=format"
                      alt="Pomerania"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <Title className="text-sm font-bold text-white">Pomerania</Title>
                    <Text className="text-xs text-orange-100">🐕 Tu pomerania</Text>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Tab de Ventas */}
          {activeTab === 'ventas' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-screen">
              <div className="lg:col-span-8 space-y-4">
                {/* Buscador */}
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      <Title className="text-lg font-bold text-slate-800">
                        Catálogo
                      </Title>
                    </div>
                    
                    <div className="relative">
                      <div className="relative flex items-center group">
                        <div className="absolute left-3 text-orange-600">
                          <Search size={20} />
                        </div>
                        <input
                          ref={inputRef}
                          type="text"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Buscar producto por nombre, ID o código..."
                          className="w-full p-3 pl-10 bg-white border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-500 text-gray-900 placeholder-gray-400 transition-all duration-300 hover:bg-slate-50"
                        />
                      </div>
                      {sugerencias.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50">
                          {sugerencias.map(p => (
                            <div
                              key={p.id}
                              onClick={() => seleccionarProductoSugerencia(p)}
                              className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-all duration-200"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <Text className="font-bold text-gray-900 text-sm">{p.name}</Text>
                                  <Text className="text-xs text-gray-500">ID: {p.id} | Stock: {p.cant}</Text>
                                </div>
                                <div className="text-right">
                                  <Text className="font-bold text-amber-600 text-sm">{formatCOP(p.venta)}</Text>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Escaneo y Carrito */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-orange-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-orange-50 to-amber-50">
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                          <ScanLine className="w-5 h-5 text-white" />
                        </div>
                        <Title className="text-lg font-bold text-orange-800">
                          Escaneo
                        </Title>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="w-24 relative">
                          <div className="relative flex items-center group">
                            <div className="absolute left-2 text-orange-600">
                              <Barcode size={16} />
                            </div>
                            <input
                              type="text"
                              value={barcode}
                              onChange={(e) => setBarcode(e.target.value)}
                              placeholder="Código"
                              className="w-full p-2 pl-8 bg-white border-2 border-orange-300 rounded-lg focus:ring-4 focus:ring-orange-200 focus:border-orange-500 text-sm text-gray-900 placeholder-gray-400 transition-all duration-300 hover:bg-orange-50"
                            />
                          </div>
                        </div>
                        
                        <div className="w-20">
                          <input
                            ref={cantidadRef}
                            type="number"
                            value={cantidadVenta}
                            onChange={(e) => setCantidadVenta(e.target.value)}
                            placeholder="Cant"
                            min="1"
                            className="w-full p-2 bg-white border-2 border-orange-300 rounded-lg focus:ring-4 focus:ring-orange-200 focus:border-orange-500 text-sm text-gray-900 text-center placeholder-gray-400 transition-all duration-300 hover:bg-orange-50"
                          />
                        </div>
                        
                        <button
                          onClick={manejarPistola}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg"
                        >
                          <ScanLine className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-500 to-zinc-500 flex items-center justify-center shadow-lg">
                            <ShoppingCart className="w-5 h-5 text-white" />
                          </div>
                          <Title className="text-lg font-bold text-slate-800">
                            Carrito
                          </Title>
                        </div>
                        <div className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                          <Text className="text-xs font-bold text-white">{carrito.length}</Text>
                        </div>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto">
                        {carrito.length === 0 ? (
                          <Text className="text-center text-slate-500 py-4">Carrito vacío</Text>
                        ) : (
                          <div className="space-y-2">
                            {carrito.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                                <div className="flex-1">
                                  <Text className="font-bold text-sm text-gray-900">{item.name}</Text>
                                  <Text className="text-xs text-slate-500">{formatCOP(item.precio)} c/u</Text>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={item.cantidad}
                                    onChange={(e) => actualizarCantidadCarrito(index, e.target.value)}
                                    min="1"
                                    className="w-16 p-1 text-center border border-slate-300 rounded text-sm"
                                  />
                                  <Text className="font-bold text-sm text-amber-600 w-20 text-right">
                                    {formatCOP(item.subtotal)}
                                  </Text>
                                  <button
                                    onClick={() => eliminarDelCarrito(index)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Métodos de Pago */}
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-500 to-zinc-500 flex items-center justify-center shadow-lg">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <Title className="text-lg font-bold text-slate-800">
                        Método de Pago
                      </Title>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        onClick={() => setMetodoPago("efectivo")}
                        className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                          metodoPago === "efectivo" 
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 border-green-400 text-white shadow-xl" 
                            : "bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span className="font-bold text-sm">Efectivo</span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setMetodoPago("transferencia")}
                        className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                          metodoPago === "transferencia" 
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-400 text-white shadow-xl" 
                            : "bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="font-bold text-sm">Transferencia</span>
                        </div>
                      </button>
                    </div>

                    {/* Opción de Fiado */}
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-600" />
                          <Text className="text-sm font-bold text-amber-700">¿Es un fiado?</Text>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={esFiado}
                            onChange={(e) => setEsFiado(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>
                      
                      {esFiado && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={nombreClienteFiado}
                            onChange={(e) => setNombreClienteFiado(e.target.value)}
                            placeholder="Nombre del cliente..."
                            className="w-full p-2 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500 bg-white text-gray-900 placeholder-gray-400 text-sm transition-all duration-300"
                          />
                          <Text className="text-xs text-amber-600">
                            ⚠️ El stock se descontará inmediatamente
                          </Text>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        value={pagoCon}
                        onChange={(e) => setPagoCon(Number(e.target.value) || 0)}
                        placeholder={esFiado ? "No requerido" : (metodoPago === "efectivo" ? "Pago con:" : "Valor:")}
                        disabled={esFiado}
                        className={`w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-500 bg-white text-gray-900 placeholder-gray-400 font-medium transition-all duration-300 hover:bg-slate-50 ${esFiado ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      {metodoPago === "efectivo" && !esFiado && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Wallet className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                    </div>

                    {metodoPago === "efectivo" && !esFiado && (
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <Text className="text-sm font-bold text-green-600">Cambio:</Text>
                        <Text className="font-bold text-green-500">
                          {formatCOP(Math.max(0, pagoCon - total))}
                        </Text>
                      </div>
                    )}

                    <button
                      onClick={procesarVenta}
                      disabled={carrito.length === 0}
                      className={`w-full p-4 rounded-2xl font-bold uppercase shadow-xl hover:scale-105 transition-all duration-300 ${
                        carrito.length === 0
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : esFiado
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3 text-lg">
                        {esFiado ? (
                          <>
                            <User className="w-5 h-5" />
                            <span>Registrar Fiado</span>
                          </>
                        ) : (
                          <>
                            {metodoPago === "transferencia" ? <CreditCard className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                            <span>{metodoPago === "transferencia" ? "Transferir" : "Cobrar"}</span>
                          </>
                        )}
                      </div>
                    </button> 
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-500 to-zinc-500 flex items-center justify-center shadow-lg">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <Title className="text-lg font-bold text-slate-800">
                        Resumen
                      </Title>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Text className="text-slate-600">Subtotal:</Text>
                        <Text className="font-bold text-slate-800">{formatCOP(total)}</Text>
                      </div>
                      
                      {metodoPago === "efectivo" && !esFiado && (
                        <div className="flex justify-between items-center">
                          <Text className="text-slate-600">Pago con:</Text>
                          <Text className="font-bold text-slate-800">{formatCOP(pagoCon)}</Text>
                        </div>
                      )}
                      
                      {metodoPago === "efectivo" && !esFiado && (
                        <div className="flex justify-between items-center">
                          <Text className="text-green-600 font-bold">Cambio:</Text>
                          <Text className="font-bold text-green-500">{formatCOP(Math.max(0, pagoCon - total))}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-500 to-zinc-500 flex items-center justify-center shadow-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <Title className="text-lg font-bold text-slate-800">
                        Ventas del Turno
                      </Title>
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {ventasTurno.length === 0 ? (
                        <Text className="text-center text-slate-500 py-4">Sin ventas en el turno</Text>
                      ) : (
                        ventasTurno.map((venta, index) => (
                          <div key={index} className="p-2 bg-white border border-slate-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <Text className="text-xs text-slate-500">
                                  {new Date(venta.fecha).toLocaleTimeString('es-CO')}
                                </Text>
                                <Text className="font-bold text-sm text-slate-800">
                                  {formatCOP(venta.total)}
                                </Text>
                              </div>
                              <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                                <Text className="text-xs font-bold text-white">Efectivo</Text>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Tab de Inventario */}
          {activeTab === 'inventario' && usuarioLogueado.rol === 'Administrador' && (
            <div className="space-y-8">
              <Card className="border-orange-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center shadow-xl">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <Title className="text-xl font-bold text-orange-800">
                        📦 Gestión de Inventario
                      </Title>
                    </div>
                    <button
                      onClick={() => {
                        setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
                        setIsEditing(false);
                        setIsModalOpen(true);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-xl hover:scale-105 transition-all duration-300 font-bold uppercase"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Nuevo Producto
                      </div>
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="relative flex items-center group">
                      <div className="absolute left-3 text-orange-600">
                        <Search size={20} />
                      </div>
                      <input
                        type="text"
                        value={busquedaInventario}
                        onChange={(e) => setBusquedaInventario(e.target.value)}
                        placeholder="Buscar productos..."
                        className="w-full p-3 pl-10 bg-white border-2 border-orange-300 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 text-gray-900 placeholder-gray-400 transition-all duration-300 hover:bg-orange-50"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow className="bg-gradient-to-r from-slate-100 to-zinc-100">
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700">ID</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700">Código</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700">Nombre</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700 text-right">Stock</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700 text-right">Costo</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700 text-right">Venta</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700 text-right">Ganancia</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700 text-center">Acciones</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productos
                          .filter(p => 
                            p.name.toLowerCase().includes(busquedaInventario.toLowerCase()) ||
                            p.id.toString().includes(busquedaInventario) ||
                            (p.barcode && p.barcode.includes(busquedaInventario))
                          )
                          .slice((paginaActual - 1) * productosPorPagina, paginaActual * productosPorPagina)
                          .map((producto) => (
                            <TableRow key={producto.id} className="hover:bg-slate-50 transition-all duration-200">
                              <TableCell className="text-sm font-medium text-slate-900">{producto.id}</TableCell>
                              <TableCell className="text-sm text-slate-600">{producto.barcode || '-'}</TableCell>
                              <TableCell className="font-medium text-gray-900">{producto.name}</TableCell>
                              <TableCell className={`text-right font-bold ${
                                producto.cant <= 5 ? 'text-red-600' : producto.cant <= 10 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {producto.cant}
                              </TableCell>
                              <TableCell className="text-right">{formatCOP(producto.costo)}</TableCell>
                              <TableCell className="text-right font-bold text-slate-800">{formatCOP(producto.venta)}</TableCell>
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
                                    className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:scale-110 transition-all duration-300 shadow-lg"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {productos.length > productosPorPagina && (
                    <div className="flex justify-between items-center mt-4">
                      <Text className="text-sm text-slate-600">
                        Mostrando {((paginaActual - 1) * productosPorPagina) + 1} - {Math.min(paginaActual * productosPorPagina, productos.length)} de {productos.length} productos
                      </Text>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                          disabled={paginaActual === 1}
                          className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 transition-all duration-200"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setPaginaActual(Math.min(Math.ceil(productos.length / productosPorPagina), paginaActual + 1))}
                          disabled={paginaActual === Math.ceil(productos.length / productosPorPagina)}
                          className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 transition-all duration-200"
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

          {/* Tab de Fiados */}
          {activeTab === 'fiados' && usuarioLogueado.rol === 'Administrador' && (
            <div className="space-y-6">
              {/* Resumen de Fiados */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-xl">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Title className="text-xl font-bold text-slate-800">Fiados</Title>
                        <Text className="text-sm text-slate-600">Total registrados</Text>
                      </div>
                    </div>
                    <Metric className="text-3xl font-bold text-amber-600">
                      {fiados.length}
                    </Metric>
                  </div>
                </Card>
                
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-xl">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Title className="text-xl font-bold text-slate-800">Pendientes</Title>
                        <Text className="text-sm text-slate-600">Por cobrar</Text>
                      </div>
                    </div>
                    <Metric className="text-3xl font-bold text-red-600">
                      {fiadosPendientes.length}
                    </Metric>
                  </div>
                </Card>
                
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-xl">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Title className="text-xl font-bold text-slate-800">Total Fiado</Title>
                        <Text className="text-sm text-slate-600">Valor pendiente</Text>
                      </div>
                    </div>
                    <Metric className="text-3xl font-bold text-green-600">
                      {formatCOP(fiadosPendientes.reduce((sum, f) => sum + f.total_fiado, 0))}
                    </Metric>
                  </div>
                </Card>
              </div>

              {/* Lista de Fiados */}
              <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-xl">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <Title className="text-xl font-bold text-slate-800">
                        📋 Lista de Fiados
                      </Title>
                    </div>
                    <button
                      onClick={cargarFiados}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg"
                    >
                      🔄 Actualizar
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow className="bg-gradient-to-r from-amber-100 to-orange-100">
                          <TableHeaderCell className="font-bold text-sm uppercase text-amber-700">Fecha</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-amber-700">Cliente</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-amber-700">Productos</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-amber-700 text-right">Total</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-amber-700">Estado</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-amber-700">Vendedor</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-amber-700 text-right">Acciones</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fiados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="text-center">
                                <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <Text className="text-slate-600 font-medium">No hay fiados registrados</Text>
                                <Text className="text-sm text-slate-500">Los fiados aparecerán aquí cuando se registren</Text>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          fiados.map((fiado) => {
                            const productos = JSON.parse(fiado.productos);
                            return (
                              <TableRow key={fiado.id} className="hover:bg-slate-50 transition-all duration-200">
                                <TableCell className="text-sm">
                                  {new Date(fiado.fecha_fiado).toLocaleDateString('es-CO')}
                                  <br />
                                  <Text className="text-xs text-slate-500">
                                    {new Date(fiado.fecha_fiado).toLocaleTimeString('es-CO')}
                                  </Text>
                                </TableCell>
                                <TableCell className="font-medium text-gray-900">{fiado.cliente_nombre}</TableCell>
                                <TableCell className="text-sm text-gray-900">
                                  <div className="max-w-xs">
                                    {productos.map((p, idx) => (
                                      <div key={idx} className="text-xs">
                                        {p.nombre} x{p.cantidad}
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-amber-600">{formatCOP(fiado.total_fiado)}</TableCell>
                                <TableCell>
                                  <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                    fiado.estado === 'pendiente' 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {fiado.estado === 'pendiente' ? (
                                      <span className="flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Pendiente
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Realizado
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">{fiado.vendedor || 'Sistema'}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-2 justify-end">
                                    {fiado.estado === 'pendiente' && (
                                      <>
                                        <button
                                          onClick={() => cobrarFiadoHandler(fiado)}
                                          className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 text-xs font-bold"
                                        >
                                          💰 Cobrar
                                        </button>
                                        <button
                                          onClick={() => eliminarFiadoHandler(fiado)}
                                          className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 text-xs font-bold"
                                        >
                                          🗑️ Eliminar
                                        </button>
                                      </>
                                    )}
                                    {fiado.estado === 'realizado' && (
                                      <Text className="text-xs text-green-600 font-medium">
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
                </div>
              </Card>
            </div>
          )}

          {/* Dashboard Mejorado - Vista Día Específico y Período */}
          {activeTab === 'dashboard' && usuarioLogueado.rol === 'Administrador' && (
            <div className="space-y-6">
              {/* Controles Superiores */}
              <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-xl">
                        <LayoutDashboard className="w-6 h-6 text-white" />
                      </div>
                      <Title className="text-xl font-bold text-slate-800">
                        📊 Dashboard de Ventas
                      </Title>
                    </div>
                    
                    <div className="flex gap-4">
                      {vistaDiaEspecifico && (
                        <button
                          onClick={() => {
                            setVistaDiaEspecifico(false);
                            setDiaSeleccionadoCalendario(null);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-slate-500 to-zinc-500 text-white rounded-xl hover:from-slate-600 hover:to-zinc-600 transition-all duration-300 shadow-lg"
                        >
                          ← Volver a Períodos
                        </button>
                      )}
                      <button
                        onClick={() => setCalendarioDesplegado(!calendarioDesplegado)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg"
                      >
                        📅 {calendarioDesplegado ? 'Ocultar' : 'Mostrar'} Calendario
                      </button>
                    </div>
                  </div>
                  
                  {calendarioDesplegado && (
                    <div className="mb-6">
                      <DatePicker
                        value={diaSeleccionadoCalendario}
                        onValueChange={(date) => {
                          setDiaSeleccionadoCalendario(date);
                          setVistaDiaEspecifico(true);
                        }}
                        locale={es}
                        className="w-full"
                      />
                    </div>
                  )}

                  {!vistaDiaEspecifico && (
                    <>
                      {/* Selector de Período */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                        <button
                          onClick={() => setPeriodoDashboard('hoy')}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                            periodoDashboard === 'hoy'
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-xl"
                              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-center">
                            <Title className="text-lg font-bold">Hoy</Title>
                            <Text className="text-sm">Ventas del día</Text>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setPeriodoDashboard('semana')}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                            periodoDashboard === 'semana'
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-xl"
                              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-center">
                            <Title className="text-lg font-bold">Semana</Title>
                            <Text className="text-sm">Últimos 7 días</Text>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setPeriodoDashboard('mes')}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                            periodoDashboard === 'mes'
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-xl"
                              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-center">
                            <Title className="text-lg font-bold">Mes</Title>
                            <Text className="text-sm">Mes actual</Text>
                          </div>
                        </button>
                      </div>
                      
                      {/* Filtro de Vendedor */}
                      <div className="mb-6">
                        <Text className="text-sm font-bold text-amber-700 uppercase tracking-wider ml-2 mb-3">👤 Filtrar por Vendedor</Text>
                        <div className="flex gap-4">
                          <select
                            value={filtroVendedorDashboard}
                            onChange={(e) => setFiltroVendedorDashboard(e.target.value)}
                            className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-500 text-gray-900 transition-all duration-300 hover:bg-slate-50"
                          >
                            {vendedoresUnicos.map(vendedor => (
                              <option key={vendedor} value={vendedor}>{vendedor}</option>
                            ))}
                          </select>
                          <div className="px-4 py-3 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl border border-amber-200">
                            <Text className="text-sm font-bold text-amber-700">
                              {filtroVendedorDashboard === 'Todos' ? 'Todos' : filtroVendedorDashboard}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <Text className="text-sm font-bold text-amber-700">
                        📅 {vistaDiaEspecifico ? 'Día seleccionado' : 'Período'}: {vistaDiaEspecifico ? datosDiaEspecifico?.fecha : datosDashboard.titulo}
                      </Text>
                      <Text className="text-sm text-amber-600">
                        {!vistaDiaEspecifico && datosDashboard.periodo}
                      </Text>
                    </div>
                    {filtroVendedorDashboard !== 'Todos' && (
                      <div className="mt-2">
                        <Text className="text-xs font-bold text-amber-600">
                          👤 Vendedor: {filtroVendedorDashboard}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Métricas Principales */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center shadow-xl">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Text className="text-sm text-indigo-700 uppercase tracking-wider font-bold">Ganancias</Text>
                      </div>
                    </div>
                    <Metric className="text-3xl font-bold text-indigo-600">
                      {formatCOP(vistaDiaEspecifico ? datosDiaEspecifico?.ganancias : datosDashboard.ganancias)}
                    </Metric>
                    <Text className="text-sm text-gray-500 mt-2">
                      {(vistaDiaEspecifico ? datosDiaEspecifico?.cantidadVentas : datosDashboard.cantidadVentas) > 0 
                        ? `${(vistaDiaEspecifico ? datosDiaEspecifico?.cantidadVentas : datosDashboard.cantidadVentas)} ventas` 
                        : 'Sin ventas'}
                    </Text>
                  </div>
                </Card>
                
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-xl">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Text className="text-sm text-green-700 uppercase tracking-wider font-bold">Ventas</Text>
                      </div>
                    </div>
                    <Metric className="text-3xl font-bold text-green-600">
                      {formatCOP(vistaDiaEspecifico ? datosDiaEspecifico?.totalVentas : datosDashboard.totalVentas)}
                    </Metric>
                    <Text className="text-sm text-gray-500 mt-2">Total facturado</Text>
                  </div>
                </Card>
                
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Text className="text-sm text-blue-700 uppercase tracking-wider font-bold">Productos</Text>
                      </div>
                    </div>
                    <Metric className="text-3xl font-bold text-blue-600">
                      {(vistaDiaEspecifico ? datosDiaEspecifico?.ventasPorProducto : datosDashboard.ventasPorProducto).length}
                    </Metric>
                    <Text className="text-sm text-gray-500 mt-2">Diferentes vendidos</Text>
                  </div>
                </Card>
                
                <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-xl">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Text className="text-sm text-purple-700 uppercase tracking-wider font-bold">Vendedores</Text>
                      </div>
                    </div>
                    <Metric className="text-3xl font-bold text-purple-600">
                      {(vistaDiaEspecifico ? datosDiaEspecifico?.ventasPorVendedor : datosDashboard.ventasPorVendedor).length}
                    </Metric>
                    <Text className="text-sm text-gray-500 mt-2">Participantes</Text>
                  </div>
                </Card>
              </div>

              {/* Lista Detallada de Ventas */}
              <Card className="border-slate-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-slate-50 to-zinc-50">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-slate-500 to-zinc-500 flex items-center justify-center shadow-xl">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      <Title className="text-xl font-bold text-slate-800">
                        📋 Detalle de Ventas
                      </Title>
                    </div>
                    <Text className="text-sm text-indigo-600">
                      {(vistaDiaEspecifico ? datosDiaEspecifico?.ventasDetalladas : datosDashboard.ventasDetalladas).length} ventas encontradas
                    </Text>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow className="bg-gradient-to-r from-slate-100 to-zinc-100">
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700">Fecha</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700">Producto</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700 text-right">Precio Venta</TableHeaderCell>
                          <TableHeaderCell className="font-bold text-sm uppercase text-slate-700 text-right">Ganancia</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(vistaDiaEspecifico ? datosDiaEspecifico?.ventasDetalladas : datosDashboard.ventasDetalladas)?.slice(0, 50).map((venta, index) => {
                          const producto = productos.find(p => p.id === venta.producto_id);
                          const ganancia = producto ? (venta.precio_venta || 0) - producto.costo : 0;
                          
                          return (
                            <TableRow key={index} className="hover:bg-indigo-50 transition-all duration-200">
                              <TableCell className="text-sm">
                                {new Date(venta.fecha).toLocaleDateString('es-CO')}
                                <br />
                                <Text className="text-xs text-gray-500">
                                  {new Date(venta.fecha).toLocaleTimeString('es-CO')}
                                </Text>
                              </TableCell>
                              <TableCell className="text-sm text-gray-900">{producto?.name || 'N/A'}</TableCell>
                              <TableCell className="text-right font-bold text-green-600">{formatCOP(venta.precio_venta || 0)}</TableCell>
                              <TableCell className="text-right font-bold text-indigo-600">{formatCOP(ganancia)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {(vistaDiaEspecifico ? datosDiaEspecifico?.ventasDetalladas : datosDashboard.ventasDetalladas)?.length > 50 && (
                    <div className="mt-4 text-center">
                      <Text className="text-sm text-gray-500">
                        Mostrando las primeras 50 ventas de {(vistaDiaEspecifico ? datosDiaEspecifico?.ventasDetalladas : datosDashboard.ventasDetalladas).length} totales
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-10 bg-white rounded-3xl shadow-3xl border-2 border-orange-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center shadow-xl">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <Title className="text-2xl font-bold text-orange-800">
                  {isEditing ? 'Editar' : 'Nuevo'}
                </Title>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditing(false);
                  setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
                }}
                className="p-3 text-gray-400 hover:text-red-500 transition-all duration-300 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const nameTrim = (formData.name || '').trim();
              if (!nameTrim) {
                Swal.fire({ title: 'Nombre requerido', text: 'El nombre del producto es obligatorio', icon: 'warning' });
                return;
              }
              if (!isEditing) {
                const existing = productos.find(p => p.id === formData.id);
                if (existing) {
                  Swal.fire({ title: 'ID duplicado', text: 'Ya existe un producto con este ID', icon: 'warning' });
                  return;
                }
              }
              const nameDup = productos.find(p => p.name === nameTrim && (!isEditing || p.id !== formData.id));
              if (nameDup) { 
                Swal.fire({ title: 'Nombre duplicado', text: 'Ya existe un producto con este nombre', icon: 'warning' }); 
                return; 
              }

              const cant = Number(formData.cant) || 0;
              const costo = Number(formData.costo) || 0;
              const venta = Number(formData.venta) || 0;
              if (cant < 0 || costo < 0 || venta < 0) { 
                Swal.fire({ title: 'Valores inválidos', text: 'Stock y precios no pueden ser negativos', icon: 'warning' }); 
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

              const payload = { ...formData, name: nameTrim, cant, costo, venta, barcode: (formData.barcode || '').trim() };
              
              try {
                const res = await fetch(isEditing ? `${API_URL}/inventory/update/${payload.id}` : `${API_URL}/inventory/create`, {
                  method: isEditing ? 'PUT' : 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                
                if (res.ok) {
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
                } else {
                  const err = await res.json();
                  Swal.fire({ title: 'Error', text: err.detail, icon: 'error' });
                }
              } catch (error) {
                console.error('Error:', error);
                Swal.fire({ title: 'Error', text: 'Error de conexión', 'icon': 'error' });
              }
            }} className="space-y-6">
              <div>
                <Text className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-2 mb-3">ID</Text>
                <input
                  disabled={isEditing}
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  className="w-full p-4 bg-white border-2 border-orange-300 rounded-2xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 hover:bg-orange-50"
                  required
                />
              </div>
              
              <div>
                <Text className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-2 mb-3">🐕 Código</Text>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-orange-600">
                    <Barcode size={20} />
                  </div>
                  <input
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-4 pl-12 bg-white border-2 border-orange-300 rounded-2xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 hover:bg-orange-50"
                    placeholder="Código de barras (opcional)"
                  />
                </div>
              </div>
              
              <div>
                <Text className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-2 mb-3">📦 Nombre</Text>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-4 bg-white border-2 border-orange-300 rounded-2xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-300 hover:bg-orange-50"
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Text className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-2 mb-3">📊 Stock</Text>
                  <input
                    type="number"
                    value={formData.cant}
                    onChange={e => setFormData({ ...formData, cant: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 bg-white border-2 border-orange-300 rounded-xl text-center font-medium"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <Text className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-2 mb-3">💰 Costo</Text>
                  <input
                    type="number"
                    value={formData.costo}
                    onChange={e => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 bg-white border-2 border-orange-300 rounded-xl text-center font-medium"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <Text className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-2 mb-3">🏷️ Venta</Text>
                  <input
                    type="number"
                    value={formData.venta}
                    onChange={e => setFormData({ ...formData, venta: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-2 border-orange-500 rounded-xl text-center font-medium"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-2xl font-bold uppercase shadow-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center justify-center gap-3 text-lg">
                  <Zap className="w-6 h-6" />
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </div>
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;
