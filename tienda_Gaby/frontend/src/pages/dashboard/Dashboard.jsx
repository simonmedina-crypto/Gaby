import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

const Dashboard = ({ productos, ventas }) => {
  // --- LÓGICA DE DATOS ---
  const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);
  const productosAgotandose = productos.filter(p => p.cant <= 5);
  
  // Datos para Gráfica de Barras (Utilidad por producto)
  const dataBarras = productos.slice(0, 5).map(p => ({
    name: p.name.split(' ')[0],
    ganancia: p.venta - p.costo
  }));

  // Datos para Gráfica de Torta (Distribución de Stock)
  const dataPie = [
    { name: 'Con Stock', value: productos.filter(p => p.cant > 5).length },
    { name: 'Por Agotarse', value: productos.filter(p => p.cant <= 5).length },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="p-4 bg-[#f4f7f6] min-h-screen font-sans text-slate-800">
      
      {/* HEADER COMPACTO */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Panel de Control Gaby 🐾</h1>
          <p className="text-xs font-bold text-slate-400">Resumen operativo en tiempo real</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full font-black">SISTEMA ACTIVO</span>
        </div>
      </div>

      {/* FILA 1: TARJETAS PEQUEÑAS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ventas Hoy', val: `$${totalVentas.toLocaleString()}`, color: 'border-blue-500' },
          { label: 'Inversión Bodega', val: `$${productos.reduce((a,p)=>a+(p.costo*p.cant),0).toLocaleString()}`, color: 'border-orange-500' },
          { label: 'Productos Total', val: productos.length, color: 'border-purple-500' },
          { label: 'Alertas Stock', val: productosAgotandose.length, color: 'border-red-500' }
        ].map((kpi, i) => (
          <div key={i} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 ${kpi.color}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase">{kpi.label}</p>
            <p className="text-xl font-black">{kpi.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: GRÁFICAS PRINCIPALES */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Gráfica 1: Utilidad */}
          <div className="bg-white p-5 rounded-[2rem] shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 text-center">Ganancia por Botella</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataBarras}>
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{borderRadius: '15px', border:'none'}} />
                  <Bar dataKey="ganancia" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica 2: Flujo de Caja (Area) */}
          <div className="bg-white p-5 rounded-[2rem] shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 text-center">Flujo de Caja</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ventas.map(v => ({h: v.fecha, t: v.total}))}>
                  <Area type="monotone" dataKey="t" stroke="#3b82f6" fill="#dbeafe" strokeWidth={3} />
                  <XAxis dataKey="h" hide />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica 3: Estado del Inventario (Pie) */}
          <div className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2">Salud del Inventario</h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataPie} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {dataPie.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-[9px] font-bold">
              <span className="text-emerald-500">● OK</span>
              <span className="text-red-500">● AGOTÁNDOSE</span>
            </div>
          </div>

          {/* Gráfica 4: Rendimiento Lineal */}
          <div className="bg-white p-5 rounded-[2rem] shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 text-center">Rendimiento</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataBarras}>
                  <Line type="step" dataKey="ganancia" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ALERTAS Y RECIENTES */}
        <div className="space-y-6">
          
          {/* SECCIÓN SURTIDO */}
          <div className="bg-[#1e293b] p-6 rounded-[2.5rem] text-white shadow-xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
              <span className="animate-ping w-2 h-2 bg-red-500 rounded-full"></span> 
              Lista de Compras (Surtir)
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {productosAgotandose.length > 0 ? productosAgotandose.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-xs font-bold">{p.name}</span>
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-md font-black">
                    {p.cant} unid.
                  </span>
                </div>
              )) : <p className="text-xs text-slate-500 italic">Bodega llena, Gaby ✅</p>}
            </div>
          </div>

          {/* ÚLTIMAS VENTAS */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4">Últimos Movimientos</h3>
            <div className="space-y-3">
              {ventas.slice(-3).reverse().map((v, i) => (
                <div key={i} className="flex justify-between text-xs border-b border-slate-50 pb-2">
                  <span className="font-bold text-slate-500">{v.fecha}</span>
                  <span className="font-black text-emerald-600">+ ${v.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;