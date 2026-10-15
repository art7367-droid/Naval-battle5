import { useState, useRef, useEffect } from 'react';
import { StrategicMapData } from '../types/shipDatabase';

interface StrategicMapProps { onBack: () => void; strategicMapData?: StrategicMapData; }
interface Viewport { x: number; y: number; width: number; height: number; zoom: number; }
interface Region { id: string; name: string; x: number; y: number; width: number; height: number; color: string; }

export default function StrategicMap({ onBack, strategicMapData }: StrategicMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const MAP_WIDTH = strategicMapData?.mapWidth || 9703;
  const MAP_HEIGHT = strategicMapData?.mapHeight || 7767;
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, width: 1200, height: 800, zoom: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const hexSampleImage = useRef<HTMLImageElement | null>(null);

  const regions: Region[] = [
    { id: 'japan', name: 'Япония', x: 7500, y: 1200, width: 800, height: 600, color: '#dc2626' },
    { id: 'philippines', name: 'Филиппины', x: 6800, y: 2400, width: 600, height: 500, color: '#2563eb' },
    { id: 'midway', name: 'Мидуэй', x: 4500, y: 1500, width: 400, height: 400, color: '#16a34a' },
    { id: 'hawaii', name: 'Гавайи', x: 2500, y: 1800, width: 500, height: 400, color: '#9333ea' },
    { id: 'australia', name: 'Австралия', x: 7000, y: 3500, width: 1200, height: 900, color: '#ea580c' },
    { id: 'alaska', name: 'Аляска', x: 1000, y: 500, width: 800, height: 600, color: '#0891b2' },
    { id: 'california', name: 'Калифорния', x: 800, y: 1500, width: 600, height: 800, color: '#ca8a04' },
  ];

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewport(prev => ({ ...prev, width: rect.width, height: rect.height }));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!strategicMapData?.tiles) return;
    strategicMapData.tiles.forEach(tile => {
      if (!imageCache.current.has(tile.imageData)) {
        const img = new Image(); img.src = tile.imageData; imageCache.current.set(tile.imageData, img);
      }
    });
  }, [strategicMapData]);

  useEffect(() => {
    if (strategicMapData?.hexSample) {
      const img = new Image();
      img.onload = () => { hexSampleImage.current = img; };
      img.src = strategicMapData.hexSample;
    } else { hexSampleImage.current = null; }
  }, [strategicMapData?.hexSample]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const visibleX = viewport.x / viewport.zoom;
    const visibleY = viewport.y / viewport.zoom;
    const visibleWidth = viewport.width / viewport.zoom;
    const visibleHeight = viewport.height / viewport.zoom;

    if (strategicMapData?.tiles?.length) {
      const cols = 7;
      const standardTileWidth = 1500; const standardTileHeight = 1500;
      const lastColumnWidth = 703; const lastRowHeight = 267;
      const getTileSize = (tileId: number, tileData?: any) => {
        const row = Math.floor(tileId / cols); const col = tileId % cols;
        return { width: tileData?.width || (col === 6 ? lastColumnWidth : standardTileWidth), height: tileData?.height || (row === 5 ? lastRowHeight : standardTileHeight) };
      };
      const getTilePosition = (tileId: number) => {
        const row = Math.floor(tileId / cols); const col = tileId % cols;
        let x = 0; for (let c = 0; c < col; c++) x += (c === 6 ? lastColumnWidth : standardTileWidth);
        let y = 0; for (let r = 0; r < row; r++) y += (r === 5 ? lastRowHeight : standardTileHeight);
        return { x, y };
      };
      strategicMapData.tiles.forEach(tile => {
        const tileSize = getTileSize(tile.id, tile);
        const tilePos = getTilePosition(tile.id);
        if (tilePos.x + tileSize.width < visibleX || tilePos.x > visibleX + visibleWidth || tilePos.y + tileSize.height < visibleY || tilePos.y > visibleY + visibleHeight) return;
        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, (tilePos.x - visibleX) * viewport.zoom, (tilePos.y - visibleY) * viewport.zoom, tileSize.width * viewport.zoom, tileSize.height * viewport.zoom);
        }
      });
    } else {
      // Fallback: простые прямоугольники регионов
      regions.forEach(region => {
        if (region.x + region.width < visibleX || region.x > visibleX + visibleWidth || region.y + region.height < visibleY || region.y > visibleY + visibleHeight) return;
        const screenX = (region.x - visibleX) * viewport.zoom; const screenY = (region.y - visibleY) * viewport.zoom;
        ctx.fillStyle = region.color + '40'; ctx.fillRect(screenX, screenY, region.width * viewport.zoom, region.height * viewport.zoom);
        ctx.strokeStyle = region.color; ctx.lineWidth = 2 / viewport.zoom; ctx.strokeRect(screenX, screenY, region.width * viewport.zoom, region.height * viewport.zoom);
        ctx.fillStyle = '#ffffff'; ctx.font = `${Math.max(12, 16 * viewport.zoom)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(region.name, screenX + region.width * viewport.zoom / 2, screenY + region.height * viewport.zoom / 2);
      });
    }

    // Hex grid
    const hexWidth = 21; const hexHeight = 25;
    const hexSpacingX = hexWidth; const hexSpacingY = hexHeight * 0.75;
    const hexCols = Math.ceil(MAP_WIDTH / hexSpacingX) + 1;
    const hexRows = Math.ceil(MAP_HEIGHT / hexSpacingY) + 1;
    const startHexCol = Math.max(0, Math.floor(visibleX / hexSpacingX) - 1);
    const endHexCol = Math.min(hexCols, Math.ceil((visibleX + visibleWidth) / hexSpacingX) + 1);
    const startHexRow = Math.max(0, Math.floor(visibleY / hexSpacingY) - 1);
    const endHexRow = Math.min(hexRows, Math.ceil((visibleY + visibleHeight) / hexSpacingY) + 1);

    if (hexSampleImage.current) {
      const sampleImg = hexSampleImage.current;
      const sampleWidth = hexWidth * viewport.zoom; const sampleHeight = hexHeight * viewport.zoom;
      ctx.globalAlpha = 0.1; // 90% прозрачности для образца гекса
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX; const centerY = row * hexSpacingY;
          ctx.drawImage(sampleImg, (centerX - visibleX) * viewport.zoom - sampleWidth / 2, (centerY - visibleY) * viewport.zoom - sampleHeight / 2, sampleWidth, sampleHeight);
        }
      }
      ctx.globalAlpha = 1.0; // Восстанавливаем прозрачность
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 0.5 / viewport.zoom; // 90% прозрачности - очень тонкие и бледные
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX; const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom; const screenY = (centerY - visibleY) * viewport.zoom;
          const screenRadiusX = (hexWidth / 2) * viewport.zoom; const screenRadiusY = (hexHeight / 2) * viewport.zoom;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = screenX + screenRadiusX * Math.cos(angle); const y = screenY + screenRadiusY * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
    }
  }, [viewport, regions, strategicMapData]);

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x; const dy = e.clientY - dragStart.y;
    setViewport(prev => ({ ...prev, x: Math.max(0, Math.min(MAP_WIDTH * prev.zoom - prev.width, prev.x - dx)), y: Math.max(0, Math.min(MAP_HEIGHT * prev.zoom - prev.height, prev.y - dy)) }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => { setIsDragging(false); };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(2, viewport.zoom * zoomFactor));
    const centerX = viewport.x + viewport.width / 2; const centerY = viewport.y + viewport.height / 2;
    const newX = centerX - (centerX - viewport.x) * (newZoom / viewport.zoom);
    const newY = centerY - (centerY - viewport.y) * (newZoom / viewport.zoom);
    setViewport(prev => ({ ...prev, zoom: newZoom, x: Math.max(0, Math.min(MAP_WIDTH * newZoom - prev.width, newX)), y: Math.max(0, Math.min(MAP_HEIGHT * newZoom - prev.height, newY)) }));
  };
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mapX = viewport.x / viewport.zoom + (e.clientX - rect.left) / viewport.zoom;
    const mapY = viewport.y / viewport.zoom + (e.clientY - rect.top) / viewport.zoom;
    const clickedRegion = regions.find(r => mapX >= r.x && mapX <= r.x + r.width && mapY >= r.y && mapY <= r.y + r.height);
    setSelectedRegion(clickedRegion || null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">← Назад в меню</button>
        <h1 className="text-2xl font-bold text-cyan-300">🗺️ Стратегическая карта Тихого океана</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">Масштаб: {Math.round(viewport.zoom * 100)}%</div>
          <div className="flex items-center gap-2">
            <input type="range" min="0" max="3" step="1" value={[0.5, 1, 1.5, 2].indexOf(viewport.zoom)} onChange={(e) => { const zoomLevels = [0.5, 1, 1.5, 2]; setViewport(prev => ({ ...prev, zoom: zoomLevels[parseInt(e.target.value)] })); }} className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            <div className="flex gap-1 text-xs">
              {[50, 100, 150, 200].map((p) => (<button key={p} onClick={() => setViewport(prev => ({ ...prev, zoom: p / 100 }))} className={`px-2 py-1 rounded transition-colors ${Math.round(viewport.zoom * 100) === p ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{p}%</button>))}
            </div>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-move" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onClick={handleClick}>
        <canvas ref={canvasRef} width={viewport.width} height={viewport.height} className="absolute top-0 left-0" />
      </div>
      {selectedRegion && (<div className="absolute bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg"><h3 className="text-lg font-bold text-cyan-300 mb-2">{selectedRegion.name}</h3><div className="text-sm text-slate-300"><p>Координаты: ({selectedRegion.x}, {selectedRegion.y})</p><p>Размер: {selectedRegion.width} × {selectedRegion.height}</p></div></div>)}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
        <p>🖱️ Перетаскивание - перемещение карты</p><p>🔍 Колесо мыши - масштабирование</p><p>👆 Клик - выбор региона</p>
      </div>
    </div>
  );
}
