import React, { useState, useEffect } from 'react';
import { Card, Metric, Text, Title } from "@tremor/react";
import { User } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [usuarioLogueado] = useState({ nombre: 'Admin', rol: 'Administrador' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <header className="bg-gradient-to-r from-slate-800 to-zinc-800 border-b border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-white">🐕 Tienda Gaby</h1>
          </div>
          <div className="text-white">
            <span>{usuarioLogueado.nombre} ({usuarioLogueado.rol})</span>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-72 bg-gradient-to-b from-slate-800 to-zinc-800 border-r border-slate-700 min-h-screen">
          <nav className="p-6 space-y-4">
            <button 
              onClick={() => setActiveTab('ventas')}
              className={`w-full flex items-center justify-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                activeTab === 'ventas' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                  : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}     

              
            >
              <span>Ventas</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('inventario')}
              className={`w-full flex items-center justify-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                activeTab === 'inventario' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                  : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <span>Inventario</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                  : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <span>Dashboard</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('fiados')}
              className={`w-full flex items-center justify-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 ${
                activeTab === 'fiados' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl' 
                  : 'bg-white border-slate-300 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <span>Fiados</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {activeTab === 'ventas' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Ventas</h2>
              <p className="text-slate-600">Módulo de ventas en construcción</p>
            </div>
          )}
          
          {activeTab === 'inventario' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Inventario</h2>
              <p className="text-slate-600">Módulo de inventario en construcción</p>
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Dashboard</h2>
              <p className="text-slate-600">Módulo de dashboard en construcción</p>
            </div>
          )}
          
          {activeTab === 'fiados' && usuarioLogueado.rol === 'Administrador' && (
            <div className="space-y-6">
              <div className="text-center">
                <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Sistema de Fiados</h2>
                <p className="text-slate-600">Gestión de ventas a crédito</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-slate-300 shadow-xl">
                  <div className="p-6">
                    <Title className="text-xl font-bold text-slate-800">Fiados</Title>
                    <Metric className="text-3xl font-bold text-amber-600">0</Metric>
                    <Text className="text-sm text-slate-600">Total registrados</Text>
                  </div>
                </Card>
                
                <Card className="border-slate-300 shadow-xl">
                  <div className="p-6">
                    <Title className="text-xl font-bold text-slate-800">Pendientes</Title>
                    <Metric className="text-3xl font-bold text-red-600">0</Metric>
                    <Text className="text-sm text-slate-600">Por cobrar</Text>
                  </div>
                </Card>
                
                <Card className="border-slate-300 shadow-xl">
                  <div className="p-6">
                    <Title className="text-xl font-bold text-slate-800">Total</Title>
                    <Metric className="text-3xl font-bold text-green-600">$0</Metric>
                    <Text className="text-sm text-slate-600">Valor pendiente</Text>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
