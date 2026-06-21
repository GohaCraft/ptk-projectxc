"use client";

import React from 'react';
import { Settings, Plus, Minus, RotateCw, Trash2, RefreshCw, Compass } from 'lucide-react';
import { CustomWall } from '../graphics/Scene3D';

interface WallEditorUIProps {
  hasStarted: boolean;
  isEditorCollapsed: boolean;
  setIsEditorCollapsed: (val: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  selectedWallId: string | null;
  setSelectedWallId: (val: string | null) => void;
  cameraMode: 'orbit' | 'top' | 'flight';
  setCameraMode: (val: 'orbit' | 'top' | 'flight') => void;
  customWalls: CustomWall[];
  originalWalls: CustomWall[];
  editorMessage: string | null;
  activeFloor: number;
  addWallBlock: 'B' | 'B1' | 'B2';
  setAddWallBlock: (val: 'B' | 'B1' | 'B2') => void;
  blueprintImage: string | null;
  setBlueprintImage: (val: string | null) => void;
  blueprintPdf?: string | null;
  setBlueprintPdf?: (val: string | null) => void;
  blueprintPdfPage?: number;
  setBlueprintPdfPage?: (val: number) => void;
  blueprintPdfTotalPage?: number;
  setBlueprintPdfTotalPage?: (val: number) => void;
  blueprintOpacity: number;
  setBlueprintOpacity: (val: number) => void;
  blueprintScale: number;
  setBlueprintScale: (val: number) => void;
  blueprintOffset: {x: number, z: number};
  setBlueprintOffset: (val: {x: number, z: number}) => void;
  blueprintHeightOffset: number;
  setBlueprintHeightOffset: (val: number) => void;
  showProceduralBlueprint: boolean;
  setShowProceduralBlueprint: (val: boolean) => void;
  showBlueprintFloor: boolean;
  setShowBlueprintFloor: (val: boolean) => void;
  isResetConfirming: boolean;
  addCustomWall: () => void;
  persistWalls: () => void;
  discardWallChanges: () => void;
  resizeSelectedWall: (dw: number) => void;
  rotateSelectedWall: () => void;
  moveSelectedWall: (dx: number, dz: number) => void;
  deleteSelectedWall: () => void;
  resetToDefaultLayout: () => void;
  
  // 50-point precision audit fields
  auditState: 'idle' | 'running' | 'success' | 'failed';
  auditProgress: number;
  auditRound: number;
  auditLogs: string[];
  startAlignmentAudit: () => void;
  repairedCount: number;
}

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Server side'));
      return;
    }
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => {
      const scriptFallback = document.createElement('script');
      scriptFallback.src = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.min.js';
      scriptFallback.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      scriptFallback.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(scriptFallback);
    };
    document.head.appendChild(script);
  });
};

