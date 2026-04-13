import React, { useState, useEffect, useRef, useCallback } from 'react';
import Login from './Login';
import { Card, Metric, Text, Title, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Button, Grid, TabGroup, TabList, Tab, BarChart, DonutChart, Flex, DatePicker } from "@tremor/react";
import { es } from 'date-fns/locale';
import { Barcode, TrendingUp, X, Save, Plus, Edit3, Trash2, Search, Menu, LogOut, Package, LayoutDashboard, CheckCircle, ShoppingCart, ScanLine, ChevronRight, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const API_URL = 'http://localhost:8000';

const App = () => {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [pagoCon, setPagoCon] = useState(0);
  const [busquedaUniversal, setBusquedaUniversal] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [periodo, setPeriodo] = useState(0);
  const [fechaManual, setFechaManual] = useState(new Date());
  const [filtroVendedor, setFiltroVendedor] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' });
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [ventasTurno, setVentasTurno] = useState([]);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [busquedaInventario, setBusquedaInventario] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vistaInventario, setVistaInventario] = useState('tabla');
  const [pendientesCount, setPendientesCount] = useState(0);
  const [paginaVentasDetalle, setPaginaVentasDetalle] = useState(1);
  const itemsPorPaginaVentasDetalle = 10;
  const [paginaGanancias, setPaginaGanancias] = useState(1);
  const itemsPorPaginaGanancias = 8;

  // Estados para ventas especiales
  const [showVentaEspecialModal, setShowVentaEspecialModal] = useState(false);
  const [ventaEspecialData, setVentaEspecialData] = useState({
    producto: null,
    cliente: '',
    precioEspecial: 0,
    esFiado: false,
    cantidad: 1
  });

  const inputRef = useRef(null);

  // --- CARGA DE DATOS ---
  const cargarDatos = async () => {
    console.log('Cargando datos...');
    try {
      const [resP, resV] = await Promise.all([
        fetch(`${API_URL}/productos`),
        fetch(`${API_URL}/historial-ventas`)
      ]);
      const dataP = await resP.json();
      const dataV = await resV.json();
      console.log('Datos ventas recibidos:', dataV);
      console.log('Cantidad de ventas:', dataV.length);
      setProductos(Array.isArray(dataP) ? dataP : []);
      setVentas(Array.isArray(dataV) ? dataV : []);
    } catch (e) { console.error("Error conexión Backend", e); }
  };

  useEffect(() => {
    const t = setTimeout(() => { cargarDatos(); }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      const t = setTimeout(() => {
        const arr = JSON.parse(localStorage.getItem('ventas_pendientes') || '[]');
        setPendientesCount(arr.length);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  // Si no es administrador, fuerza siempre la pestaña de ventas
  useEffect(() => {
    if (usuarioLogueado && usuarioLogueado.rol !== "Administrador" && activeTab !== 'ventas') {
      const t = setTimeout(() => setActiveTab('ventas'), 0);
      return () => clearTimeout(t);
    }
  }, [usuarioLogueado, activeTab]);

  // Re-enfocar el input automáticamente al cambiar de pestaña o mover el carrito
  useEffect(() => {
    if (activeTab === 'ventas') {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, carrito]);

  // Si no hay usuario logueado, mostrar login
  if (!usuarioLogueado) {
    return <Login onLogin={setUsuarioLogueado} />;
  }

  const formatCOP = (v) => `$ ${Intl.NumberFormat("es-CO").format(v)}`;

  // --- FUNCIÓN PARA VENTAS ESPECIALES ---
  const abrirVentaEspecialModal = (producto) => {
    setVentaEspecialData({
      producto,
      cliente: '',
      precioEspecial: producto.venta,
      esFiado: false,
      cantidad: 1
    });
    setShowVentaEspecialModal(true);
  };

  const registrarVentaEspecial = () => {
    const { producto, cliente, precioEspecial, esFiado, cantidad } = ventaEspecialData;
    
    if (!producto || !cliente || cantidad <= 0 || precioEspecial <= 0) {
      Swal.fire('Datos incompletos', 'Por favor completa todos los campos', 'warning');
      return;
    }

    if (cantidad > producto.cant) {
      Swal.fire('Stock insuficiente', `Solo hay ${producto.cant} unidades disponibles`, 'warning');
      return;
    }

    // Calcular ganancia
    const gananciaReal = esFiado ? 0 : ((precioEspecial - producto.costo) * cantidad);
    
    Swal.fire({
      title: 'Venta especial registrada',
      text: esFiado 
        ? `Fiado registrado para ${cliente} por ${formatCOP(precioEspecial * cantidad)}`
        : `Venta especial de ${producto.name} por ${formatCOP(precioEspecial * cantidad)}`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });

    setShowVentaEspecialModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/40 to-rose-50 flex font-sans selection:bg-amber-200/60 selection:text-slate-900 relative">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`w-64 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:sticky lg:top-0 fixed lg:relative z-50 bg-white/95 backdrop-blur-xl border-r border-amber-100/70 p-4 space-y-2 top-0 h-screen shadow-2xl shadow-amber-200/40 transition-transform duration-300 ease-in-out`}>
        <div className="mb-6 px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-200 via-orange-200 to-rose-200 flex items-center justify-center shadow-inner">
                <span className="text-lg font-black text-amber-700">G</span>
              </div>
              <div>
                <Title className="font-black text-lg italic tracking-tighter text-slate-800">GABY POS</Title>
                <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Sistema de Ventas</Text>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden ml-auto p-2 rounded-lg hover:bg-slate-100 shrink-0"
            >
              <Menu size={18} className="text-slate-600" />
            </button>
          </div>
        </div>
        
        <nav className="space-y-1">
          <button
            onClick={() => {
              setActiveTab('ventas');
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'ventas' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            title="Ventas Pistola"
          >
            <ShoppingCart className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
            {!sidebarCollapsed && 'Ventas Pistola'}
          </button>

          <button
            onClick={() => {
              setActiveTab('ventas-especiales');
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'ventas-especiales' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <TrendingUp className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
            {!sidebarCollapsed && 'Ventas Especiales'}
          </button>

          {/* RESTRICCIÓN: Solo Admin ve Bodega y Dashboard */}
          {usuarioLogueado.rol === "Administrador" && (
            <>
              <button
                onClick={() => {
                  setActiveTab('inventario');
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'inventario' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Package className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
                {!sidebarCollapsed && 'Bodega / Inventario'}
              </button>
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'dashboard' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <LayoutDashboard className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
                {!sidebarCollapsed && 'Dashboard'}
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-xl border-b border-amber-100/70 p-4 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-200 via-orange-200 to-rose-200 flex items-center justify-center shadow-inner">
                <span className="text-xl font-black text-amber-700">G</span>
              </div>
              <div>
                <Title className="font-black text-xl italic tracking-tighter text-slate-800">GABY POS</Title>
                <Text className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sistema de Ventas</Text>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <Text className="text-xs font-bold text-slate-600">{usuarioLogueado.nombre}</Text>
                <Text className="text-[10px] text-slate-400 uppercase">{usuarioLogueado.rol}</Text>
              </div>
              <button
                onClick={() => setUsuarioLogueado(null)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <LogOut size={18} className="text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Buscador universal */}
        {(activeTab === 'ventas' || activeTab === 'inventario') && (
          <div className="mb-6">
            <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-xl shadow-amber-200/40 border border-amber-100 flex items-center gap-4">
              <Search className="text-slate-300 ml-2" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, ID o código de barras... 🐾"
                className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 uppercase text-sm"
              />
            </div>
          </div>
        )}

        {/* Contenido por pestaña */}
        <div className="p-6">
          {activeTab === 'ventas' && (
            <div className="space-y-6">
              <Text className="text-2xl font-black text-slate-800">Ventas</Text>
              <Text className="text-slate-600">Sistema de ventas con pistola de códigos de barras</Text>
            </div>
          )}

          {activeTab === 'inventario' && (
            <div className="space-y-6">
              <Text className="text-2xl font-black text-slate-800">Inventario</Text>
              <Text className="text-slate-600">Gestión de productos y stock</Text>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <Text className="text-2xl font-black text-slate-800">Dashboard</Text>
              <Text className="text-slate-600">Análisis y reportes</Text>
            </div>
          )}

          {/* --- VENTAS ESPECIALES --- */}
          {activeTab === 'ventas-especiales' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-2xl font-black text-slate-800">Ventas Especiales</Text>
                  <Text className="text-slate-600">Ventas con precios especiales y fiados</Text>
                </div>
                <Button
                  onClick={() => setShowVentaEspecialModal(true)}
                  className="rounded-xl font-black uppercase"
                  color="orange"
                >
                  Nueva Venta Especial
                </Button>
              </div>

              <Card className="p-6 rounded-2xl shadow-sm bg-white border border-slate-200">
                <Title className="mb-4">Selecciona un producto para venta especial</Title>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {productos.slice(0, 8).map(p => (
                    <Card key={p.id} className="p-4 border border-slate-200 hover:border-orange-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Text className="text-xs font-black text-slate-600">ID: {p.id}</Text>
                        <Badge color={p.cant <= 5 ? 'red' : 'emerald'} className="text-xs">
                          {p.cant} unid.
                        </Badge>
                      </div>
                      <Title className="text-sm font-black text-slate-800 mb-2">{p.name}</Title>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <Text className="text-slate-500">Costo:</Text>
                          <Text className="font-bold">{formatCOP(p.costo)}</Text>
                        </div>
                        <div className="flex justify-between">
                          <Text className="text-slate-500">Venta:</Text>
                          <Text className="font-bold text-orange-600">{formatCOP(p.venta)}</Text>
                        </div>
                      </div>
                      <button
                        onClick={() => abrirVentaEspecialModal(p)}
                        className="w-full mt-3 bg-orange-600 text-white py-2 rounded-lg font-black text-xs hover:bg-orange-700 transition-colors"
                      >
                        Vender Especial
                      </button>
                    </Card>
                  ))}
                </div>
              </Card>

              {/* Modal para venta especial */}
              {showVentaEspecialModal && ventaEspecialData.producto && (
                <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
                  <Card className="max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl">
                    <button
                      onClick={() => setShowVentaEspecialModal(false)}
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100"
                    >
                      <X size={18} />
                    </button>
                    
                    <Title className="mb-6 text-center">Venta Especial</Title>
                    
                    <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <Text className="font-black text-sm">{ventaEspecialData.producto.name}</Text>
                      <Text className="text-xs text-slate-600">Stock: {ventaEspecialData.producto.cant} unidades</Text>
                      <div className="flex justify-between mt-2">
                        <Text className="text-xs">Costo: {formatCOP(ventaEspecialData.producto.costo)}</Text>
                        <Text className="text-xs">Venta normal: {formatCOP(ventaEspecialData.producto.venta)}</Text>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Text className="text-xs font-black text-slate-600 mb-2">Cliente</Text>
                        <input
                          type="text"
                          value={ventaEspecialData.cliente}
                          onChange={(e) => setVentaEspecialData({...ventaEspecialData, cliente: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-xl font-bold"
                          placeholder="Nombre del cliente"
                        />
                      </div>

                      <div>
                        <Text className="text-xs font-black text-slate-600 mb-2">Cantidad</Text>
                        <input
                          type="number"
                          min="1"
                          max={ventaEspecialData.producto?.cant || 1}
                          value={ventaEspecialData.cantidad}
                          onChange={(e) => setVentaEspecialData({...ventaEspecialData, cantidad: parseInt(e.target.value) || 1})}
                          className="w-full p-3 border border-slate-300 rounded-xl font-bold text-center"
                        />
                      </div>

                      <div>
                        <Text className="text-xs font-black text-slate-600 mb-2">Precio Unitario</Text>
                        <input
                          type="number"
                          min="0"
                          value={ventaEspecialData.precioEspecial}
                          onChange={(e) => setVentaEspecialData({...ventaEspecialData, precioEspecial: parseFloat(e.target.value) || 0})}
                          className="w-full p-3 border border-slate-300 rounded-xl font-bold text-center"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="esFiado"
                          checked={ventaEspecialData.esFiado}
                          onChange={(e) => setVentaEspecialData({...ventaEspecialData, esFiado: e.target.checked})}
                          className="w-4 h-4 text-orange-600"
                        />
                        <label htmlFor="esFiado" className="text-sm font-bold">
                          Es fiado (ganancia = $0)
                        </label>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex justify-between mb-2">
                          <Text className="text-sm font-bold">Total:</Text>
                          <Text className="text-lg font-black">
                            {formatCOP(ventaEspecialData.precioEspecial * ventaEspecialData.cantidad)}
                          </Text>
                        </div>
                        <div className="flex justify-between">
                          <Text className="text-xs">Ganancia:</Text>
                          <Text className={`font-bold ${ventaEspecialData.esFiado ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {ventaEspecialData.esFiado 
                              ? '$0 (fiado)' 
                              : formatCOP((ventaEspecialData.precioEspecial - ventaEspecialData.producto.costo) * ventaEspecialData.cantidad)
                            }
                          </Text>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowVentaEspecialModal(false)}
                        className="flex-1 py-3 border border-slate-300 rounded-xl font-bold hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={registrarVentaEspecial}
                        className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700"
                      >
                        Registrar Venta
                      </button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
