import React, { useState, useEffect, useRef, useCallback } from 'react';
import Login from './Login'; // Importamos el nuevo archivo

import {
  Card, Metric, Text, Title, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell,
  Button, Grid, TabGroup, TabList, Tab, BarChart, DonutChart, Flex, DatePicker
} from "@tremor/react";
import { es } from 'date-fns/locale';
import {
  Barcode, TrendingUp, X, Save, Plus, Edit3, Trash2, Search, Menu,
  LogOut, Package, LayoutDashboard, CheckCircle, ShoppingCart, ScanLine, ChevronRight, RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';

const API_URL = 'http://localhost:8000';

const App = () => {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('ventas');
  // Eliminado menú superior redundante
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
  const itemsPorPagina = 10
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

  // --- LÓGICA DE ESCANEO Y VENTA ---
  const manejarPistola = (e) => {
    if (e) e.preventDefault(); // Detener recarga de página al dar ENTER

    const codigoLimpio = barcode.trim();
    if (!codigoLimpio) return;

    const qty = Number(cantidadVenta) || 0;
    if (qty <= 0) {
      Swal.fire({
        title: 'Cantidad inválida',
        text: 'La cantidad debe ser mayor que cero',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      setCantidadVenta(1);
      return;
    }

    // Buscar el producto en la lista local por ID o por Código de Barras
    const prod = productos.find(p =>
      String(p.id) === codigoLimpio ||
      (p.barcode && String(p.barcode) === codigoLimpio)
    );

    if (!prod) {
      Swal.fire({
        title: '¡No registrado!',
        text: `El código ${codigoLimpio} no existe en bodega`,
        icon: 'error',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
      // No borrar el código, solo enfocar
      inputRef.current?.focus();
      return;
    }

    // Validar stock disponible
    if (qty > prod.cant) {
      Swal.fire({
        title: '¡STOCK INSUFICIENTE!',
        text: `Solo hay ${prod.cant} unidades disponibles de ${prod.name}`,
        icon: 'warning',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
      // No borrar el código, solo enfocar para que el usuario ajuste
      inputRef.current?.focus();
      return;
    }

    // Si no existe, agregamos al carrito
    const ok = agregarAlCarrito(prod, qty);
    if (ok) {
      // Sonido de confirmación más robusto
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Fallback: sonido simple
          new Audio('https://assets.mixkit.co/active_storage/sfx/2632/2632-preview.mp3').play();
        });
      } catch (err) { 
        console.warn('Error reproduciendo sonido:', err); 
      }
    }

    // Solo limpiar cantidad, mantener el código para siguiente escaneo
    setCantidadVenta(1);
    setSugerencias([]);
    setBusquedaUniversal("");
    inputRef.current?.focus();
  };

  const manejarBusquedaUniversal = (texto) => {
    setBusquedaUniversal(texto);
    // Siempre actualizar búsqueda de inventario
    setBusquedaInventario(texto);
    
    if (texto.trim() === "") { 
      setSugerencias([]); 
      return; 
    }
    const filtrados = productos.filter(p =>
      p.name.toLowerCase().includes(texto.toLowerCase()) ||
      String(p.id).includes(texto) ||
      (p.barcode && String(p.barcode).includes(texto))
    );
    setSugerencias(filtrados);
  };

  const agregarAlCarrito = useCallback((prod, qty = 1) => {
    if (!prod || qty <= 0) return false;
    const cantidadEnCarrito = carrito
      .filter(item => item.id === prod.id)
      .reduce((acc, item) => acc + item.cantidad, 0);
    if (cantidadEnCarrito + qty > prod.cant) {
      Swal.fire({
        title: 'STOCK INSUFICIENTE',
        text: `Solo quedan ${prod.cant} unidades de ${prod.name}`,
        icon: 'warning',
        confirmButtonText: 'OK',
        allowOutsideClick: false
      });
      return false;
    }
    const existeEnCarrito = carrito.find(item => item.id === prod.id);
    if (existeEnCarrito) {
      setCarrito(carrito.map(item =>
        item.id === prod.id
          ? { ...item, cantidad: item.cantidad + qty, subtotal: (item.cantidad + qty) * item.venta }
          : item
      ));
    } else {
      const nuevoItem = { ...prod, cantidad: qty, subtotal: prod.venta * qty };
      setCarrito([...carrito, nuevoItem]);
    }
    return true;
  }, [carrito]);

  const getVentasEndpoints = () => {
    const prefijo = (localStorage.getItem('ventas_endpoint') || '').trim();
    const preferido = prefijo ? `${API_URL}${prefijo.startsWith('/') ? '' : '/'}${prefijo}` : null;
    const base = [
      `${API_URL}/facturar`,
      `${API_URL}/ventas`,
      `${API_URL}/venta`,
      `${API_URL}/ventas/create`,
      `${API_URL}/registrar-venta`,
      `${API_URL}/historial-ventas`
    ];
    return preferido ? [preferido, ...base] : base;
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      Swal.fire('Carrito vacío', 'Agrega al menos un producto antes de cobrar', 'info');
      return;
    }

    if (Number(pagoCon) < total) {
      Swal.fire('Pago insuficiente', 'El valor recibido es menor al total a pagar', 'warning');
      return;
    }

    // Payload compatible con FastAPI /facturar
    const facturaPayload = {
      items: carrito.map(i => ({ id: String(i.id), cantidad: Number(i.cantidad) || 1 })),
      vendedor: usuarioLogueado?.nombre || 'Sistema'
    };

    try {
      // Intento progresivo en distintos endpoints (preferido + comunes)
      const posiblesEndpoints = getVentasEndpoints();

      let response = null;
      for (const url of posiblesEndpoints) {
        const intento = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            url.endsWith('/facturar') ? facturaPayload : {
              // Compatibilidad con los otros endpoints genéricos
              items: carrito,
              total: total,
              fecha: new Date().toLocaleString(),
              vendedor: usuarioLogueado.nombre,
              rol: usuarioLogueado.rol,
              metodo: "Efectivo"
            }
          )
        });
        if (intento.ok) { response = intento; break; }
        if (intento.status !== 404) { // Si no es 404, no seguimos probando
          response = intento;
          break;
        }
      }

      if (response && response.ok) {
        // 2. Guardar en el log local para el cierre de caja rápido
        setVentasTurno([...ventasTurno, {
          items: carrito,
          total: total,
          fecha: new Date().toLocaleString(),
          vendedor: usuarioLogueado.nombre,
          rol: usuarioLogueado.rol,
          metodo: "Efectivo"
        }]);

        setCarrito([]);
        setBarcode("");
        setPagoCon(0);
        setPaginaVentasDetalle(1); // Reiniciar a primera página
        Swal.fire({
          title: 'Venta Exitosa',
          text: `Registrada por ${usuarioLogueado.nombre}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        cargarDatos(); // Recarga stock e historial
        // Refresco adicional para asegurar actualización
        setTimeout(() => cargarDatos(), 500);
      } else {
        // Si todos dieron 404 o 405 (método no permitido), registramos offline
        if (response && (response.status === 404 || response.status === 405)) {
          const pendientes = JSON.parse(localStorage.getItem('ventas_pendientes') || '[]');
          pendientes.push({ ...facturaPayload, offline: true });
          localStorage.setItem('ventas_pendientes', JSON.stringify(pendientes));
          setPendientesCount(pendientes.length);
          setVentasTurno([...ventasTurno, { items: carrito, total, fecha: new Date().toLocaleString() }]);
          setCarrito([]);
          setBarcode("");
          setPagoCon(0);
          Swal.fire({
            title: 'Venta Guardada Offline',
            text: 'El servidor no respondió; se registró temporalmente y puedes sincronizar luego.',
            icon: 'warning'
          });
        } else {
          let msg = '';
          try {
            msg = await response?.text();
          } catch (err) { console.warn(err); }
          // Mensaje más claro si viene del FastAPI de stock insuficiente
          const detalle = (() => {
            try { const js = JSON.parse(msg); return js.detail || msg; } catch { return msg; }
          })();
          Swal.fire('No se pudo confirmar', detalle || `Servidor respondió ${response.status}`, 'error');
        }
      }
    } catch (_error) {
      console.error(_error);
      Swal.fire('Error', 'No se pudo registrar la venta', 'error');
    }
  };

  const sincronizarVentasPendientes = async () => {
    const pendientes = JSON.parse(localStorage.getItem('ventas_pendientes') || '[]');
    if (pendientes.length === 0) {
      Swal.fire({ title: 'Sin pendientes', text: 'No hay ventas para sincronizar', icon: 'info' });
      return;
    }
    let enviadas = 0;
    const restantes = [];
    for (const v of pendientes) {
      let ok = false;
      for (const url of getVentasEndpoints()) {
        try {
          const body = url.endsWith('/facturar') ? v : {
            items: v.items,
            total: v.items?.reduce((a, it) => a + (Number(it.cantidad) || 0), 0),
            fecha: new Date().toLocaleString(),
          };
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (r.ok) { ok = true; break; }
          if (r.status !== 404 && r.status !== 405) { break; }
        } catch (e) {
          console.warn(e);
          break;
        }
      }
      if (ok) enviadas++; else restantes.push(v);
    }
    localStorage.setItem('ventas_pendientes', JSON.stringify(restantes));
    setPendientesCount(restantes.length);
    Swal.fire({
      title: 'Sincronización completada',
      text: `Enviadas: ${enviadas} | Pendientes: ${restantes.length}`,
      icon: enviadas > 0 ? 'success' : 'warning'
    });
  };

  const finalizarCobro = () => finalizarVenta();

  const total = carrito.reduce((a, b) => a + b.subtotal, 0);
  const formatCOP = (v) => `$ ${Intl.NumberFormat("es-CO").format(v)}`;

  const codigoLimpioActual = barcode.trim();
  const productoActual = productos.find(p =>
    String(p.id) === codigoLimpioActual ||
    (p.barcode && String(p.barcode) === codigoLimpioActual)
  );

  const datosFiltradosVentas = (ventas || []).filter(v => {
    // Si por alguna razón la fecha en el calendario es nula, mostramos todo o evitamos el error
    if (!fechaManual) return true;
    console.log('Filtrando venta:', v.nombre_producto, 'fecha:', v.fecha);
    const f = new Date(v.fecha);

    // Filtro por periodo
    let coincidePeriodo = true;
    if (periodo === 0) {
      // Filtro por día: verificamos que f y fechaManual sean válidos antes de comparar
      coincidePeriodo = f.toDateString() === fechaManual.toDateString();
    } else if (periodo === 1) {
      // Semana: desde lunes a domingo de la semana de fechaManual
      const fm = new Date(fechaManual);
      const day = (fm.getDay() + 6) % 7; // 0 = lunes
      const start = new Date(fm); start.setDate(fm.getDate() - day); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      coincidePeriodo = f >= start && f <= end;
    } else {
      // Filtro por mes
      coincidePeriodo = f.getMonth() === fechaManual.getMonth() && f.getFullYear() === fechaManual.getFullYear();
    }
    // Filtro por vendedor
    const coincideVendedor = (filtroVendedor === 'Todos') ? true : ((v.vendedor || 'Sistema') === filtroVendedor);
    return coincidePeriodo && coincideVendedor;
  });
  console.log('Ventas filtradas:', datosFiltradosVentas.length);

  // Este efecto detecta cuando disparas con la pistola en cualquier parte de la pantalla
  useEffect(() => {
    const handleKeyDown = async (e) => {
      const target = e.target || document.activeElement;
      const tag = target?.tagName;
      const isInputLike =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable;

      // Si el foco está en un campo de entrada (buscador, cantidad, etc.), no acumular como escaneo global
      if (isInputLike) return;

      // Si presionas Enter, procesamos lo que se acumuló
      if (e.key === 'Enter') {
        // Si estamos dentro del input de código, dejamos que el formulario maneje
        if (document.activeElement === inputRef.current) return;
        const codigoEscaneado = barcode.trim();
        if (codigoEscaneado) {
          // BUSCAMOS: Si el código coincide con el ID o con el Código de Barras
          const producto = productos.find(p =>
            p.id.toString() === codigoEscaneado ||
            p.barcode === codigoEscaneado
          );

          if (producto) {
            const ok = agregarAlCarrito(producto, cantidadVenta);
            if (ok) {
              try { new Audio('https://assets.mixkit.co/active_storage/sfx/2632/2632-preview.mp3').play(); } catch (err) { console.warn(err); }
            }
            setBarcode("");
          } else {
            setBarcode(""); // No existe, limpiamos
          }
        }
      } else {
        // Si no es Enter, vamos guardando los números que lanza la pistola
        if (e.key.length === 1) {
          setBarcode(prev => prev + e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcode, productos, agregarAlCarrito, cantidadVenta]);







  const resumenDashboard = datosFiltradosVentas.reduce((acc, v) => {
    const found = acc.find(item => item.name === v.nombre_producto);
    const ganancia = v.precio_venta - v.precio_costo;
    if (found) { found.Ventas += v.precio_venta; found.Ganancia += ganancia; }
    else { acc.push({ name: v.nombre_producto, Ventas: v.precio_venta, Ganancia: ganancia }); }
    return acc;
  }, []);

  const totalIngresos = datosFiltradosVentas.reduce((a, v) => a + (v.precio_venta || 0), 0);
  const totalGanancia = datosFiltradosVentas.reduce((a, v) => a + ((v.precio_venta || 0) - (v.precio_costo || 0)), 0);
  const totalTransacciones = datosFiltradosVentas.length;
  const ticketPromedio = totalTransacciones ? totalIngresos / totalTransacciones : 0;
  const ventasSerieTemporal = (() => {
    const mapa = new Map();
    if (periodo === 0) {
      for (let h = 0; h < 24; h++) mapa.set(h, 0);
      datosFiltradosVentas.forEach(v => {
        const h = new Date(v.fecha).getHours();
        mapa.set(h, (mapa.get(h) || 0) + (v.precio_venta || 0));
      });
      return Array.from(mapa.entries()).map(([h, val]) => ({ name: `${h}:00`, Ingresos: val }));
    } else if (periodo === 1) {
      const labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
      for (let i = 0; i < 7; i++) mapa.set(i, 0);
      datosFiltradosVentas.forEach(v => {
        const d = new Date(v.fecha);
        const idx = (d.getDay() + 6) % 7; // 0 lunes
        mapa.set(idx, (mapa.get(idx) || 0) + (v.precio_venta || 0));
      });
      return Array.from(mapa.entries()).map(([i, val]) => ({ name: labels[i], Ingresos: val }));
    } else {
      const daysInMonth = new Date(fechaManual.getFullYear(), fechaManual.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) mapa.set(d, 0);
      datosFiltradosVentas.forEach(v => {
        const d = new Date(v.fecha).getDate();
        mapa.set(d, (mapa.get(d) || 0) + (v.precio_venta || 0));
      });
      return Array.from(mapa.entries()).map(([d, val]) => ({ name: `${d}`, Ingresos: val }));
    }
  })();

  const totalPaginasVentasDetalle = Math.max(
    1,
    Math.ceil((datosFiltradosVentas?.length || 0) / itemsPorPaginaVentasDetalle)
  );

    // SI NO HAY USUARIO, MUESTRA EL COMPONENTE LOGIN
    if (!usuarioLogueado) {
      return <Login onLoginSuccess={(user) => setUsuarioLogueado(user)} />;
    }

    // SI HAY USUARIO, MUESTRA EL RESTO DE LA APP
  

  // Si no hay nadie logueado, mostramos el componente Login que importaste
  if (!usuarioLogueado) {
    return <Login onLoginSuccess={(user) => setUsuarioLogueado(user)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/40 to-rose-50 flex font-sans selection:bg-amber-200/60 selection:text-slate-900 relative">
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 bg-white/95 backdrop-blur-xl border-r border-amber-100/70 p-4 space-y-2 top-0 h-screen shadow-2xl shadow-amber-200/40 transition-transform duration-300 ease-in-out`}>
        <div className="mb-6 px-2 flex items-center gap-2">
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-300 via-orange-300 to-rose-300 flex items-center justify-center shadow-inner ring-2 ring-white/70 shrink-0">
                <span className="text-xl">🐶</span>
              </div>
              <div className="flex-1 min-w-0">
                <Title className="text-orange-600 font-black italic uppercase text-lg tracking-tight truncate">
                  Gaby POS
                </Title>
                <Badge color="orange" className="mt-1 text-[8px] uppercase max-w-full truncate">
                  {usuarioLogueado.nombre} ({usuarioLogueado.rol})
                </Badge>
              </div>
            </div>
          )}
          <button
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            onClick={() => {
              setSidebarCollapsed(!sidebarCollapsed);
              if (window.innerWidth < 1024) {
                setSidebarOpen(false);
              }
            }}
            className="ml-auto p-2 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <Menu size={18} className="text-slate-600" />
          </button>
        </div>

        <nav className="space-y-1">
          {/* VENTAS: Todos pueden verla */}
          <button
            onClick={() => {
              setActiveTab('ventas');
              if (window.innerWidth < 1024) {
                setSidebarOpen(false);
              }
            }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-3 rounded-xl font-bold text-xs uppercase ${activeTab === 'ventas' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            title="Ventas Pistola"
          >
            <ShoppingCart className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
            {!sidebarCollapsed && 'Ventas Pistola'}
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
                title="Bodega / Inventario"
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
                title="Dashboard"
              >
                <LayoutDashboard className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
                {!sidebarCollapsed && 'Dashboard'}
              </button>
            </>
          )}

          <div className="pt-6">
            <button
              onClick={() => setShowCierreModal(true)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-3 rounded-xl font-bold text-xs uppercase text-emerald-600 hover:bg-emerald-50`}
              title="Cierre de turno"
            >
              <CheckCircle className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
              {!sidebarCollapsed && 'Cierre de turno'}
            </button>
            <button
              onClick={() => setUsuarioLogueado(null)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-3 rounded-xl font-bold text-xs uppercase text-red-500 hover:bg-red-50`}
              title="Salir"
            >
              <LogOut className={`${sidebarCollapsed ? '' : 'mr-3'}`} size={18} />
              {!sidebarCollapsed && 'Salir'}
            </button>
          </div>
        </nav>
      </aside>

      

      {showCierreModal && (
        <div className="fixed inset-0 z-[600] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl border-t-8 border-emerald-500">
            <Title className="text-center font-black uppercase text-slate-800">Resumen de Cierre</Title>
            <Text className="text-center text-[10px] mb-6 font-bold text-slate-400">Vendedor: {usuarioLogueado.nombre}</Text>

            <div className="space-y-4 mb-8">
              <Flex className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Text className="font-bold text-slate-500 uppercase text-xs">Ventas Realizadas</Text>
                <Text className="font-black text-slate-800">{ventasTurno.length}</Text>
              </Flex>

              <Flex className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <Text className="font-bold text-emerald-700 uppercase text-xs">Total en Efectivo</Text>
                <Metric className="text-emerald-800 font-black">
                  {formatCOP(ventasTurno.reduce((acc, v) => acc + v.total, 0))}
                </Metric>
              </Flex>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setShowCierreModal(false)} className="rounded-xl font-black">CONTINUAR</Button>
              <Button color="emerald" onClick={() => {
                window.print(); // Opcional: imprimir el reporte
                setVentasTurno([]);
                setUsuarioLogueado(null); // Obliga a cerrar sesión tras el cierre
                setShowCierreModal(false);
              }} className="rounded-xl font-black">FINALIZAR Y SALIR</Button>
            </div>
          </Card>
        </div>
      )}


      {/* Se deja solo el panel lateral para navegación */}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto w-full">
        {/* Botón menú móvil */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-3 rounded-xl bg-white/95 backdrop-blur-xl shadow-lg shadow-amber-200/40 border border-amber-100 hover:bg-slate-50 transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
        </div>

        {/* BUSCADOR MAESTRO - Solo se muestra en ventas e inventario */}
        {(activeTab === 'ventas' || activeTab === 'inventario') && (
          <div className="mb-8 relative no-side-margins max-none">
            <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-xl shadow-amber-200/40 border border-amber-100 flex items-center gap-4">
              <Search className="text-slate-300 ml-2" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, ID o código de barras... 🐾"
                className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 uppercase text-sm"
                value={busquedaUniversal}
                onChange={(e) => manejarBusquedaUniversal(e.target.value)}
              />
            </div>
            {sugerencias.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-amber-200/60 border border-amber-100 z-[200] overflow-hidden">
                {sugerencias.slice(0, 5).map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (activeTab === 'ventas') {
                        // Para ventas: enviamos el código al input de barras
                        const codigo = String(p.barcode || p.id || '').trim();
                        setBarcode(codigo);
                        setSugerencias([]);
                        setBusquedaUniversal("");
                        setBusquedaInventario(""); // Limpiar también búsqueda de inventario
                        inputRef.current?.focus();
                      } else if (activeTab === 'inventario') {
                        // Para inventario: solo limpiamos la búsqueda
                        setSugerencias([]);
                        setBusquedaUniversal("");
                        setBusquedaInventario("");
                      }
                    }}
                    className="p-4 hover:bg-amber-50/80 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-none transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-100 via-orange-100 to-rose-100 flex items-center justify-center shadow-inner">
                        <span className="text-lg">🐶</span>
                      </div>
                      <div>
                        <Text className="font-black text-slate-800 text-xs uppercase">
                          {p.name}
                        </Text>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-bold">
                          <span>
                            Stock:{' '}
                            <span className="text-slate-900">
                              {p.cant}
                            </span>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1">
                            <Barcode size={10} className="text-slate-400" />
                            <span className="font-mono">
                              {p.barcode || '---'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge color="orange" className="text-[10px] font-black">
                      {formatCOP(p.venta)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- VISTA VENTAS --- */}
        {activeTab === 'ventas' && (
          <div className="w-full animate-in fade-in duration-500 max-none grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6">
            <div className="space-y-6">
              <Card className="p-4 lg:p-5 rounded-3xl shadow-xl bg-slate-900 text-amber-100 border border-amber-300/40 relative overflow-hidden">
                {/* ESTE FORMULARIO CAPTURA EL ENTER */}
                <form onSubmit={manejarPistola} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end relative z-10">
                  <div className="w-full sm:w-20">
                    <Text className="font-black text-[9px] uppercase text-amber-200 mb-1 ml-1">Cant.</Text>
                    <input
                      type="number"
                      value={cantidadVenta}
                      onChange={e => setCantidadVenta(parseInt(e.target.value) || 1)}
                      className="w-full h-14 sm:h-16 px-3 bg-slate-900 rounded-2xl text-center font-black text-xl border border-amber-300/70 focus:ring-2 ring-amber-400/60 text-amber-50"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Text className="font-black text-[9px] uppercase text-amber-200 text-center mb-1 tracking-widest">Escanea Código de Barras y presiona ENTER</Text>
                    {productoActual && (
                      <div className="mb-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-200/30 via-orange-200/20 to-rose-200/20 border border-amber-200/70 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-300 via-orange-300 to-rose-300 flex items-center justify-center shadow-inner ring-2 ring-white/70">
                            <span className="text-lg">🐶</span>
                          </div>
                          <div>
                            <Text className="font-black text-[11px] uppercase text-slate-800">
                              {productoActual.name}
                            </Text>
                            <Text className="text-[10px] text-slate-600 font-bold italic">
                              Stock: <span className="text-slate-900">{productoActual.cant}</span>
                            </Text>
                          </div>
                        </div>
                        <Badge color="orange" className="text-[10px] font-black">
                          {formatCOP(productoActual.venta)}
                        </Badge>
                      </div>
                    )}
                    <div className="relative">
                      <input
                        ref={inputRef}
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            manejarPistola(e);
                          }
                        }}
                        className="w-full h-16 px-4 bg-slate-950 text-amber-200 rounded-2xl text-2xl font-black text-center border border-amber-300 tracking-[0.3em] shadow-inner shadow-black/40 focus:ring-2 ring-amber-400/70"
                        placeholder="||||||||||||||||"
                      />
                      <button
                        type="button"
                        onClick={() => setBarcode('')}
                        className="absolute top-1/2 right-4 transform -translate-y-1/2 p-2 rounded-full bg-slate-900 text-amber-200 hover:bg-amber-200 hover:text-slate-900 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="hidden">Agregar</button>
                </form>
              </Card>

              <Card className="rounded-3xl shadow-xl p-0 overflow-hidden bg-white/95 ring-1 ring-amber-100/80 min-h-[350px] backdrop-blur">
                <div className="bg-gradient-to-r from-amber-50 to-emerald-50 p-4 border-b border-amber-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-2xl bg-amber-200/80 flex items-center justify-center">
                      <ShoppingCart size={16} className="text-emerald-700" />
                    </div>
                    <Title className="text-xs font-black uppercase text-slate-600 tracking-widest">Carrito de Compras</Title>
                  </div>
                  <Badge color="emerald" className="text-[9px] font-black">
                    {carrito.reduce((total, item) => total + item.cantidad, 0)} items
                  </Badge>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell className="text-[9px] uppercase font-black">Licor</TableHeaderCell>
                        <TableHeaderCell className="text-[9px] uppercase font-black text-center">Und</TableHeaderCell>
                        <TableHeaderCell className="text-[9px] uppercase font-black text-right">Subtotal</TableHeaderCell>
                        <TableHeaderCell></TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {carrito.map((i, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="font-bold text-xs uppercase">{i.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge color="orange" className="font-black rounded-lg shadow-sm">
                              {i.cantidad}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-xs">{formatCOP(i.subtotal)}</TableCell>
                          <TableCell className="text-right">
                              <button onClick={() => setCarrito(carrito.filter((_, n) => n !== idx))} className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50">
                                <Trash2 size={16} />
                              </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-3">
                  {carrito.map((i, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <Text className="font-black text-xs uppercase text-slate-800">{i.name}</Text>
                        </div>
                        <button 
                          onClick={() => setCarrito(carrito.filter((_, n) => n !== idx))} 
                          className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 ml-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge color="orange" className="font-black rounded-lg shadow-sm text-xs">
                          {i.cantidad} und
                        </Badge>
                        <Text className="font-black text-sm text-slate-800">{formatCOP(i.subtotal)}</Text>
                      </div>
                    </div>
                  ))}
                </div>
                {carrito.length === 0 && (
                  <div className="p-16 text-center flex flex-col items-center opacity-70">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-200 via-orange-200 to-rose-200 flex items-center justify-center mb-4 shadow-inner">
                      <span className="text-4xl">🐾</span>
                    </div>
                    <Text className="font-black uppercase text-xs text-slate-500 tracking-[0.25em]">Esperando escaneo...</Text>
                    <Text className="text-[10px] text-slate-400 mt-2">Conecta la pistola, apunta al código y presiona ENTER.</Text>
                  </div>
                )}
              </Card>
            </div>

            <div>
              <Card className="rounded-3xl p-4 lg:p-5 shadow-2xl shadow-emerald-200/50 bg-gradient-to-b from-white via-emerald-50/60 to-emerald-100/40 border-t-8 border-emerald-500 lg:sticky lg:top-24">
                <div className="space-y-4 lg:space-y-6 text-center">
                  <div>
                    <Text className="font-black text-[10px] uppercase text-emerald-700 tracking-widest mb-1">Total a Pagar</Text>
                    <Metric className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter">{formatCOP(total)}</Metric>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <Text className="font-black text-[9px] uppercase mb-2 text-slate-500">Recibido:</Text>
                    <input
                      type="number"
                      value={pagoCon}
                      onChange={e => setPagoCon(Number(e.target.value) || 0)}
                      className="w-full p-3 bg-white/80 rounded-2xl text-xl lg:text-2xl font-black text-center border border-emerald-300 focus:ring-4 ring-emerald-500/20"
                      placeholder="0"
                    />
                  </div>
                  {pagoCon > 0 && (
                    <div className="p-3 lg:p-4 bg-emerald-600/90 rounded-2xl border border-emerald-700 shadow-inner">
                      <Text className="font-black text-[9px] uppercase text-emerald-600 mb-1">Su Cambio:</Text>
                      <Text className="text-xl lg:text-2xl font-black text-emerald-50">{formatCOP(pagoCon - total)}</Text>
                    </div>
                  )}
                  <Button
                    size="xl"
                    color="emerald"
                    icon={CheckCircle}
                    className="w-full rounded-2xl py-3 lg:py-4 font-black text-sm lg:text-base uppercase shadow-xl shadow-emerald-300/60 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600"
                    disabled={carrito.length === 0 || Number(pagoCon) < total}
                    onClick={finalizarCobro}
                  >
                    Confirmar Venta
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* --- VISTA BODEGA (CRUD) --- */}
        {/* --- VISTA BODEGA (INVENTARIO CON GANANCIAS) --- */}
        {activeTab === 'inventario' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 content-full max-none">
            <Flex className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
              <div className="flex-1">
                <Title className="font-black uppercase text-xl italic tracking-tighter text-slate-800">Bodega / Inventario</Title>
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Control de costos y utilidades</Text>
              </div>
              <TabGroup index={vistaInventario === 'tabla' ? 0 : 1} onIndexChange={(i) => setVistaInventario(i === 0 ? 'tabla' : 'tarjetas')}>
                <TabList variant="solid" color="orange">
                  <Tab className="font-black text-xs px-4">Tabla</Tab>
                  <Tab className="font-black text-xs px-4">Tarjetas</Tab>
                </TabList>
              </TabGroup>
              <Button
                icon={Plus}
                color="orange"
                onClick={() => { setIsEditing(false); setFormData({ id: '', name: '', cant: 0, costo: 0, venta: 0, barcode: '' }); setIsModalOpen(true) }}
                className="rounded-xl font-black px-6 py-3 uppercase text-[10px]"
              >
                Nuevo Producto
              </Button>
            </Flex>

            {/* Controles de paginación */}
            <div className="flex items-center justify-between">
              <Text className="text-[10px] font-black text-slate-500 uppercase">
                Total: {productos.filter(p => {
                  const q = busquedaInventario.trim().toLowerCase();
                  if (!q) return true;
                  return (p.name || '').toLowerCase().includes(q) || String(p.id).includes(q) || String(p.barcode || '').includes(q);
                }).length} productos
              </Text>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="rounded-xl text-xs font-black">Anterior</Button>
                <Badge color="orange" className="text-[10px] font-black">Página {paginaActual}</Badge>
                <Button variant="secondary" onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual * itemsPorPagina >= productos.filter(p => {
                  const q = busquedaInventario.trim().toLowerCase();
                  if (!q) return true;
                  return (p.name || '').toLowerCase().includes(q) || String(p.id).includes(q) || String(p.barcode || '').includes(q);
                }).length} className="rounded-xl text-xs font-black">Siguiente</Button>
              </div>
            </div>

            {vistaInventario === 'tabla' ? (
              <Card className="rounded-2xl p-0 overflow-hidden shadow-sm bg-white border border-slate-200 w-full overflow-x-auto glass-card">
                <Table>
                  <TableHead className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHeaderCell className="font-black text-[9px] uppercase">Producto</TableHeaderCell>
                      <TableHeaderCell className="font-black text-[9px] uppercase text-center">Stock</TableHeaderCell>
                      <TableHeaderCell className="font-black text-[9px] uppercase text-right">Costo</TableHeaderCell>
                      <TableHeaderCell className="font-black text-[9px] uppercase text-right">Venta</TableHeaderCell>
                      <TableHeaderCell className="font-black text-[9px] uppercase text-right text-orange-600">Ganancia</TableHeaderCell>
                      <TableHeaderCell className="font-black text-[9px] uppercase text-right">Acciones</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="w-full">
                    {productos
                      .filter(p => {
                        const q = busquedaInventario.trim().toLowerCase();
                        if (!q) return true;
                        return (p.name || '').toLowerCase().includes(q) || String(p.id).includes(q) || String(p.barcode || '').includes(q);
                      })
                      .slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina)
                      .map(p => (
                      <TableRow key={p.id} className="hover:bg-slate-50 transition-all">
                        <TableCell>
                          <Text className="font-bold uppercase text-xs text-slate-800">{p.name}</Text>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-[9px] text-slate-400 font-bold italic">ID: {p.id}</Text>
                            <span className="text-slate-200">|</span>
                            <div className="flex items-center gap-1 text-slate-400">
                              <Barcode size={10} />
                              <Text className="text-[9px] font-mono">{p.barcode || '---'}</Text>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge color={p.cant <= 5 ? 'red' : 'emerald'} className="font-black rounded-lg">{p.cant} unid.</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-slate-500">{formatCOP(p.costo)}</TableCell>
                        <TableCell className="text-right text-xs font-black text-slate-900">{formatCOP(p.venta)}</TableCell>
                        <TableCell className="text-right">
                          <Badge color="orange" icon={TrendingUp} className="font-black text-[10px] py-1 px-3">
                            {formatCOP(p.venta - p.costo)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <button onClick={() => { setFormData(p); setIsEditing(true); setIsModalOpen(true) }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16} /></button>
                          <button onClick={async () => {
                            const res = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
                            if (res.isConfirmed) { await fetch(`${API_URL}/inventory/${p.id}`, { method: 'DELETE' }); cargarDatos(); }
                          }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productos
                  .filter(p => {
                    const q = busquedaInventario.trim().toLowerCase();
                    if (!q) return true;
                    return (p.name || '').toLowerCase().includes(q) || String(p.id).includes(q) || String(p.barcode || '').includes(q);
                  })
                  .slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina)
                  .map(p => (
                  <Card key={p.id} className="glass-card rounded-2xl p-4 shadow-sm ring-1 ring-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <Text className="text-[10px] font-black uppercase text-slate-400">ID: {p.id}</Text>
                      <Badge color={p.cant <= 5 ? 'red' : 'emerald'} className="font-black">{p.cant} unid.</Badge>
                    </div>
                    <Title className="text-slate-800 font-black text-base uppercase mb-2">{p.name}</Title>
                    <div className="flex items-center justify-between text-sm mb-3">
                      <Text className="text-slate-500">Costo</Text>
                      <Text className="font-bold">{formatCOP(p.costo)}</Text>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-4">
                      <Text className="text-slate-500">Venta</Text>
                      <Text className="font-black text-slate-900">{formatCOP(p.venta)}</Text>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => { setFormData(p); setIsEditing(true); setIsModalOpen(true) }} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200">Editar</button>
                      <button onClick={async () => {
                        const res = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
                        if (res.isConfirmed) { await fetch(`${API_URL}/inventory/${p.id}`, { method: 'DELETE' }); cargarDatos(); }
                      }} className="px-3 py-2 rounded-lg bg-red-50 text-red-500 font-bold text-xs hover:bg-red-500 hover:text-white">Eliminar</button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- VISTA REPORTES --- */}
        {/* --- VISTA REPORTES (DASHBOARD COMPLETO) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-500 content-full max-none">
            <header className="bg-slate-900 px-6 py-4 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white border-b-4 border-orange-600">
              <div className="text-center md:text-left mb-4 md:mb-0">
                <Title className="text-white font-black text-xl uppercase italic tracking-tighter">Panel de Control</Title>
                <Text className="text-orange-400 font-bold text-[9px] uppercase tracking-widest">Resumen de Rendimiento</Text>
              </div>

              {/* SECCIÓN DE FILTROS: CALENDARIO, PERIODO Y VENDEDOR */}
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <DatePicker
                  className="max-w-sm"
                  value={fechaManual}
                  onValueChange={setFechaManual}
                  locale={es}
                  placeholder="Seleccionar Fecha"
                />
                <TabGroup index={periodo} onIndexChange={setPeriodo}>
                  <TabList variant="solid" color="orange" className="bg-slate-800 scale-90">
                    <Tab className="font-black px-6">HOY</Tab>
                    <Tab className="font-black px-6">ESTE MES</Tab>
                  </TabList>
                </TabGroup>
                <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-2xl border border-slate-700">
                  <Text className="text-[9px] font-black uppercase text-slate-300">Vendedor</Text>
                  <select
                    value={filtroVendedor}
                    onChange={(e) => {
                      setFiltroVendedor(e.target.value);
                      setPaginaVentasDetalle(1);
                    }}
                    className="bg-slate-900 text-xs text-white font-bold uppercase rounded-xl px-3 py-1 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="Todos">Todos</option>
                    {Array.from(new Set((ventas || []).map(v => v.vendedor || 'Sistema'))).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <Button
                  icon={Save}
                  color="emerald"
                  onClick={sincronizarVentasPendientes}
                  className="rounded-xl font-black uppercase text-[10px]"
                >
                  Sincronizar Ventas
                </Button>
                {pendientesCount > 0 && (
                  <Badge color="orange" className="font-black rounded-lg">{pendientesCount} pendientes</Badge>
                )}
              </div>
            </header>

            {/* TARJETAS DE MÉTRICAS */}
            <Grid numItemsLg={4} className="gap-4">
              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Text className="font-black text-slate-400 uppercase text-[9px] mb-2">Ingresos Totales</Text>
                <Metric className="text-2xl font-black text-slate-900">{formatCOP(totalIngresos)}</Metric>
              </Card>
              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Text className="font-black text-slate-400 uppercase text-[9px] mb-2">Ganancia Neta</Text>
                <Metric className="text-2xl font-black text-emerald-600">{formatCOP(totalGanancia)}</Metric>
              </Card>
              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Text className="font-black text-slate-400 uppercase text-[9px] mb-2">Ticket Promedio</Text>
                <Metric className="text-2xl font-black text-slate-900">{formatCOP(ticketPromedio)}</Metric>
              </Card>
              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Text className="font-black text-slate-400 uppercase text-[9px] mb-2">Transacciones</Text>
                <Metric className="text-2xl font-black text-orange-600">{totalTransacciones}</Metric>
              </Card>
            </Grid>

            {/* GRÁFICAS */}
            <Grid numItemsLg={2} className="gap-4">
              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Title className="font-black uppercase text-[10px] text-slate-400 mb-6 tracking-widest italic">
                  {periodo === 0 ? 'Ingresos por Hora (HOY)' : 'Ingresos por Día (MES)'}
                </Title>
                <BarChart className="h-60 mt-2" data={ventasSerieTemporal} index="name" categories={["Ingresos"]} colors={["orange"]} valueFormatter={formatCOP} yAxisWidth={70} />
              </Card>

              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Title className="font-black uppercase text-[10px] text-slate-400 mb-6 tracking-widest italic">Ventas por Producto ($)</Title>
                <BarChart className="h-60 mt-2" data={resumenDashboard} index="name" categories={["Ventas"]} colors={["orange"]} valueFormatter={formatCOP} yAxisWidth={70} />
              </Card>
            </Grid>

            <Grid numItemsLg={2} className="gap-4">
              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Title className="font-black uppercase text-[10px] text-slate-400 mb-6 tracking-widest italic">Distribución de Ingresos</Title>
                <DonutChart className="h-56 mt-2" data={resumenDashboard} category="Ventas" index="name" valueFormatter={formatCOP} colors={["orange", "amber", "slate", "rose", "cyan", "emerald"]} />
              </Card>
              <Card className="rounded-2xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
                <Text className="font-black text-slate-400 uppercase text-[9px] mb-2">Alertas de Stock</Text>
                <Metric className="text-3xl font-black text-red-500">
                  {productos.filter(p => p.cant <= 5).length} <span className="text-xs text-slate-400">Items bajos</span>
                </Metric>
              </Card>
            </Grid>

            {/* TABLA DE GANANCIAS DETALLADAS (LA QUE FALTA) */}
            <Card className="rounded-2xl p-0 overflow-hidden shadow-sm bg-white border border-slate-200">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <Title className="font-black uppercase text-[11px] text-slate-500 tracking-widest">Desglose de Ganancias por Licor</Title>
              </div>
              <Table>
                <TableHead>
                  <TableRow className="bg-slate-50">
                    <TableHeaderCell className="font-black text-[9px] uppercase">Producto</TableHeaderCell>
                    <TableHeaderCell className="font-black text-[9px] uppercase text-right">Ventas Totales</TableHeaderCell>
                    <TableHeaderCell className="font-black text-[9px] uppercase text-right">Ganancia Real</TableHeaderCell>
                    <TableHeaderCell className="font-black text-[9px] uppercase text-center">Margen</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resumenDashboard
                    .slice((paginaGanancias - 1) * itemsPorPaginaGanancias, paginaGanancias * itemsPorPaginaGanancias)
                    .map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/80 transition-all">
                      <TableCell className="font-bold text-xs uppercase text-slate-700">{item.name}</TableCell>
                      <TableCell className="text-right font-bold text-xs">{formatCOP(item.Ventas)}</TableCell>
                      <TableCell className="text-right font-black text-xs text-emerald-600">{formatCOP(item.Ganancia)}</TableCell>
                      <TableCell className="text-center">
                        <Badge color="emerald" className="text-[9px] font-black uppercase">
                          {((item.Ganancia / item.Ventas) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {resumenDashboard.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px]">
                  No hay ventas registradas en este periodo
                </div>
              ) : (
                <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-slate-500 font-black uppercase">
                      Mostrando {((paginaGanancias - 1) * itemsPorPaginaGanancias) + 1} - {Math.min(paginaGanancias * itemsPorPaginaGanancias, resumenDashboard.length)} de {resumenDashboard.length} productos
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPaginaGanancias(prev => Math.max(1, prev - 1))}
                        disabled={paginaGanancias === 1}
                        className="px-3 py-1 text-xs font-black uppercase bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Anterior
                      </button>
                      <span className="px-3 py-1 text-xs font-black text-slate-700 bg-slate-100 rounded-lg">
                        {paginaGanancias} / {Math.ceil(resumenDashboard.length / itemsPorPaginaGanancias)}
                      </span>
                      <button
                        onClick={() => setPaginaGanancias(prev => Math.min(Math.ceil(resumenDashboard.length / itemsPorPaginaGanancias), prev + 1))}
                        disabled={paginaGanancias === Math.ceil(resumenDashboard.length / itemsPorPaginaGanancias)}
                        className="px-3 py-1 text-xs font-black uppercase bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="rounded-2xl p-0 overflow-hidden shadow-sm bg-white border border-slate-200">
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-emerald-50 flex items-center justify-between">
                <div>
                  <Text className="font-black text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    Detalle de Ventas por Vendedor
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-1">
                    Cada fila es una venta realizada en el periodo filtrado.
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      cargarDatos();
                      setPaginaVentasDetalle(1);
                    }}
                    className="p-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                    title="Refrescar datos"
                  >
                    <RefreshCw size={16} className="text-slate-600" />
                  </button>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <button
                    type="button"
                    onClick={() => setPaginaVentasDetalle(p => Math.max(1, p - 1))}
                    disabled={paginaVentasDetalle === 1}
                    className={`px-2 py-1 rounded-lg border ${
                      paginaVentasDetalle === 1
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                        : 'border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    «
                  </button>
                  <span className="px-2 py-1 rounded-full bg-white border border-slate-200">
                    Página {paginaVentasDetalle} / {totalPaginasVentasDetalle}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaginaVentasDetalle(p => Math.min(totalPaginasVentasDetalle, p + 1))}
                    disabled={paginaVentasDetalle === totalPaginasVentasDetalle}
                    className={`px-2 py-1 rounded-lg border ${
                      paginaVentasDetalle === totalPaginasVentasDetalle
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                        : 'border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    »
                  </button>
                  </div>
                </div>
              </div>
              <Table>
                <TableHead>
                  <TableRow className="bg-slate-50">
                    <TableHeaderCell className="font-black text-[9px] uppercase">Producto</TableHeaderCell>
                    <TableHeaderCell className="font-black text-[9px] uppercase text-center">Cantidad</TableHeaderCell>
                    <TableHeaderCell className="font-black text-[9px] uppercase text-center">Vendedor</TableHeaderCell>
                    <TableHeaderCell className="font-black text-[9px] uppercase text-right">Total Vendido</TableHeaderCell>
                    <TableHeaderCell className="font-black text-[9px] uppercase text-right text-emerald-600">Ganancia</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datosFiltradosVentas
                    // Agrupar por producto y coleccionar vendedores
                    .reduce((acc, venta) => {
                      const existing = acc.find(item => item.nombre_producto === venta.nombre_producto);
                      const cantidadVendida = venta.cantidad || 0;
                      if (existing) {
                        existing.cantidad_total += cantidadVendida;
                        existing.total_vendido += venta.precio_venta * cantidadVendida;
                        existing.ganancia_total += (venta.precio_venta - venta.precio_costo) * cantidadVendida;
                        // Agregar vendedor si no está en la lista
                        if (!existing.vendedores.includes(venta.vendedor || "Sistema")) {
                          existing.vendedores.push(venta.vendedor || "Sistema");
                        }
                      } else {
                        acc.push({
                          nombre_producto: venta.nombre_producto,
                          cantidad_total: cantidadVendida,
                          total_vendido: venta.precio_venta * cantidadVendida,
                          ganancia_total: (venta.precio_venta - venta.precio_costo) * cantidadVendida,
                          vendedores: [venta.vendedor || "Sistema"]
                        });
                      }
                      return acc;
                    }, [])
                    .slice(
                      (paginaVentasDetalle - 1) * itemsPorPaginaVentasDetalle,
                      paginaVentasDetalle * itemsPorPaginaVentasDetalle
                    )
                    .map((venta, idx) => (
                      <TableRow
                        key={`${venta.nombre_producto}-${idx}`}
                        className={idx % 2 === 0 ? "bg-white hover:bg-emerald-50/40 transition-colors" : "bg-slate-50/60 hover:bg-emerald-50/40 transition-colors"}
                      >
                        <TableCell className="font-bold text-xs uppercase text-slate-700">
                          {venta.nombre_producto}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge color="orange" className="text-[9px] font-black uppercase rounded-lg px-3">
                            {venta.cantidad_total}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {venta.vendedores.map((vendedor, i) => (
                            <Badge
                              key={i}
                              color={vendedor === "Sistema" ? "slate" : "emerald"}
                              className="text-[9px] font-black uppercase rounded-full px-2 mb-1"
                            >
                              {vendedor}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell className="text-right font-black text-xs">
                          {formatCOP(venta.total_vendido)}
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-emerald-600">
                          {formatCOP(venta.ganancia_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </main>



      {/* --- MODAL DE PRODUCTO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-8 bg-white rounded-3xl shadow-2xl relative border-t-8 border-orange-600 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-all"><X size={24} /></button>
            <Title className="text-center font-black uppercase mb-8 text-xl italic tracking-tighter text-slate-800">
              {isEditing ? 'Editar Producto' : 'Nuevo Ingreso'}
            </Title>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const idDup = !isEditing && productos.some(p => String(p.id) === String(formData.id));
              if (idDup) { Swal.fire({ title: '¡ID Duplicado!', text: 'Este ID ya está en uso', icon: 'warning' }); return; }

              const nameTrim = (formData.name || '').trim().toUpperCase();
              if (!nameTrim) { Swal.fire({ title: 'Nombre requerido', icon: 'warning' }); return; }
              const nameDup = productos.some(p => (p.name || '').trim().toUpperCase() === nameTrim && String(p.id) !== String(formData.id));
              if (nameDup) { Swal.fire({ title: 'Nombre duplicado', text: 'Ya existe un producto con este nombre', icon: 'warning' }); return; }

              const barcodeTrim = (formData.barcode || '').trim();
              if (barcodeTrim) {
                const barcodeDup = productos.some(p => String(p.barcode || '').trim() === barcodeTrim && String(p.id) !== String(formData.id));
                if (barcodeDup) { Swal.fire({ title: 'Código de barras duplicado', text: 'Ya está asignado a otro producto', icon: 'warning' }); return; }
              }

              const cant = Number(formData.cant) || 0;
              const costo = Number(formData.costo) || 0;
              const venta = Number(formData.venta) || 0;
              if (cant < 0 || costo < 0 || venta < 0) { Swal.fire({ title: 'Valores inválidos', text: 'Stock y precios no pueden ser negativos', icon: 'warning' }); return; }
              if (venta < costo) {
                const resWarn = await Swal.fire({ title: 'Precio de venta menor al costo', text: '¿Deseas continuar?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, continuar' });
                if (!resWarn.isConfirmed) return;
              }

              const payload = { ...formData, name: nameTrim, cant, costo, venta, barcode: barcodeTrim };
              const res = await fetch(isEditing ? `${API_URL}/inventory/update/${payload.id}` : `${API_URL}/inventory/create`, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (res.ok) {
                Swal.fire({ title: '¡Éxito!', icon: 'success', timer: 1000, showConfirmButton: false });
                setIsModalOpen(false);
                cargarDatos();
              } else {
                const err = await res.json();
                Swal.fire({ title: 'Error', text: err.detail, icon: 'error' });
              }
            }} className="space-y-4">
              <div className="space-y-1">
                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Único (Interno)</Text>
                <input disabled={isEditing} value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold border border-slate-200 focus:ring-2 ring-orange-500/20 text-sm" required />
              </div>
              <div className="space-y-1">
                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Escaneo de Barras 🛒</Text>
                <div className="relative flex items-center">
                  <Barcode className="absolute left-3 text-orange-400" size={18} />
                  <input value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} className="w-full p-3 pl-10 bg-orange-50/30 rounded-xl font-bold border-2 border-dashed border-orange-100 focus:ring-2 ring-orange-500/10 text-sm" placeholder="Escanea aquí..." />
                </div>
              </div>
              <div className="space-y-1">
                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Licor</Text>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold border border-slate-200 uppercase text-sm" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Text className="text-[8px] font-black text-slate-400 uppercase">Stock</Text>
                  <input type="number" value={formData.cant} onChange={e => setFormData({ ...formData, cant: parseInt(e.target.value) || 0 })} className="w-full p-2 bg-slate-50 rounded-lg border text-center font-bold" />
                </div>
                <div className="text-center">
                  <Text className="text-[8px] font-black text-slate-400 uppercase">Costo</Text>
                  <input type="number" value={formData.costo} onChange={e => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-slate-50 rounded-lg border text-center font-bold" />
                </div>
                <div className="text-center">
                  <Text className="text-[8px] font-black text-orange-600 uppercase">Venta</Text>
                  <input type="number" value={formData.venta} onChange={e => setFormData({ ...formData, venta: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-orange-600 text-white rounded-lg text-center font-bold" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase shadow-lg mt-4 flex items-center justify-center gap-3 text-xs hover:bg-slate-800 transition-all">
                <Save size={18} /> {isEditing ? 'Actualizar' : 'Guardar'}
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};  



const NavItem = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${active ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
    <div className="flex items-center gap-4">
      {icon}
      <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>
    </div>
    <ChevronRight size={16} className={active ? 'text-white' : 'text-slate-300'} />
  </button>
);

export default App;
