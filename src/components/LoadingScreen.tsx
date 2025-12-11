"use client";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  spinnerColor?: string;
  backgroundColor?: string;
}

export function LoadingScreen({
  title = "Cargando...",
  subtitle = "Por favor espera",
  icon = "🎄",
  spinnerColor = "border-yellow-400",
  backgroundColor = "bg-[#0E0606]"
}: LoadingScreenProps) {
  return (
    <div className={`min-h-screen ${backgroundColor} text-white px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-12 relative overflow-hidden flex flex-col`}>
      {/* Elementos decorativos navideños - ocultos en móviles pequeños */}
      <div className="hidden sm:block absolute top-10 left-4 md:left-10 text-yellow-400/20 text-2xl md:text-4xl animate-pulse">🎄</div>
      <div className="hidden sm:block absolute top-20 right-4 md:right-16 text-red-400/20 text-xl md:text-3xl animate-pulse delay-1000">🎁</div>
      <div className="hidden md:block absolute bottom-20 left-4 md:left-20 text-green-400/20 text-lg md:text-2xl animate-pulse delay-500">❄️</div>
      <div className="hidden md:block absolute bottom-32 right-4 md:right-10 text-blue-400/20 text-xl md:text-3xl animate-pulse delay-1500">⭐</div>

      <div className="flex-1 flex flex-col justify-center max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto relative z-10 w-full">
        <div className="text-center space-y-4 mb-6">
          <div className="inline-block p-4 bg-gradient-to-r from-yellow-500/20 to-red-500/20 rounded-full">
            <div className="text-4xl">{icon}</div>
          </div>
          <div className="space-y-3">
            <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${spinnerColor} mx-auto`}></div>
            <p className="text-white/80 text-base">{title}</p>
            <p className="text-white/60 text-sm">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}