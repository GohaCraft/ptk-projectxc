"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class WebGLBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("WebGLBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isWebGLRelated = 
        this.state.error?.message?.toLowerCase().includes('webgl') || 
        this.state.error?.message?.toLowerCase().includes('context') ||
        this.state.error?.message?.toLowerCase().includes('renderer');

      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#0d0f14] p-6 text-[#EFEFED] overflow-y-auto">
          <div className="max-w-md w-full bg-[#151922] border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
            
            {/* Ambient Background Glow for Aesthetic Feel */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-5 animate-pulse">
                <AlertTriangle size={28} />
              </div>

              <h2 className="font-sans font-bold text-xl md:text-2xl text-white tracking-tight mb-2 leading-tight">
                {isWebGLRelated ? 'Сбой инициализации WebGL' : 'Ошибка рендеринга сцены'}
              </h2>
              
              <p className="font-mono text-[10.5px] text-slate-400 mb-6 bg-[#090b0e] border border-slate-800/80 px-3 py-2.5 rounded-lg w-full text-left break-all overflow-x-auto max-h-24">
                <code>{this.state.error?.toString() || 'Unknown rendering error'}</code>
              </p>

              <div className="w-full text-left font-sans text-xs text-slate-300 space-y-3 border-t border-slate-800/80 pt-5 mb-6">
                <div className="flex gap-2">
                  <span className="text-[#005C9E] font-bold font-mono">1.</span>
                  <span>Возник дефицит видеопамяти или сбой графического процессора в браузере (WebGL context lost).</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#005C9E] font-bold font-mono">2.</span>
                  <span>Нажмите кнопку <b>«Попробовать снова»</b> для перезапуска 3D холста без перезагрузки всей страницы.</span>
                </div>
                <div className="flex gap-2 font-medium">
                  <span className="text-[#005C9E] font-bold font-mono">3.</span>
                  <span>Если не помогло, переоткройте вкладку или включите «Аппаратное ускорение» (Hardware Acceleration) в настройках вашего браузера.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2.5 bg-[#005C9E] hover:bg-[#0070c0] font-sans text-xs font-bold text-white rounded-xl transition-all duration-200 border border-[#005C9E] flex items-center justify-center gap-1.5 shadow-lg shadow-[#005C9E]/15 cursor-pointer"
                >
                  <RefreshCw size={13} className="animate-spin-hover" />
                  Попробовать снова
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-sans text-xs font-bold text-slate-200 rounded-xl transition-all duration-200 border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight size={13} />
                  Обновить страницу
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-6 hover:text-slate-200 transition-colors cursor-help">
                <HelpCircle size={11} className="text-slate-400" />
                <span>Нажмите F12 для просмотра консоли разработчика</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
