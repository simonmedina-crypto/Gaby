import Table from "../../components/Table"; // Dos niveles arriba y luego a components

function ProductList() {
  // Estos son los datos que la tabla va a dibujar
  const misProductos = [
    { codigo: 1, name: "Agila", price: 15000, stock: 10, },
    { codigo: 2, name: "Agila lith", price: 2000, stock: 50. },
    { codigo: 3, name: "Soda", price: 5000, stock: 12. }
  ];

  return (
    <div>
      <h1 style={{ color: '#1e293b', marginBottom: '20px' }}>📦 Gestión de Inventario</h1>
      {/* Pasamos los datos a la tabla a través de la propiedad 'data' */}
      <Table data={misProductos} />
    </div>
  );
}

export default ProductList;