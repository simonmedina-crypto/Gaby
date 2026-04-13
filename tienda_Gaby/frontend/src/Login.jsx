import React, { useState } from 'react';
import { Card, Title, Text } from "@tremor/react";
import { Lock, Crown, Dog } from 'lucide-react';

const USUARIOS_AUTORIZADOS = [
  { id: 1, nombre: "Simon", pin: "1234", rol: "Administrador" },
  { id: 2, nombre: "Ana", pin: "0000", rol: "Vendedor" },
  { id: 3, nombre: "Socio", pin: "5555", rol: "Administrador" }
];

const Login = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);

  const handleIngresar = () => {
    const usuario = USUARIOS_AUTORIZADOS.find(u => u.pin === pin);
    if (usuario) {
      // Sonido de éxito
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.3;
      audio.play().catch(() => {});
      
      onLoginSuccess(usuario);
      setError(false);
      setPin("");
    } else {
      setError(true);
      setPin("");
      // Sonido de error
      const audioError = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audioError.volume = 0.3;
      audioError.play().catch(() => {});
      
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-orange-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-200/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-xl border-4 border-yellow-400/50 shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Header con logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <Title className="font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    Licorera
                  </Title>
                  <Title className="font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                    Gaby
                  </Title>
                </div>
              </div>
              <Text className="text-yellow-700 font-medium text-sm">
                Sistema de Control de Inventario
              </Text>
            </div>

            {/* Formulario de login */}
            <div className="space-y-6">
              <div className="relative">
                <Text className="text-yellow-700 font-bold text-sm uppercase tracking-wider mb-3 block text-center">
                  Ingrese su PIN de Acceso
                </Text>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-600 w-5 h-5" />
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => { setError(false); setPin(e.target.value); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleIngresar()}
                    className={`w-full text-center text-3xl tracking-[1.5rem] p-4 bg-white/90 border-4 rounded-2xl outline-none transition-all placeholder-yellow-400 ${
                      error 
                        ? 'border-red-500/80 bg-red-50/50 text-red-600' 
                        : 'border-yellow-400/50 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20 text-yellow-800'
                    }`}
                    autoFocus
                    placeholder="••••"
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 text-center">
                  <Text className="text-red-600 font-medium text-sm">
                    PIN incorrecto. Por favor, intente nuevamente.
                  </Text>
                </div>
              )}

              {/* Botón de ingreso */}
              <button
                onClick={handleIngresar}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white py-4 rounded-2xl font-bold text-lg uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Ingresar al Sistema
              </button>

              {/* Botón de ayuda */}
              <button
                onClick={() => setMostrarAyuda(!mostrarAyuda)}
                className="w-full text-yellow-600 hover:text-yellow-700 font-medium text-sm underline transition-colors"
              >
                {mostrarAyuda ? 'Ocultar ayuda' : 'Mostrar ayuda'}
              </button>
            </div>

            {/* Panel de ayuda */}
            {mostrarAyuda && (
              <div className="mt-6 p-4 bg-yellow-50/50 border border-yellow-200 rounded-2xl">
                <Text className="text-yellow-700 font-medium mb-3">
                  Usuarios Autorizados:
                </Text>
                <div className="space-y-2">
                  {USUARIOS_AUTORIZADOS.map((usuario) => (
                    <div key={usuario.id} className="flex justify-between items-center p-3 bg-white/70 rounded-xl border border-yellow-300">
                      <div>
                        <Text className="font-medium text-yellow-800">{usuario.nombre}</Text>
                        <Text className="text-yellow-600 text-sm">({usuario.rol})</Text>
                      </div>
                      <Text className="text-yellow-600 font-mono text-sm">
                        PIN: {usuario.pin}
                      </Text>
                    </div>
                  ))}
                </div>
                <Text className="text-yellow-600 text-xs mt-3 text-center">
                  Nota: Mantenga sus PIN seguros y no los comparta con personas no autorizadas.
                </Text>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-yellow-200">
            <div className="flex items-center justify-center gap-2">
              <Dog className="w-4 h-4 text-yellow-600" />
              <Text className="text-yellow-600 text-xs">
                Licorera Gaby 2024 - Sistema Seguro
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;