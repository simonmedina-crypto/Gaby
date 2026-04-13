import React, { useState, useEffect, useRef, useCallback } from 'react';
import Login from './Login';
import { Card, Metric, Text, Title, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Button, Grid, TabGroup, TabList, Tab, BarChart, DonutChart, Flex, DatePicker } from "@tremor/react";
import { es } from 'date-fns/locale';
import { Barcode, TrendingUp, X, Save, Plus, Edit3, Trash2, Search, Menu, LogOut, Package, LayoutDashboard, CheckCircle, ShoppingCart, ScanLine, ChevronRight, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const API_URL = 'http://localhost:8000';

// Custom hooks
const useDatos = () => {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  
  const cargarDatos = useCallback(async () => {
    try {
      const [resP, resV] = await Promise.all([
        fetch(`${API_URL}/productos`),
        fetch(`${API_URL}/historial-ventas`)
      ]);
      const dataP = await resP.json();
      const dataV = await resV.json();
      setProductos(Array.isArray(dataP) ? dataP : []);
      setVentas(Array.isArray(dataV) ? dataV : []);
    } catch (e) { console.error("Error conexión Backend", e); }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return { productos, ventas, cargarDatos };
};

const useCarrito = () => {
  const [carrito, setCarrito] = useState([]);
  
  const agregarAlCarrito = useCallback((prod, qty = 1) => {
    if (!prod || qty <= 0) return false;
    
    const existente = carrito.find(item => item.id === prod.id);
    if (existente) {
      if (existente.cantidad + qty > prod.cant) return false;
      setCarrito(carrito.map(item => 
        item.id === prod.id 
          ? { ...item, cantidad: item.cantidad + qty }
          : item
      ));
    } else {
      setCarrito([...carrito, { ...prod, cantidad: qty }]);
    }
    return true;
  }, [carrito]);

  const eliminarDelCarrito = useCallback((id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  }, [carrito]);

  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
  }, []);

  const total = carrito.reduce((sum, item) => sum + (item.venta * item.cantidad), 0);
  
  return { carrito, agregarAlCarrito, eliminarDelCarrito, vaciarCarrito, total };
};

// Componentes
const Header = ({ usuarioLogueado, onLogout }) => (
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
          onClick={onLogout}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut size={18} className="text-slate-600" />
        </button>
      </div>
    </div>
  </div>
);

const Sidebar = ({ activeTab, setActiveTab, usuarioLogueado, onLogout, sidebarOpen, setSidebarOpen }) => (
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
        className={`w-full flex items-center p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'ventas' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        <ShoppingCart className="mr-3" size={18} />
        Ventas Pistola
      </button>

      {usuarioLogueado.rol === "Administrador" && (
        <>
          <button
            onClick={() => {
              setActiveTab('inventario');
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`w-full flex items-center p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'inventario' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Package className="mr-3" size={18} />
            Bodega / Inventario
          </button>
          <button
            onClick={() => {
              setActiveTab('dashboard');
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`w-full flex items-center p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'dashboard' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="mr-3" size={18} />
            Dashboard
          </button>
        </>
      )}
    </nav>
  </aside>
);

// Utilidades
const formatCOP = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(num);

const App = () => {
  // Estados principales
  const [activeTab, setActiveTab] = useState('ventas');
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Hooks personalizados
  const { productos, ventas, cargarDatos } = useDatos();
  const { carrito, agregarAlCarrito, eliminarDelCarrito, vaciarCarrito, total } = useCarrito();
  
  // Estados de ventas
  const [barcode, setBarcode] = useState("");
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [pagoCon, setPagoCon] = useState(0);
  const inputRef = useRef(null);

  // Si no hay usuario logueado, mostrar login
  if (!usuarioLogueado) {
    return <Login onLogin={setUsuarioLogueado} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/40 to-rose-50 flex font-sans">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usuarioLogueado={usuarioLogueado}
        onLogout={() => setUsuarioLogueado(null)}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Contenido principal */}
      <main className="flex-1 p-6 overflow-auto">
        <Header usuarioLogueado={usuarioLogueado} onLogout={() => setUsuarioLogueado(null)} />
        
        {/* Buscador universal */}
        {(activeTab === 'ventas' || activeTab === 'inventario') && (
          <div className="mb-6">
            <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-xl shadow-amber-200/40 border border-amber-100 flex items-center gap-4">
              <Search className="text-slate-300" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, ID o código de barras..."
                className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 uppercase text-sm"
              />
            </div>
          </div>
        )}

        {/* Contenido por pestaña */}
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
      </main>
    </div>
  );
};

export default App;
