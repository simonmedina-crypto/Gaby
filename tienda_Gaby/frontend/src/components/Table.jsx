import './Table.css';

const Table = ({ data }) => {
  return (
    <div className="table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio Venta</th>
            <th>Existencias</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.name}</strong></td>
              <td>${item.price.toLocaleString()}</td>
              <td>{item.stock} unidades</td>
              <td>
                <span className={item.stock < 5 ? "badge-red" : "badge-green"}>
                  {item.stock < 5 ? "Reponer" : "OK"}
                </span>
              </td>
              <td>
                <button className="btn-icon">✏️</button>
                <button className="btn-icon">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;