const dataURIToArrayBuffer = (dataURI: string): ArrayBuffer => {
  const byteString = atob(dataURI.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return ab;
};

export default function WallEditorUI({
  hasStarted,
  isEditorCollapsed,
  setIsEditorCollapsed,
  isEditMode,
  setIsEditMode,
  selectedWallId,
  setSelectedWallId,
  cameraMode,
  setCameraMode,
  customWalls,
  originalWalls,
  editorMessage,
  activeFloor,
  addWallBlock,
  setAddWallBlock,
  blueprintImage,
  setBlueprintImage,
  blueprintPdf,
  setBlueprintPdf,
  blueprintPdfPage,
  setBlueprintPdfPage,
  blueprintPdfTotalPage,
  setBlueprintPdfTotalPage,
  blueprintOpacity,
  setBlueprintOpacity,
  blueprintScale,
  setBlueprintScale,
  blueprintOffset,
  setBlueprintOffset,
  blueprintHeightOffset,
  setBlueprintHeightOffset,
  showProceduralBlueprint,
  setShowProceduralBlueprint,
  showBlueprintFloor,
  setShowBlueprintFloor,
  isResetConfirming,
  addCustomWall,
  persistWalls,
  discardWallChanges,
  resizeSelectedWall,
  rotateSelectedWall,
  moveSelectedWall,
  deleteSelectedWall,
  resetToDefaultLayout,
  
  auditState,
  auditProgress,
  auditRound,
  auditLogs,
  startAlignmentAudit,
  repairedCount,
}: WallEditorUIProps) {

  // Real-time PDF / Image blueprint loading states
  const [pdfInstance, setPdfInstance] = React.useState<any>(null);
  const pdfPage = blueprintPdfPage || 1;
  const setPdfPage = setBlueprintPdfPage || (() => {});
  const totalPdfPages = blueprintPdfTotalPage || 1;
  const setTotalPdfPages = setBlueprintPdfTotalPage || (() => {});
  const [pdfFileBuffer, setPdfFileBuffer] = React.useState<ArrayBuffer | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState<boolean>(false);
  const [pdfFileName, setPdfFileName] = React.useState<string | null>(null);

  // Synchronize local ArrayBuffer with parent blueprintPdf when it shifts (e.g. on floor change or restore)
  React.useEffect(() => {
    if (blueprintPdf && blueprintPdf.startsWith('data:application/pdf')) {
      try {
        const buf = dataURIToArrayBuffer(blueprintPdf);
        setPdfFileBuffer(buf);
        
        loadPdfJs().then((pdfLib) => {
          setPdfInstance(pdfLib);
          renderPdfPage(pdfLib, buf, pdfPage);
        }).catch(err => {
          console.error("Failed to restore PDF.js instance:", err);
        });
      } catch (err) {
        console.error("Failed to restore PDF ArrayBuffer from DataURI:", err);
      }
    } else {
      if (!blueprintPdf) {
        setPdfFileBuffer(null);
        setPdfInstance(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintPdf, activeFloor]);

  const renderPdfPage = async (pdfLib: any, buffer: ArrayBuffer, pageNum: number) => {
    try {
      setPdfLoading(true);
      const loadingTask = pdfLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      setTotalPdfPages(pdf.numPages);
      
      const realPageNum = Math.min(Math.max(pageNum, 1), pdf.numPages);
      setPdfPage(realPageNum);

      const page = await pdf.getPage(realPageNum);
      const viewport = page.getViewport({ scale: 2.2 }); // high quality scale

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
        const dataUrl = canvas.toDataURL('image/png');
        setBlueprintImage(dataUrl);
      }
    } catch (err) {
      console.error("Ошибка рендеринга PDF:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  if (!hasStarted) return null;

  return (
    <div 
      id="wall_editor_container"
      className="absolute left-4 md:left-6 top-6 pointer-events-auto flex flex-col gap-3 z-10 w-80 animate-fade-in max-h-[85vh] overflow-y-auto pr-2 scrollbar-none select-none"
    >
      {/* 1. СОСТАВНОЙ РЕДАКТОР */}
      {isEditorCollapsed ? (
        <div className="bg-[#0c0d12]/92 backdrop-blur-3xl p-3 rounded-xl border border-slate-800/80 shadow-2xl text-slate-200 flex items-center justify-between gap-4 w-56 transition-all">
          <span className="font-mono text-[9.5px] text-slate-400 tracking-[0.16em] uppercase font-bold flex items-center gap-1.5 font-sans">
            <Settings id="settings_collapsed_icon" size={12} className="text-slate-500 animate-pulse" /> НАВИГАЦИЯ
          </span>
          <button
            id="btn_expand_editor"
            onClick={() => setIsEditorCollapsed(false)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-md text-[9px] font-mono font-medium tracking-wide transition-all uppercase cursor-pointer border border-slate-700/50"
          >
            Развернуть
          </button>
        </div>
      ) : (
        <div className="bg-[#0c0d12]/92 backdrop-blur-3xl p-3.5 rounded-xl border border-slate-800/80 shadow-2xl text-slate-200 w-56 transition-all">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="font-mono text-[9.5px] text-slate-300 tracking-[0.15em] uppercase font-bold flex items-center gap-1.5 font-sans">
              <Settings id="settings_expanded_icon" size={13} className="text-slate-500" /> НАВИГАЦИЯ
            </span>
            <button
              id="btn_collapse_editor"
              onClick={() => setIsEditorCollapsed(true)}
              className="px-2 py-0.5 bg-transparent hover:bg-slate-800 text-slate-550 text-slate-400 hover:text-slate-300 rounded text-[9px] font-mono font-bold transition-all border border-slate-800/60 cursor-pointer"
              title="Свернуть панель"
            >
              Свернуть
            </button>
          </div>

          {/* Ракурс Камеры (Три кнопки) — порядок: 3D Орбита → 2D → Облёт */}
          <div className="flex flex-col gap-1.5">
            <button
              id="btn_camera_orbit"
              onClick={() => setCameraMode('orbit')}
              className={`w-full text-[10px] font-mono py-1.5 rounded transition-all cursor-pointer text-center font-bold font-sans ${
                cameraMode === 'orbit'
                  ? 'bg-slate-200 text-slate-900 border border-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 bg-[#121319]'
              }`}
            >
              3D Орбита
            </button>
            <button
              id="btn_camera_top"
              onClick={() => setCameraMode('top')}
              className={`w-full text-[10px] font-mono py-1.5 rounded transition-all cursor-pointer text-center font-bold font-sans ${
                cameraMode === 'top'
                  ? 'bg-slate-200 text-slate-900 border border-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 bg-[#121319]'
              }`}
            >
              2D Сверху
            </button>
            <button
              id="btn_camera_flight"
              onClick={() => setCameraMode('flight')}
              className={`w-full text-[10px] font-mono py-1.5 rounded transition-all cursor-pointer text-center font-bold font-sans ${
                cameraMode === 'flight'
                  ? 'bg-slate-200 text-slate-900 border border-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 bg-[#121319]'
              }`}
            >
              Облёт
            </button>
          </div>

          {/* Статус */}
          {editorMessage && (
            <div id="editor_notification" className="mt-2.5 p-1.5 bg-[#121319] border border-slate-800/80 text-slate-400 text-[9px] rounded font-mono">
              {editorMessage}
            </div>
          )}
        </div>
      )}

      {/* Панель инструментов конструктора (только если активен) */}
      {isEditMode && !isEditorCollapsed && (
        <div className="bg-[#0c0d12]/92 backdrop-blur-3xl p-3.5 rounded-xl border border-slate-800/80 shadow-2xl text-slate-200 flex flex-col gap-2.5 animate-fade-in">
          {activeFloor === 5 ? (
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-slate-400 text-[10px] font-mono leading-relaxed">
              ⚠️ Выберите этаж (1-4) для редактирования внутренних перегородок здания.
            </div>
          ) : (
            <>
              {/* Кнопки СОХРАНИТЬ / ОТМЕНИТЬ */}
              <div className="bg-[#121319] p-2 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-slate-350 uppercase tracking-wider font-bold">СОСТОЯНИЕ СЦЕНЫ:</span>
                  {JSON.stringify(customWalls) !== JSON.stringify(originalWalls) && (
                    <span id="label_unsaved_indicator" className="text-[7.5px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                      Есть изменения
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    id="btn_persist_walls"
                    onClick={persistWalls}
                    className="bg-slate-100 hover:bg-white text-slate-950 font-mono font-bold py-1 px-1.5 rounded text-[9.5px] transition-all cursor-pointer text-center"
                  >
                    Сохранить
                  </button>
                  <button
                    id="btn_discard_walls"
                    onClick={discardWallChanges}
                    className="bg-transparent hover:bg-slate-800 text-slate-250 hover:text-white font-mono py-1 px-1.5 rounded text-[9.5px] transition-all cursor-pointer text-center border border-slate-800"
                  >
                    Отменить
                  </button>
                </div>
              </div>

              {/* ДОБАВИТЬ ПЕРЕГОРОДКУ */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/50">
                <span className="text-[8px] font-mono text-slate-350 uppercase tracking-widest block font-bold">1. СОЗДАТЬ:</span>
                <div className="flex items-center gap-1 p-0.5 bg-[#121319] rounded border border-slate-850">
                  {(['B', 'B1', 'B2'] as const).map((block) => (
                    <button
                      key={block}
                      id={`btn_block_type_${block}`}
                      onClick={() => setAddWallBlock(block)}
                      className={`flex-1 text-[9px] font-mono py-0.5 rounded transition-all cursor-pointer font-medium ${
                        addWallBlock === block
                          ? 'bg-slate-800 text-white border border-slate-705'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Блок {block}
                    </button>
                  ))}
                </div>
                <button
                  id="btn_add_custom_wall"
                  onClick={addCustomWall}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-1 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-700"
                >
                  <Plus size={11} className="text-slate-300" /> Добавить стену ({activeFloor} эт)
                </button>
              </div>

              {/* УПРАВЛЕНИЕ СТЕНОЙ */}
              <div className="border-t border-slate-800/50 pt-2 flex flex-col gap-2">
                <span className="text-[8px] font-mono text-slate-350 uppercase tracking-widest block font-bold">2. ВЫДЕЛЕННАЯ СТЕНА:</span>
                
                {!selectedWallId ? (
                  <div className="p-2 text-center border border-dashed border-slate-800/80 rounded text-slate-300 text-[8.5px] font-mono bg-[#121319]/45 font-medium">
                    Кликните стену в 2D/3D для редактирования
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[9px] font-mono bg-[#121319] p-1.5 rounded border border-slate-850">
                      <span className="text-slate-450 text-slate-300">ID элемента:</span>
                      <span className="text-white font-extrabold font-mono">#{selectedWallId.slice(-6)}</span>
                    </div>

                    {/* Длина */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] text-slate-350 font-mono">Протяженность:</span>
                      <div className="flex items-center gap-1">
                        <button
                          id="btn_resize_minus"
                          onClick={() => resizeSelectedWall(-0.1)}
                          className="w-6 h-6 rounded border border-slate-750 bg-[#121319] hover:bg-slate-800 hover:text-white flex items-center justify-center text-slate-200 cursor-pointer"
                        >
                          <Minus size={10} />
                        </button>
                        <span id="wall_length_display" className="flex-1 text-center font-mono text-[10.5px] bg-[#121319] py-0.5 rounded border border-slate-850 text-white font-semibold">
                          {((customWalls.find(w => w.id === selectedWallId)?.w || 0) >= (customWalls.find(w => w.id === selectedWallId)?.d || 0)
                            ? customWalls.find(w => w.id === selectedWallId)?.w
                            : customWalls.find(w => w.id === selectedWallId)?.d
                          )?.toFixed(1)} м
                        </span>
                        <button
                          id="btn_resize_plus"
                          onClick={() => resizeSelectedWall(0.1)}
                          className="w-6 h-6 rounded border border-slate-750 bg-[#121319] hover:bg-slate-800 hover:text-white flex items-center justify-center text-slate-200 cursor-pointer"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Разворот */}
                    <button
                      id="btn_rotate_wall"
                      onClick={rotateSelectedWall}
                      className="w-full bg-[#121319] hover:bg-slate-800 text-white py-1 rounded text-[9.5px] font-mono flex items-center justify-center gap-1 border border-slate-800 transition-all cursor-pointer"
                    >
                      <RotateCw size={10} className="text-slate-300" /> Развернуть на 90°
                    </button>

                    {/* Смещение */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-slate-350 font-mono text-center">Смещение в плоскости:</span>
                      <div className="grid grid-cols-3 gap-0.5 max-w-[95px] mx-auto">
                        <div />
                        <button onClick={() => moveSelectedWall(0, -0.1)} className="bg-[#121319] hover:bg-slate-800 border border-slate-800 text-white py-0.5 rounded text-[9.5px] font-bold flex justify-center items-center cursor-pointer">W</button>
                        <div />
                        <button onClick={() => moveSelectedWall(-0.1, 0)} className="bg-[#121319] hover:bg-slate-800 border border-slate-800 text-white py-0.5 rounded text-[9.5px] font-bold flex justify-center items-center cursor-pointer">A</button>
                        <button onClick={() => moveSelectedWall(0, 0.1)} className="bg-[#121319] hover:bg-slate-800 border border-slate-800 text-white py-0.5 rounded text-[9.5px] font-bold flex justify-center items-center cursor-pointer">S</button>
                        <button onClick={() => moveSelectedWall(0.1, 0)} className="bg-[#121319] hover:bg-slate-800 border border-slate-800 text-white py-0.5 rounded text-[9.5px] font-bold flex justify-center items-center cursor-pointer">D</button>
                      </div>
                    </div>

                    {/* Удаление */}
                    <button
                      id="btn_delete_wall"
                      onClick={deleteSelectedWall}
                      className="w-full bg-[#351214] border border-red-900/50 hover:bg-red-950 text-red-200 py-1 px-1.5 rounded text-[9.5px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Trash2 size={10} className="text-red-400" /> Удалить элемент
                    </button>
                  </>
                )}
              </div>

              {/* 3. ВЫСОКОТОЧНЫЙ 50-ТОЧЕЧНЫЙ КОНТРОЛЬ СООСНОСТИ */}
              <div className="border-t border-slate-800/50 pt-2 flex flex-col gap-2">
                <span className="text-[8px] font-mono text-slate-350 uppercase tracking-widest block font-bold">
                  3. КОНТРОЛЬ СООСНОСТИ (50 ТОЧЕК):
                </span>
                
                {auditState === 'idle' ? (
                  <button
                    onClick={startAlignmentAudit}
                    className="w-full bg-[#1e1b4b] hover:bg-[#312e81] border border-[#4338ca]/80 text-indigo-200 py-1.5 px-2 rounded-lg text-[9.5px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Compass size={11} className="text-indigo-400 rotate-12" /> Сверить соосность (50 раз)
                  </button>
                ) : (
                  <div className="bg-[#090d16] border border-indigo-950/70 p-2.5 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="text-indigo-300 font-semibold">Итерация контроля:</span>
                      <span className="text-white font-black px-1.5 py-0.5 bg-indigo-900/40 rounded">Круг #{auditRound}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8.5px] font-mono">
                        <span className="text-slate-400">Проверено точек:</span>
                        <span className="text-[#38bdf8] font-bold">{auditProgress} / 50</span>
                      </div>
                      <div className="w-full h-1 bg-[#121319] rounded-full overflow-hidden border border-slate-850">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-[#38bdf8] rounded-full transition-all duration-75"
                          style={{ width: `${(auditProgress / 50) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Log Terminal */}
                    <div className="bg-black/95 rounded border border-slate-900/60 p-1.5 h-20 overflow-y-auto scrollbar-none space-y-1 font-mono">
                      {auditLogs.map((log, lIdx) => (
                        <div key={lIdx} className={`text-[7.5px] leading-tight ${log.includes('⚠️') ? 'text-rose-400' : log.includes('🟢') || log.includes('🎉') ? 'text-emerald-400' : 'text-slate-350'}`}>
                          {log}
                        </div>
                      ))}
                    </div>

                    {/* Status Info */}
                    <div className="flex items-center justify-between text-[8px] font-mono pt-1 border-t border-slate-900/50">
                      <span className="text-[#94a3b8]">Исправлено отклонений:</span>
                      <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${repairedCount > 0 ? 'text-amber-400 bg-amber-950/40 border border-amber-800/20' : 'text-emerald-400 bg-emerald-950/40'}`}>
                        {repairedCount} ед. (Автофикс)
                      </span>
                    </div>

                    {auditState === 'running' && (
                      <div className="flex items-center justify-center gap-1.5 py-1 bg-indigo-950/20 rounded border border-indigo-900/20">
                        <div className="w-2 h-2 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[8px] text-indigo-300 font-mono tracking-widest font-bold uppercase animate-pulse">Идет сканирование...</span>
                      </div>
                    )}

                    {auditState === 'success' && (
                      <div className="space-y-1">
                        <div className="p-1 px-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-350 text-[8.5px] font-semibold text-center rounded font-mono">
                          🟢 Идеальная соосность 50/50 (100%)
                        </div>
                        <button
                          onClick={startAlignmentAudit}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-[8px] text-slate-400 py-1 rounded font-mono border border-slate-800 cursor-pointer"
                        >
                          Перепроверить еще раз
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ЧЕРТЕЖ ПОДОСНОВЫ */}
              <div className="border-t border-slate-800/50 pt-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[8px] font-mono text-slate-350 uppercase tracking-widest block font-bold">
                    3. ЧЕРТЁЖ-ПОДЛОЖКА (PDF / ФОТО):
                  </div>
                  
                  {/* Procedural Layout Toggle Checkbox */}
                  <div className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 px-1.5 py-0.5 rounded cursor-pointer select-none border border-slate-800">
                    <input
                      type="checkbox"
                      id="toggle_procedural_layout"
                      checked={showProceduralBlueprint}
                      onChange={(e) => setShowProceduralBlueprint(e.target.checked)}
                      className="h-2.5 w-2.5 rounded border-slate-700 bg-slate-900 text-slate-400 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="toggle_procedural_layout" className="text-[8.5px] text-slate-300 font-mono cursor-pointer select-none">
                      Сетка/Разметка чертежа
                    </label>
                  </div>
                  {/* Чертёж БТИ на полу */}
                  <div className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 px-1.5 py-0.5 rounded cursor-pointer select-none border border-blue-900/50">
                    <input
                      type="checkbox"
                      id="toggle_blueprint_floor"
                      checked={showBlueprintFloor}
                      onChange={(e) => setShowBlueprintFloor(e.target.checked)}
                      className="h-2.5 w-2.5 rounded border-slate-700 bg-slate-900 text-blue-400 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="toggle_blueprint_floor" className="text-[8.5px] text-blue-300 font-mono cursor-pointer select-none">
                      Чертёж БТИ на полу (1-4 эт.)
                    </label>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    id="blueprint_upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPdfFileName(file.name);
                        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                          try {
                            setPdfLoading(true);
                            const pdfLib = await loadPdfJs();
                            setPdfInstance(pdfLib);
                            
                            const reader = new FileReader();
                            reader.onload = async (re) => {
                              const arrayBuffer = re.target?.result as ArrayBuffer;
                              setPdfFileBuffer(arrayBuffer);
                              
                              // Convert PDF file to base64 for R3F Canvas / react-pdf integration
                              const b64Reader = new FileReader();
                              b64Reader.onload = (b64e) => {
                                const b64Data = b64e.target?.result as string;
                                if (setBlueprintPdf) {
                                  setBlueprintPdf(b64Data);
                                }
                              };
                              b64Reader.readAsDataURL(file);

                              await renderPdfPage(pdfLib, arrayBuffer, 1);
                            };
                            reader.readAsArrayBuffer(file);
                          } catch (err) {
                            console.error("Не удалось инициализировать PDF.js:", err);
                            setPdfLoading(false);
                          }
                        } else {
                          // Regular image loading
                          setPdfInstance(null);
                          setPdfFileBuffer(null);
                          if (setBlueprintPdf) {
                            setBlueprintPdf(null);
                          }
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            setBlueprintImage(re.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById('blueprint_upload')?.click()}
                    className="w-full bg-[#121319]/90 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white py-1.5 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition-all cursor-pointer font-bold"
                  >
                    {blueprintImage ? '🔄 Заменить подложку/PDF' : '📁 Загрузить чертёж-подложку (PDF/Photo)'}
                  </button>

                  {pdfLoading && (
                    <div className="text-[9px] font-mono text-amber-400 bg-amber-950/20 py-1 px-2 rounded border border-amber-900/40 animate-pulse text-center">
                      ⏳ Загрузка и рендеринг PDF-чертежа...
                    </div>
                  )}

                  {blueprintImage && (
                    <div className="bg-[#121319] p-2 rounded border border-slate-850 space-y-2">
                      
                      {/* PDF Page Selection block */}
                      {pdfInstance && (
                        <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60 flex flex-col gap-1">
                          <span className="text-[8px] text-slate-400 font-mono text-center truncate italic" title={pdfFileName || ""}>
                            PDF: {pdfFileName || "чертёж"}
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <button 
                              onClick={async () => {
                                if (pdfPage > 1 && pdfFileBuffer) {
                                  const prevPage = pdfPage - 1;
                                  setPdfPage(prevPage);
                                  await renderPdfPage(pdfInstance, pdfFileBuffer, prevPage);
                                }
                              }}
                              disabled={pdfPage <= 1 || pdfLoading}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-white rounded font-mono text-[8.5px] cursor-pointer font-bold leading-none"
                            >
                              &larr; Назад
                            </button>
                            <span className="text-[9px] text-slate-200 font-mono font-bold">
                              Стр {pdfPage} из {totalPdfPages}
                            </span>
                            <button 
                              onClick={async () => {
                                if (pdfPage < totalPdfPages && pdfFileBuffer) {
                                  const nextPage = pdfPage + 1;
                                  setPdfPage(nextPage);
                                  await renderPdfPage(pdfInstance, pdfFileBuffer, nextPage);
                                }
                              }}
                              disabled={pdfPage >= totalPdfPages || pdfLoading}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-white rounded font-mono text-[8.5px] cursor-pointer font-bold leading-none"
                            >
                              Вперёд &rarr;
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-[8.5px] text-slate-350 font-mono w-14 font-semibold">Прозрач.</span>
                        <input 
                          type="range" min="0.1" max="1" step="0.1" 
                          value={blueprintOpacity} 
                          onChange={(e) => setBlueprintOpacity(Number(e.target.value))}
                          className="flex-1 h-0.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-slate-300"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1 bg-slate-950/20 p-1.5 rounded border border-slate-850">
                        <div className="flex items-center justify-between">
                          <span className="text-[8.5px] text-slate-350 font-mono font-semibold">Масштаб</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setBlueprintScale(blueprintScale - 0.005)} className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[9px] text-white hover:bg-slate-700 cursor-pointer font-semibold">-0.005</button>
                            <button onClick={() => setBlueprintScale(blueprintScale - 0.001)} className="px-1 py-0.5 bg-slate-850 rounded font-mono text-[8px] text-white hover:bg-slate-750 cursor-pointer font-semibold">-0.001</button>
                            <span className="text-[9.5px] text-emerald-400 font-mono w-14 text-center font-bold">{(blueprintScale * 100).toFixed(3)}%</span>
                            <button onClick={() => setBlueprintScale(blueprintScale + 0.001)} className="px-1 py-0.5 bg-slate-850 rounded font-mono text-[8px] text-white hover:bg-slate-750 cursor-pointer font-semibold">+0.001</button>
                            <button onClick={() => setBlueprintScale(blueprintScale + 0.005)} className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[9px] text-white hover:bg-slate-700 cursor-pointer font-semibold">+0.005</button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 items-center mt-1.5 border-t border-slate-800/80 pt-1.5">
                        <span className="text-[8px] text-slate-350 font-mono text-center">Смещение:</span>
                        <div className="grid grid-cols-3 gap-0.5 max-w-[170px] mx-auto w-full">
                          <button onClick={() => setBlueprintOffset({ x: blueprintOffset.x - 0.1, z: blueprintOffset.z })} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-0.5 rounded text-[8.5px] cursor-pointer">&larr; X (-0.1m)</button>
                          <div className="flex items-center justify-center gap-0.5 bg-slate-800 rounded border border-slate-750">
                            <button onClick={() => setBlueprintOffset({ x: blueprintOffset.x, z: blueprintOffset.z - 0.1 })} className="px-1 py-0.5 hover:bg-slate-700 text-white rounded text-[8.5px] cursor-pointer">&uarr;</button>
                            <button onClick={() => setBlueprintOffset({ x: blueprintOffset.x, z: blueprintOffset.z + 0.1 })} className="px-1 py-0.5 hover:bg-slate-700 text-white rounded text-[8.5px] cursor-pointer">&darr;</button>
                          </div>
                          <button onClick={() => setBlueprintOffset({ x: blueprintOffset.x + 0.1, z: blueprintOffset.z })} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-0.5 rounded text-[8.5px] cursor-pointer">X &rarr; (+0.1m)</button>
                        </div>
                        <div className="grid grid-cols-3 gap-0.5 max-w-[170px] mx-auto w-full mt-0.5">
                          <button onClick={() => setBlueprintOffset({ x: blueprintOffset.x - 1.0, z: blueprintOffset.z })} className="bg-slate-850 hover:bg-slate-750 text-slate-300 py-0.5 rounded text-[8px] cursor-pointer">&larr;&larr; (-1.0m)</button>
                          <span className="text-[8px] text-slate-400 font-mono text-center flex items-center justify-center">Грубое</span>
                          <button onClick={() => setBlueprintOffset({ x: blueprintOffset.x + 1.0, z: blueprintOffset.z })} className="bg-slate-850 hover:bg-slate-750 text-slate-300 py-0.5 rounded text-[8px] cursor-pointer">(+1.0m) &rarr;&rarr;</button>
                        </div>
                      </div>

                      {/* Blueprint Height Y Adjustment and Snapping controls */}
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-800/80">
                        <span className="text-[8px] text-slate-350 font-mono font-semibold">Высота Y:</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setBlueprintHeightOffset(blueprintHeightOffset - 0.1)} className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-[8px] cursor-pointer">-0.1м</button>
                          <span className="text-[8.5px] text-white font-mono w-[48px] text-center font-bold">{(blueprintHeightOffset >= 0 ? '+' : '')}{blueprintHeightOffset.toFixed(2)}м</span>
                          <button onClick={() => setBlueprintHeightOffset(blueprintHeightOffset + 0.1)} className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-[8px] cursor-pointer">+0.1м</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 mt-1 pt-0.5">
                        <button 
                          onClick={() => setBlueprintHeightOffset(0)}
                          className={`text-[7.5px] font-mono py-0.5 px-0.5 rounded border border-slate-800 cursor-pointer leading-tight ${blueprintHeightOffset === 0 ? 'bg-slate-800 border-slate-705 text-white font-bold' : 'bg-transparent text-slate-400 hover:text-slate-300'}`}
                          title="Выровнять по полу Лит. Б"
                        >
                          Лит. Б (0.0м)
                        </button>
                        <button 
                          onClick={() => setBlueprintHeightOffset((activeFloor - 1) * 0.4)}
                          className={`text-[7.5px] font-mono py-0.5 px-0.5 rounded border border-slate-800 cursor-pointer leading-tight ${Math.abs(blueprintHeightOffset - (activeFloor - 1) * 0.4) < 0.05 ? 'bg-slate-800 border-slate-705 text-white font-bold' : 'bg-transparent text-slate-400 hover:text-slate-300'}`}
                          title="Выровнять по полу Лит. Б1/Б2"
                        >
                          Лит. Б1/Б2 (+{((activeFloor - 1) * 0.4).toFixed(1)}м)
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setBlueprintImage(null);
                          setPdfInstance(null);
                          setPdfFileBuffer(null);
                          setPdfFileName(null);
                        }}
                        className="w-full mt-1 bg-transparent hover:bg-red-950/20 text-red-400 py-0.5 rounded text-[8.5px] font-mono cursor-pointer border border-red-950/40"
                      >
                        Удалить подложку
                      </button>
                    </div>
                  )}
                </div>

                <button
                  id="btn_reset_to_default_layout"
                  onClick={resetToDefaultLayout}
                  className={`w-full py-1 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isResetConfirming
                      ? 'bg-red-950 border border-red-800 text-red-200 animate-pulse'
                      : 'bg-transparent border border-slate-800 hover:bg-slate-850 text-slate-350 hover:text-white'
                  }`}
                >
                  <RefreshCw size={9} className={isResetConfirming ? "animate-spin" : ""} />
                  {isResetConfirming ? 'НАЖМИТЕ ЕЩЁ РАЗ ДЛЯ СБРОСА!' : 'Сбросить изменения к оригиналу'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}