import React, { useState } from 'react';
import { Card, Title, Text } from "@tremor/react";
import { Lock } from 'lucide-react';

const USUARIOS_AUTORIZADOS = [
  { id: 1, nombre: "Simon", pin: "1234", rol: "Administrador" },
  { id: 2, nombre: "Ana", pin: "0000", rol: "Vendedor" },
  { id: 3, nombre: "Socio", pin: "5555", rol: "Administrador" }
];

const Login = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleIngresar = () => {
    const user = USUARIOS_AUTORIZADOS.find(u => u.pin === pin);
    if (user) {
      onLoginSuccess(user);
    } else {
      setError(true);
      setPin("");
      // Sonido de error
      new Audio('https://assets.mixkit.co/active_storage/sfx/2632/2632-preview.mp3').play();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="relative max-w-md w-full p-0 bg-slate-950/80 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] border border-amber-400/40 overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 0 0, rgba(251,191,36,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(248,250,252,0.1), transparent 55%)' }} />
        <div className="relative z-10 grid md:grid-cols-[1.3fr_1fr] gap-0">
          <div className="p-8 flex flex-col justify-center">
            <div className="text-center mb-6">
              <div className="relative w-24 h-24 rounded-[32px] mx-auto mb-4 overflow-hidden ring-4 ring-amber-300/70 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
                <img
                  src="https://dinastiadelcachorro.com/wp-content/uploads/2024/11/Dinastia-del-Cachorro-Home-pomerania-mini-medellin.png"
                  alt="Pomerania"
                  className="w-full h-full object-cover"
                />
              </div>
              <Title className="font-black italic text-2xl tracking-tighter uppercase text-amber-200 drop-shadow">
                Gaby POS
              </Title>
              <Text className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                Licorera · Seguridad Total
              </Text>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Text className="text-[10px] font-black uppercase text-slate-300 mb-2 ml-1">Pin de Acceso</Text>
                <input 
                  type="password" 
                  maxLength={4}
                  value={pin}
                  onChange={(e) => { setError(false); setPin(e.target.value); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleIngresar()}
                  className={`w-full text-center text-3xl tracking-[1.5rem] p-4 bg-slate-900/70 rounded-2xl border-2 outline-none text-amber-100 placeholder-slate-600 transition-all ${
                    error ? 'border-red-500/80 bg-red-950/40' : 'border-slate-700 focus:border-amber-400'
                  }`}
                  autoFocus
                  placeholder="••••"
                />
              </div>

              {error && (
                <Text className="text-center text-red-400 font-bold text-[10px] uppercase">
                  Pin incorrecto, vuelve a intentarlo
                </Text>
              )}

              <button 
                onClick={handleIngresar}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:from-amber-400 hover:to-orange-400 transition-all active:scale-95 shadow-[0_15px_40px_rgba(251,191,36,0.45)]"
              >
                ENTRAR
              </button>
            </div>
          </div>

          <div className="hidden md:flex flex-col justify-between bg-gradient-to-b from-amber-200/90 via-amber-100/95 to-orange-200/90 p-4 pl-0 pr-6">
            <div className="mt-4 ml-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-900/70">
              Bienvenido
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-[0_18px_55px_rgba(0,0,0,0.45)] ring-4 ring-white/80">
                <img
                  src="https://png.pngtree.com/png-vector/20250724/ourmid/pngtree-adorable-fluffy-pomeranian-dog-with-happy-expression-and-tongue-out-png-image_16685452.webp"
                  alt="Pomerania sonriente"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="mb-4 text-[10px] text-amber-900/80 font-semibold uppercase tracking-widest text-right">
              Solo personal autorizado<br />Simon · Ana · Socio
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;