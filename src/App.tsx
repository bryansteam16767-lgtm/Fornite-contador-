import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Twitch, Timer, ExternalLink, Calendar, Bell, X, CheckCircle2, Clock, Radio, Sword, Trophy, Zap, User, Shield, LogIn, Power } from 'lucide-react';

export default function App() {
  const targetDate = new Date('2026-03-19T00:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [isCreatorAuthenticated, setIsCreatorAuthenticated] = useState(false);
  const [creatorEmail, setCreatorEmail] = useState<string | null>(null);
  const [manualStatus, setManualStatus] = useState<boolean | null>(null);
  const [reminderTime, setReminderTime] = useState('1h');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState<string | null>(null);
  const [streamGame, setStreamGame] = useState<string | null>(null);
  const [fortniteMode, setFortniteMode] = useState(false);

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      expired: false
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Fetch Twitch status periodically
    const checkTwitchStatus = async () => {
      try {
        const response = await fetch(`${window.location.origin}/api/twitch/status`);
        const data = await response.json();
        if (data.isLive !== undefined) {
          setIsLive(data.isLive);
          setStreamTitle(data.title);
          setStreamGame(data.game);
        }
      } catch (error) {
        console.error('Error fetching Twitch status:', error);
      }
    };

    checkTwitchStatus();
    const statusInterval = setInterval(checkTwitchStatus, 60000); // Check every minute

    // Check if creator is already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/auth/me`);
        const data = await res.json();
        if (data.authenticated) {
          setIsCreatorAuthenticated(true);
          setCreatorEmail(data.email);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };
    checkAuth();

    // Listen for OAuth success
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(timer);
      clearInterval(statusInterval);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/auth/google/url`);
      const { url } = await res.json();
      window.open(url, 'google_login', 'width=500,height=600');
    } catch (error) {
      console.error('Error getting Google Auth URL:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${window.location.origin}/api/auth/logout`, { method: 'POST' });
      setIsCreatorAuthenticated(false);
      setCreatorEmail(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleManualStatus = async (status: boolean | null) => {
    try {
      const response = await fetch(`${window.location.origin}/api/creator/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setManualStatus(status);
        // Trigger immediate status check using the existing function
        const statusRes = await fetch(`${window.location.origin}/api/twitch/status`);
        const statusData = await statusRes.json();
        setIsLive(statusData.isLive);
        setStreamTitle(statusData.title);
        setStreamGame(statusData.game);
      }
    } catch (error) {
      console.error('Error setting manual status:', error);
    }
  };

  const handleSubscribe = () => {
    setIsSubscribed(true);
    setTimeout(() => {
      setShowNotifyModal(false);
      setIsSubscribed(false);
    }, 2000);
  };

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <motion.div 
      layout
      className={`flex flex-col items-center p-4 backdrop-blur-md border rounded-2xl min-w-[100px] sm:min-w-[140px] transition-all duration-500 ${
        fortniteMode 
          ? 'bg-blue-600/80 border-yellow-400 border-4 -skew-x-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' 
          : 'bg-zinc-900/50 border-zinc-800'
      }`}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`text-4xl sm:text-6xl font-black font-mono transition-colors duration-500 ${
            fortniteMode ? 'text-white italic tracking-tighter' : 'text-purple-500'
          }`}
        >
          {value.toString().padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
      <span className={`text-xs sm:text-sm uppercase tracking-widest mt-2 font-black transition-colors duration-500 ${
        fortniteMode ? 'text-yellow-300 italic' : 'text-zinc-500'
      }`}>
        {label}
      </span>
    </motion.div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-700 flex flex-col items-center justify-center p-6 selection:bg-purple-500/30 overflow-x-hidden ${
      fortniteMode ? 'bg-[#1a2b4b]' : 'bg-black'
    }`}>
      {/* Fortnite Background Elements */}
      {fortniteMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#2a4b8d_0%,transparent_70%)] opacity-50" />
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-20 left-10 w-32 h-32 bg-yellow-400/10 blur-3xl rounded-full" 
          />
          <motion.div 
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full" 
          />
        </div>
      )}

      {/* Live Status Bar */}
      <AnimatePresence>
        {isLive && (
          <motion.a
            href="https://www.twitch.tv/bryan16767"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-4 group transition-all duration-500 ${
              fortniteMode ? 'bg-yellow-400 text-black border-b-4 border-black' : 'bg-[#9146FF] text-white'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${fortniteMode ? 'bg-black' : 'bg-white'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${fortniteMode ? 'bg-black' : 'bg-white'}`}></span>
                </div>
                <span className={`text-sm font-black uppercase tracking-tighter italic ${fortniteMode ? 'text-black' : ''}`}>
                  {fortniteMode ? '¡VICTORY ROYALE EN VIVO!' : 'En Directo Ahora'}
                </span>
              </div>
              
              {streamTitle && (
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className={`hidden sm:inline w-1 h-1 rounded-full ${fortniteMode ? 'bg-black/20' : 'bg-white/20'}`} />
                  <span className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md opacity-90">
                    {streamTitle} {streamGame && <span className="opacity-60 font-medium">| {streamGame}</span>}
                  </span>
                </div>
              )}
              
              {!streamTitle && (
                <span className="hidden sm:inline text-sm font-bold opacity-90">¡Bryan16767 está en el campo de batalla!</span>
              )}
            </div>
            <div className={`flex items-center gap-1 text-sm font-black px-2 py-0.5 rounded-md ${fortniteMode ? 'bg-black text-yellow-400' : 'bg-black/20'}`}>
              <span>VER AHORA</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </motion.a>
        )}
      </AnimatePresence>

      {/* Background Glow (Original) */}
      {!fortniteMode && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center"
      >
        {/* Fortnite Mode Toggle */}
        <button 
          onClick={() => setFortniteMode(!fortniteMode)}
          className={`mb-8 flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-500 ${
            fortniteMode 
              ? 'bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none' 
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-white'
          }`}
        >
          {fortniteMode ? <Zap className="w-4 h-4 fill-current" /> : <Sword className="w-4 h-4" />}
          {fortniteMode ? 'Modo Fortnite: ON' : 'Activar Modo Fortnite'}
        </button>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 transition-all duration-500 ${
          fortniteMode ? 'bg-blue-500 border-yellow-400 text-white font-black italic' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
        }`}>
          {fortniteMode ? <Trophy className="w-4 h-4 text-yellow-300" /> : <Calendar className="w-4 h-4 text-purple-500" />}
          <span className="text-sm">19 DE MARZO, 2026</span>
        </div>

        <h1 className={`text-5xl sm:text-8xl font-black tracking-tighter mb-4 transition-all duration-500 ${
          fortniteMode 
            ? 'text-white italic uppercase drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-110' 
            : 'bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent'
        }`}>
          {fortniteMode ? '¡TEMPORADA 19/3!' : 'El Gran Evento'}
        </h1>
        
        <p className={`text-lg mb-12 max-w-lg transition-colors duration-500 ${
          fortniteMode ? 'text-blue-200 font-bold italic uppercase' : 'text-zinc-400'
        }`}>
          {fortniteMode ? '¡Salta del autobús y prepárate para la acción!' : 'Prepárate para lo que viene. El contador está en marcha para el 19/3.'}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <TimeUnit value={timeLeft.days} label="Días" />
          <TimeUnit value={timeLeft.hours} label="Horas" />
          <TimeUnit value={timeLeft.minutes} label="Minutos" />
          <TimeUnit value={timeLeft.seconds} label="Segundos" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <a
            href="https://www.twitch.tv/bryan16767"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 group relative flex items-center justify-center gap-3 px-8 py-4 transition-all duration-500 rounded-2xl font-black text-lg overflow-hidden ${
              fortniteMode 
                ? 'bg-yellow-400 text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none' 
                : 'bg-[#9146FF] text-white hover:bg-[#7d38e0]'
            }`}
          >
            <div className="relative">
              <Twitch className="w-6 h-6" />
              {isLive && (
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border-2 animate-pulse ${
                  fortniteMode ? 'bg-red-600 border-yellow-400' : 'bg-red-500 border-[#9146FF]'
                }`} />
              )}
            </div>
            <span className={fortniteMode ? 'italic uppercase' : ''}>Ver en Twitch</span>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            {!fortniteMode && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
          </a>
          
          <button 
            onClick={() => setShowNotifyModal(true)}
            className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 transition-all duration-500 rounded-2xl font-black text-lg ${
              fortniteMode 
                ? 'bg-blue-500 text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none' 
                : 'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Timer className={`w-6 h-6 ${fortniteMode ? 'text-yellow-300' : 'text-purple-500'}`} />
            <span className={fortniteMode ? 'italic uppercase' : ''}>Notificarme</span>
          </button>
        </div>

        <footer className={`mt-24 text-sm flex flex-col items-center gap-6 transition-colors duration-500 ${
          fortniteMode ? 'text-blue-300 font-bold italic uppercase' : 'text-zinc-600'
        }`}>
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">Privacidad</span>
            <span className={`w-1 h-1 rounded-full ${fortniteMode ? 'bg-yellow-400' : 'bg-zinc-800'}`} />
            <span className="hover:text-white transition-colors cursor-pointer">Términos</span>
            <span className={`w-1 h-1 rounded-full ${fortniteMode ? 'bg-yellow-400' : 'bg-zinc-800'}`} />
            <span className="hover:text-white transition-colors cursor-pointer">© 2026 Bryan16767</span>
          </div>
          
          <button 
            onClick={() => setShowCreatorModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${
              fortniteMode 
                ? 'bg-black/40 border-yellow-400/30 text-yellow-400/60 hover:text-yellow-400 hover:border-yellow-400' 
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            MODO CREADOR
          </button>
        </footer>
      </motion.div>

      {/* Creator Mode Modal */}
      <AnimatePresence>
        {showCreatorModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreatorModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-md border rounded-3xl p-8 shadow-2xl transition-all duration-500 ${
                fortniteMode ? 'bg-blue-600 border-yellow-400 border-4' : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <button 
                onClick={() => setShowCreatorModal(false)}
                className={`absolute top-6 right-6 transition-colors ${fortniteMode ? 'text-yellow-300 hover:text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                <X className="w-6 h-6" />
              </button>

              {!isCreatorAuthenticated ? (
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    fortniteMode ? 'bg-yellow-400' : 'bg-purple-500/10'
                  }`}>
                    <Shield className={`w-8 h-8 ${fortniteMode ? 'text-black' : 'text-purple-500'}`} />
                  </div>
                  
                  <h2 className={`text-2xl font-black mb-2 ${fortniteMode ? 'text-white italic uppercase' : ''}`}>
                    Acceso Creador
                  </h2>
                  <p className={`mb-8 text-sm ${fortniteMode ? 'text-blue-100 font-bold italic uppercase' : 'text-zinc-400'}`}>
                    Inicia sesión con Google para gestionar el estado del directo. Solo el administrador tiene acceso.
                  </p>

                  <button
                    onClick={handleGoogleLogin}
                    className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-3 ${
                      fortniteMode ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    INICIAR SESIÓN CON GOOGLE
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    fortniteMode ? 'bg-emerald-400' : 'bg-emerald-500/10'
                  }`}>
                    <CheckCircle2 className={`w-8 h-8 ${fortniteMode ? 'text-black' : 'text-emerald-500'}`} />
                  </div>
                  
                  <h2 className={`text-2xl font-black mb-2 ${fortniteMode ? 'text-white italic uppercase' : ''}`}>
                    Panel de Control
                  </h2>
                  <p className={`mb-2 text-sm ${fortniteMode ? 'text-blue-100 font-bold italic uppercase' : 'text-zinc-400'}`}>
                    Gestiona manualmente el estado "En Directo".
                  </p>
                  <p className="mb-8 text-xs font-mono opacity-50">{creatorEmail}</p>

                  <div className="w-full space-y-3">
                    <button
                      onClick={() => toggleManualStatus(true)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        manualStatus === true 
                          ? 'bg-emerald-500 border-emerald-400 text-white' 
                          : (fortniteMode ? 'bg-blue-700 border-blue-500 text-blue-200' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Radio className="w-5 h-5" />
                        <span className="font-black italic uppercase">FORZAR EN DIRECTO</span>
                      </div>
                      {manualStatus === true && <CheckCircle2 className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => toggleManualStatus(false)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        manualStatus === false 
                          ? 'bg-red-500 border-red-400 text-white' 
                          : (fortniteMode ? 'bg-blue-700 border-blue-500 text-blue-200' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Power className="w-5 h-5" />
                        <span className="font-black italic uppercase">FORZAR OFFLINE</span>
                      </div>
                      {manualStatus === false && <CheckCircle2 className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => toggleManualStatus(null)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        manualStatus === null 
                          ? (fortniteMode ? 'bg-yellow-400 border-black text-black' : 'bg-purple-500 border-purple-400 text-white') 
                          : (fortniteMode ? 'bg-blue-700 border-blue-500 text-blue-200' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5" />
                        <span className="font-black italic uppercase">MODO AUTOMÁTICO (API)</span>
                      </div>
                      {manualStatus === null && <CheckCircle2 className="w-5 h-5" />}
                    </button>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="mt-8 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotifyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifyModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-md border rounded-3xl p-8 shadow-2xl transition-all duration-500 ${
                fortniteMode ? 'bg-blue-600 border-yellow-400 border-4 -skew-y-2' : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <button 
                onClick={() => setShowNotifyModal(false)}
                className={`absolute top-6 right-6 transition-colors ${fortniteMode ? 'text-yellow-300 hover:text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                  fortniteMode ? 'bg-yellow-400' : 'bg-purple-500/10'
                }`}>
                  <Bell className={`w-8 h-8 ${fortniteMode ? 'text-black' : 'text-purple-500'}`} />
                </div>
                
                <h2 className={`text-2xl font-black mb-2 ${fortniteMode ? 'text-white italic uppercase italic' : ''}`}>
                  {fortniteMode ? '¡ALERTA DE COMBATE!' : 'Preferencias de Notificación'}
                </h2>
                <p className={`mb-8 ${fortniteMode ? 'text-blue-100 font-bold italic uppercase' : 'text-zinc-400'}`}>
                  {fortniteMode ? '¡Elige tu momento de despliegue!' : 'Elige cuándo quieres recibir el recordatorio para el evento.'}
                </p>

                <div className="w-full space-y-3 mb-8">
                  {[
                    { id: 'start', label: 'Al empezar el evento', icon: fortniteMode ? Trophy : Clock },
                    { id: '1h', label: '1 hora antes', icon: Clock },
                    { id: '2h', label: '2 horas antes', icon: Clock },
                    { id: '1d', label: '1 día antes', icon: Clock },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setReminderTime(option.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        reminderTime === option.id 
                          ? (fortniteMode ? 'bg-yellow-400 border-black text-black' : 'bg-purple-500/10 border-purple-500 text-white') 
                          : (fortniteMode ? 'bg-blue-700 border-blue-500 text-blue-200 hover:bg-blue-500' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <option.icon className={`w-5 h-5 ${reminderTime === option.id ? (fortniteMode ? 'text-black' : 'text-purple-500') : 'text-zinc-500'}`} />
                        <span className={`font-black ${fortniteMode ? 'italic uppercase' : ''}`}>{option.label}</span>
                      </div>
                      {reminderTime === option.id && <CheckCircle2 className={`w-5 h-5 ${fortniteMode ? 'text-black' : 'text-purple-500'}`} />}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribed}
                  className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                    isSubscribed 
                      ? 'bg-emerald-500 text-white' 
                      : (fortniteMode ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-purple-500 hover:bg-purple-600 text-white')
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      <span className={fortniteMode ? 'italic uppercase' : ''}>¡LISTO PARA EL SALTO!</span>
                    </>
                  ) : (
                    <span className={fortniteMode ? 'italic uppercase' : ''}>GUARDAR EQUIPAMIENTO</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
