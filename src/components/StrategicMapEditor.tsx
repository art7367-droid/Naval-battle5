import { useState, useRef } from 'react';
import { StrategicMapData } from '../types/shipDatabase';
import { saveToIndexedDB, deleteFromIndexedDB } from '../utils/indexedDB';

interface StrategicMapEditorProps { strategicMapData?: StrategicMapData; onUpdate: (data: StrategicMapData) => void; }

export default function StrategicMapEditor({ strategicMapData, onUpdate }: StrategicMapEditorProps) {
  const [mapTiles, setMapTiles] = useState<Array<{ id: number; imageData: string; row: number; col: number }>>(strategicMapData?.tiles || []);
  const mapWidth = strategicMapData?.mapWidth || 9703;
  const mapHeight = strategicMapData?.mapHeight || 7767;
  const cols = 7; const rows = 6;
  const standardTileWidth = 1500; const standardTileHeight = 1500;
  const lastColumnWidth = 703; const lastRowHeight = 267;
  const getTileSize = (tileId: number) => { const row = Math.floor(tileId / cols); const col = tileId % cols; return { width: col === 6 ? lastColumnWidth : standardTileWidth, height: row === 5 ? lastRowHeight : standardTileHeight }; };
  const getTilePosition = (tileId: number) => { const row = Math.floor(tileId / cols); const col = tileId % cols; let x = 0; for (let c = 0; c < col; c++) x += (c === 6 ? lastColumnWidth : standardTileWidth); let y = 0; for (let r = 0; r < row; r++) y += (r === 5 ? lastRowHeight : standardTileHeight); return { x, y }; };
  const displayScale = 0.15;
  const tileWidth = mapWidth / cols; const tileHeight = mapHeight / rows;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const hexSampleInputRef = useRef<HTMLInputElement>(null);
  const [hexSample, setHexSample] = useState<string | undefined>(strategicMapData?.hexSample);
  const [dragOverTile, setDragOverTile] = useState<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        const match = file.name.match(/(\d{2})/);
        if (match) {
          const tileId = parseInt(match[1]);
          if (tileId >= 0 && tileId < 42) {
            const row = Math.floor(tileId / cols); const col = tileId % cols;
            setMapTiles(prev => {
              const existing = prev.findIndex(t => t.id === tileId);
              let updated;
              if (existing >= 0) { updated = [...prev]; updated[existing] = { id: tileId, imageData, row, col }; }
              else { updated = [...prev, { id: tileId, imageData, row, col }]; }
              const tilesWithSizes = updated.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
              saveToIndexedDB({ tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight }).then(() => console.log(`✅ Тайл ${String(tileId).padStart(2, '0')} сохранён`));
              return updated;
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent, tileId: number) => {
    e.preventDefault(); setDragOverTile(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        const row = Math.floor(tileId / cols); const col = tileId % cols;
        setMapTiles(prev => {
          const existing = prev.findIndex(t => t.id === tileId);
          let updated;
          if (existing >= 0) { updated = [...prev]; updated[existing] = { id: tileId, imageData, row, col }; }
          else { updated = [...prev, { id: tileId, imageData, row, col }]; }
          const tilesWithSizes = updated.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
          saveToIndexedDB({ tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight });
          return updated;
        });
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const handleSave = async () => {
    const tilesWithSizes = mapTiles.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
    const dataToSave: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample };
    try { await saveToIndexedDB(dataToSave); onUpdate(dataToSave); alert(`✅ Карта сохранена! Тайлов: ${tilesWithSizes.length}`); }
    catch (error) { alert('❌ Ошибка сохранения'); }
  };

  const handleClear = async () => {
    if (confirm('Очистить все изображения карты?')) { try { await deleteFromIndexedDB(); setMapTiles([]); setHexSample(undefined); } catch { alert('Ошибка очистки'); } }
  };

  const handleExport = () => {
    if (mapTiles.length === 0) {
      alert('❌ Нет данных для экспорта! Сначала загрузите тайлы карты.');
      return;
    }

    try {
      const tilesWithSizes = mapTiles.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
      const dataToExport: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample };
      
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'strategic-map-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const fileSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
      alert(`✅ Экспорт завершён!\n\nФайл: strategic-map-data.json\nРазмер: ${fileSizeMB} МБ\nТайлов: ${tilesWithSizes.length}`);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('❌ Ошибка при экспорте данных. Проверьте консоль для деталей.');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      alert('❌ Неверный формат файла! Ожидается .json файл.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as StrategicMapData;
        
        if (!data.tiles || !Array.isArray(data.tiles)) {
          alert('❌ Неверный формат файла! Отсутствует массив tiles.');
          return;
        }
        
        if (data.tiles.length === 0) {
          alert('⚠️ Файл не содержит тайлов.');
          return;
        }
        
        setMapTiles(data.tiles);
        if (data.hexSample) setHexSample(data.hexSample);
        
        try {
          await saveToIndexedDB(data);
        } catch (dbError) {
          console.warn('Не удалось сохранить в IndexedDB:', dbError);
        }
        
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        alert(`✅ Импорт завершён!\n\nФайл: ${file.name}\nРазмер: ${fileSizeMB} МБ\nТайлов: ${data.tiles.length}`);
      } catch (error) {
        console.error('Ошибка импорта:', error);
        alert('❌ Ошибка при чтении файла. Убедитесь что это корректный JSON файл экспорта карты.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleHexSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) { if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) data[i + 3] = 0; }
        ctx.putImageData(imageData, 0, 0);
        const processedImageData = canvas.toDataURL('image/png');
        setHexSample(processedImageData);
        const tilesWithSizes = mapTiles.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
        await saveToIndexedDB({ tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample: processedImageData });
        alert('✅ Образец гекса загружен! Белый фон удалён.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file); e.target.value = '';
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-cyan-300">🗺️ Редактор стратегической карты</h3>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">📁 Загрузить</button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm">💾 Сохранить</button>
          <button 
            onClick={handleExport} 
            disabled={mapTiles.length === 0} 
            className={`px-4 py-2 rounded text-sm font-semibold transition-all ${
              mapTiles.length === 0 
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50' 
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
            }`}
            title={mapTiles.length === 0 ? 'Сначала загрузите тайлы карты' : `Экспортировать ${mapTiles.length} тайлов в JSON файл`}
          >
            📤 Экспорт {mapTiles.length > 0 && `(${mapTiles.length})`}
          </button>
          <button 
            onClick={() => importInputRef.current?.click()} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
            title="Импортировать карту из ранее сохранённого JSON файла"
          >
            📥 Импорт
          </button>
          <button onClick={handleClear} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">🗑️ Очистить</button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
      <input ref={importInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
      <input ref={hexSampleInputRef} type="file" accept="image/*" onChange={handleHexSampleUpload} className="hidden" />

      <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-cyan-300">⬡ Образец гекса для сетки</h4>
          <div className="flex gap-2">
            <button onClick={() => hexSampleInputRef.current?.click()} className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-xs">📁 Загрузить образец</button>
            {hexSample && <button onClick={() => { setHexSample(undefined); saveToIndexedDB({ tiles: mapTiles.map(t => ({ ...t, width: getTileSize(t.id).width, height: getTileSize(t.id).height })), mapWidth, mapHeight, tileWidth, tileHeight }); }} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">✕ Удалить</button>}
          </div>
        </div>
        {hexSample ? <div className="flex items-center gap-3"><img src={hexSample} alt="Образец гекса" className="border border-slate-600 rounded" style={{ maxWidth: '100px', maxHeight: '100px' }} /><div className="text-xs text-green-400">✅ Образец загружен</div></div> : <div className="text-xs text-slate-500">⚠️ Образец не загружен</div>}
      </div>

      <div className="mb-4 text-sm text-slate-400">
        <p>Размер карты: {mapWidth} × {mapHeight} | Загружено: <span className="text-cyan-400 font-bold">{mapTiles.length}</span> из 42</p>
      </div>

      <div className="relative border border-slate-700 rounded overflow-auto bg-slate-900/50" style={{ maxHeight: '600px' }}>
        <div className="relative" style={{ width: `${mapWidth * displayScale}px`, height: `${mapHeight * displayScale}px` }}>
          {Array.from({ length: 42 }).map((_, idx) => {
            const tile = mapTiles.find(t => t.id === idx);
            const tileSize = getTileSize(idx); const tilePos = getTilePosition(idx);
            return (
              <div key={idx} className={`absolute border-2 transition-all ${dragOverTile === idx ? 'border-cyan-400 bg-cyan-500/20' : tile ? 'border-green-600' : 'border-slate-600 hover:border-slate-500'}`}
                style={{ left: `${tilePos.x * displayScale}px`, top: `${tilePos.y * displayScale}px`, width: `${tileSize.width * displayScale}px`, height: `${tileSize.height * displayScale}px` }}
                onDragOver={(e) => { e.preventDefault(); setDragOverTile(idx); }} onDragLeave={() => setDragOverTile(null)} onDrop={(e) => handleDrop(e, idx)}>
                {tile ? <img src={tile.imageData} alt={`Tile ${idx}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs"><div className="text-center"><div className="text-2xl mb-1">{String(idx).padStart(2, '0')}</div><div className="text-[9px]">{tileSize.width}×{tileSize.height}</div></div></div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
