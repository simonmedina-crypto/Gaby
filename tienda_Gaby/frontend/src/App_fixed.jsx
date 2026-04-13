// Archivo temporal para probar la estructura
import React from 'react';

const TestApp = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <header className="bg-gradient-to-r from-slate-800 to-zinc-800 border-b border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <button className="p-2 rounded-xl hover:bg-slate-700 transition-all duration-300 hover:scale-105 group">
              <span className="text-white">Menu</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-72 bg-gradient-to-b from-slate-800 to-zinc-800 border-r border-slate-700 min-h-screen transition-all duration-300 shadow-lg">
          <nav className="p-6 space-y-4">
            <button className="w-full flex items-center justify-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl">
              <span>Ventas</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800">Página de prueba</h1>
            <p className="text-slate-600">Estructura JSX correcta</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TestApp;
