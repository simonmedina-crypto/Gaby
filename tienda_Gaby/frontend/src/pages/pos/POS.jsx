import React, { useState } from 'react';

const POS = ({ productos, onVenta }) => {
  const [scan, setScan] = useState("");
  const [carrito, setCarrito] = useState([]);

  const handleScan = (e) => {
    e.preventDefault();
    const p = productos.find(prod => prod.id === scan);
    if (p && p.cant > 0) {
      setCarrito([...carrito, p]);
      setScan("");
    } else {
      alert("¡Sin stock o no existe! 🐕");
      setScan("");
    }
  };

  const total = carrito.reduce((acc, item) => acc + item.venta, 0);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-8">🛒 CAJA REGISTRADORA</h2>
        
        <form onSubmit={handleScan} className="mb-10">
          <input 
            autoFocus 
            className="w-full p-5 rounded-2xl border-2 border-slate-800 text-2xl font-black focus:border-amber-500 outline-none" 
            placeholder="Esperando escaneo..." 
            value={scan}
            onChange={(e) => setScan(e.target.value)}
          />
        </form>

        <div className="space-y-4 mb-10 min-h-[150px]">
          {carrito.map((item, i) => (
            <div key={i} className="flex justify-between font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl">
              <span>{item.name}</span>
              <span className="text-amber-600">$ {item.venta.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center text-4xl font-black mb-10">
          <span>TOTAL:</span>
          <span className="text-emerald-600">$ {total.toLocaleString()}</span>
        </div>

        <button 
          onClick={() => { onVenta(carrito); setCarrito([]); }}
          className="w-full bg-[#10b981] text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          FINALIZAR VENTA (F10)
        </button>
      </div>
    </div>
  );
};

export default POS;
