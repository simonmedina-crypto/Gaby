import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, X, Save, Camera, Search, AlertCircle, Image as ImageIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const InventoryManager = () => {
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // NUEVO: Estado para saber qué ID estamos editando
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    cant: '',
    costo: '',
    venta: ''
  });

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => { loadData(); }, 0);
    return () => clearTimeout(t);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // NUEVO: Función para abrir el modal en modo EDICIÓN
  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({
      id: item.id,
      name: item.name,
      cant: item.cant,
      costo: item.costo,
      venta: item.venta
    });
    setPreviewUrl(item.image_url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null); // Limpiamos el ID de edición
    setFormData({ id: '', name: '', cant: '', costo: '', venta: '' });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('id', formData.id);
    data.append('name', formData.name);
    data.append('cant', formData.cant);
    data.append('costo', formData.costo);
    data.append('venta', formData.venta);
    if (selectedFile) {
      data.append('file', selectedFile);
    }

    // LÓGICA DINÁMICA: Si hay editingId usamos PUT, si no POST
    const url = editingId 
      ? `${API_URL}/inventory/${editingId}` 
      : `${API_URL}/inventory/upload`;
    
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        body: data,
      });

      if (response.ok) {
        loadData();
        closeModal();
      } else {
        alert("Error en el servidor al procesar el producto");
      }
    } catch (error) {
      console.error(error);
      alert("Error al conectar con la API");
    }
  };

  const handleDelete = async (prodId) => {
    if (window.confirm(`¿Seguro que quieres eliminar el producto ${prodId}?`)) {
      await fetch(`${API_URL}/inventory/${prodId}`, { method: 'DELETE' });
      loadData();
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              CONTROL DE <span className="text-indigo-600">INVENTARIO</span>
            </h1>
            <p className="text-slate-500 font-medium">Licorera Gaby - Gestión de Stock y Galería</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-3xl font-bold shadow-xl shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={24} strokeWidth={3} /> AGREGAR PRODUCTO
          </button>
        </div>

        <div className="mt-8 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o ID de pistola..." 
            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredItems.map((item) => (
          <div key={item.id} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <div className="relative h-56 bg-slate-200">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                  <ImageIcon size={48} strokeWidth={1} />
                  <span className="text-[10px] font-bold mt-2 uppercase">Sin Imagen</span>
                </div>
              )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black shadow-sm">
                ID: {item.id}
              </div>
            </div>

            <div className="p-6 flex flex-col flex-grow">
              <span className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">Licorera</span>
              <h3 className="text-xl font-bold text-slate-800 mb-4 line-clamp-1">{item.name}</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Precio Venta</p>
                  <p className="text-xl font-black text-slate-900">${Number(item.venta).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Existencias</p>
                  <p className={`text-xl font-black ${item.cant < 5 ? 'text-red-600' : 'text-slate-900'}`}>{item.cant}</p>
                </div>
              </div>

              <div className="mt-auto flex gap-2">
                {/* BOTÓN EDITAR ACTUALIZADO */}
                <button 
                  onClick={() => handleEditClick(item)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 size={18} /> Editar
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-50 hover:bg-red-500 hover:text-white text-red-500 p-3 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                  {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="relative group mx-auto w-32 h-32 mb-6">
                  <input type="file" id="fileUpload" className="hidden" accept="image/*" onChange={handleFileChange} />
                  <label htmlFor="fileUpload" className="cursor-pointer w-full h-full rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden hover:border-indigo-500 transition-all">
                    {previewUrl ? (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <><Camera size={32} className="text-slate-400" /><span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Subir Foto</span></>
                    )}
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">ID Pistola</label>
                       <input type="text" disabled={!!editingId} className={`w-full p-4 rounded-2xl outline-none font-bold ${editingId ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 focus:ring-2 focus:ring-indigo-500'}`} value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre del Licor</label>
                       <input type="text" required className="w-full bg-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Stock</label>
                       <input type="number" required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={formData.cant} onChange={e => setFormData({...formData, cant: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Costo</label>
                       <input type="number" required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={formData.costo} onChange={e => setFormData({...formData, costo: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Venta</label>
                       <input type="number" required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={formData.venta} onChange={e => setFormData({...formData, venta: e.target.value})} />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 mt-4">
                  <Save size={24} /> {editingId ? 'ACTUALIZAR CAMBIOS' : 'GUARDAR EN GABY_BD'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
