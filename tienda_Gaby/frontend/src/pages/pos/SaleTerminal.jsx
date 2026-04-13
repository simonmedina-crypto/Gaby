import { useState, useRef, useEffect } from 'react';

const SaleTerminal = () => {
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState("");
  const inputRef = useRef(null);

  // Mantiene el foco en el input para que la pistola siempre escriba ahí
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const handleScan = (e) => {
    e.preventDefault();
    if (!barcode) return;

    // Aquí simulamos la búsqueda en tu inventario
    const nuevoProducto = {
      id: Date.now(),
      name: "Aguardiente Antioqueño 750ml",
      price: 45000,
      cost: 32000,
      barcode: barcode
    };

    setCart([nuevoProducto, ...cart]);
    setBarcode(""); 
  };

  const total = cart.reduce((acc, item) => acc + item.price, 0);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#1e293b' }}>🛒 Caja Registradora - Licorera</h2>
      
      <form onSubmit={handleScan} style={{ marginBottom: '20px' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Esperando escaneo de pistola..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #3b82f6' }}
        />
      </form>

      <div style={{ background: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Producto</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Precio</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={{ padding: '10px' }}>{item.name}</td>
                <td style={{ textAlign: 'right', padding: '10px' }}>${item.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '2px solid #1e293b', paddingTop: '10px' }}>
          <h1 style={{ margin: 0 }}>Total: ${total.toLocaleString()}</h1>
          <button style={{ background: '#10b981', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', marginTop: '10px' }}>
            Finalizar Venta (F10)
          </button>
        </div>
      </div>
    </div>
    
  );
};

export default SaleTerminal;