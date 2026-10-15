/**
 * Процедурная генерация тайлов карты Тихого океана
 * Размер карты: 9703 × 7767 пикселей
 * Тайлы: 42 штуки (7 колонок × 6 рядов)
 */

export const MAP_WIDTH = 9703;
export const MAP_HEIGHT = 7767;
export const TILE_COLS = 7;
export const TILE_ROWS = 6;
export const STANDARD_TILE_W = 1500;
export const STANDARD_TILE_H = 1500;
export const LAST_COL_W = 703;
export const LAST_ROW_H = 267;

interface Landmass {
  points: [number, number][];
  color: string;
  name?: string;
}

// Континенты и крупные острова (координаты в пикселях карты)
const landmasses: Landmass[] = [
  // Аляска (верхний левый)
  {
    points: [
      [200, 100], [600, 80], [900, 150], [1100, 200], [1200, 350],
      [1100, 500], [900, 600], [700, 550], [500, 500], [300, 400], [150, 250]
    ],
    color: '#4a7c59',
    name: 'АЛЯСКА'
  },
  // Канада/Северо-запад США
  {
    points: [
      [300, 500], [500, 500], [700, 550], [900, 600], [1000, 700],
      [1100, 900], [1050, 1100], [950, 1300], [850, 1500], [750, 1700],
      [700, 1900], [650, 2100], [600, 2300], [500, 2400], [400, 2300],
      [350, 2100], [300, 1800], [250, 1500], [200, 1200], [200, 900], [250, 700]
    ],
    color: '#5a8c69',
    name: 'СЕВЕРНАЯ АМЕРИКА'
  },
  // Калифорния / Мексика
  {
    points: [
      [600, 2300], [650, 2100], [700, 1900], [750, 1700], [850, 1500],
      [950, 1300], [1050, 1100], [1100, 1200], [1200, 1400], [1300, 1600],
      [1350, 1900], [1300, 2200], [1200, 2500], [1100, 2800], [1000, 3000],
      [900, 3200], [800, 3100], [700, 2900], [650, 2700], [600, 2500]
    ],
    color: '#6b9c79',
    name: 'КАЛИФОРНИЯ'
  },
  // Центральная Америка
  {
    points: [
      [900, 3200], [1000, 3000], [1100, 2800], [1200, 2500], [1300, 2600],
      [1400, 2800], [1500, 3000], [1550, 3200], [1500, 3400], [1400, 3500],
      [1300, 3400], [1200, 3300], [1100, 3250], [1000, 3250]
    ],
    color: '#5a8c69'
  },
  // Япония (правый верхний)
  {
    points: [
      [7200, 800], [7400, 750], [7600, 800], [7800, 900], [7900, 1100],
      [7850, 1300], [7700, 1400], [7500, 1350], [7350, 1200], [7250, 1000]
    ],
    color: '#4a7c59',
    name: 'ЯПОНИЯ'
  },
  // Хонсю (главный остров Японии)
  {
    points: [
      [7300, 1200], [7500, 1150], [7700, 1200], [7800, 1350], [7750, 1500],
      [7600, 1600], [7400, 1550], [7300, 1400]
    ],
    color: '#4a7c59'
  },
  // Корея
  {
    points: [
      [7000, 1000], [7100, 950], [7150, 1050], [7130, 1200], [7080, 1300],
      [7000, 1250], [6950, 1100]
    ],
    color: '#5a8c69',
    name: 'КОРЕЯ'
  },
  // Китай / Восточная Азия
  {
    points: [
      [6500, 800], [6700, 750], [6900, 800], [7000, 1000], [6950, 1100],
      [7000, 1250], [7080, 1300], [7100, 1500], [7050, 1700], [6950, 1900],
      [6800, 2100], [6700, 2300], [6600, 2500], [6500, 2600], [6400, 2500],
      [6300, 2300], [6200, 2000], [6100, 1700], [6100, 1400], [6200, 1100],
      [6300, 900]
    ],
    color: '#5a8c69',
    name: 'КИТАЙ'
  },
  // Филиппины
  {
    points: [
      [6600, 2500], [6700, 2450], [6800, 2500], [6850, 2650], [6800, 2800],
      [6700, 2850], [6600, 2750], [6550, 2600]
    ],
    color: '#4a7c59',
    name: 'ФИЛИППИНЫ'
  },
  // Филиппины (южные острова)
  {
    points: [
      [6700, 2850], [6800, 2800], [6850, 2900], [6800, 3000], [6700, 3050],
      [6650, 2950]
    ],
    color: '#4a7c59'
  },
  // Тайвань
  {
    points: [
      [6800, 2100], [6850, 2050], [6900, 2100], [6880, 2200], [6830, 2200]
    ],
    color: '#4a7c59'
  },
  // Индонезия / Борнео
  {
    points: [
      [6400, 3200], [6600, 3100], [6800, 3200], [6900, 3400], [6800, 3600],
      [6600, 3700], [6400, 3600], [6300, 3400]
    ],
    color: '#5a8c69',
    name: 'ИНДОНЕЗИЯ'
  },
  // Новая Гвинея
  {
    points: [
      [7200, 3400], [7500, 3300], [7800, 3400], [7900, 3500], [7800, 3650],
      [7500, 3700], [7200, 3600], [7100, 3500]
    ],
    color: '#4a7c59'
  },
  // Австралия
  {
    points: [
      [6800, 4000], [7200, 3800], [7600, 3900], [8000, 4100], [8200, 4400],
      [8300, 4800], [8200, 5200], [8000, 5500], [7700, 5700], [7300, 5800],
      [7000, 5600], [6800, 5300], [6700, 4900], [6700, 4500], [6750, 4200]
    ],
    color: '#8B6914',
    name: 'АВСТРАЛИЯ'
  },
  // Гавайи (группа островов)
  {
    points: [
      [2300, 1700], [2400, 1680], [2450, 1720], [2420, 1770], [2330, 1770], [2280, 1740]
    ],
    color: '#4a7c59',
    name: 'ГАВАЙИ'
  },
  {
    points: [
      [2500, 1750], [2570, 1730], [2600, 1770], [2560, 1810], [2500, 1800]
    ],
    color: '#4a7c59'
  },
  {
    points: [
      [2150, 1750], [2220, 1740], [2250, 1780], [2200, 1810], [2150, 1790]
    ],
    color: '#4a7c59'
  },
  // Мидуэй
  {
    points: [
      [4300, 1400], [4400, 1380], [4450, 1420], [4400, 1460], [4320, 1450]
    ],
    color: '#4a7c59',
    name: 'МИДУЭЙ'
  },
  // Маршалловы острова
  {
    points: [
      [5400, 2200], [5450, 2180], [5480, 2210], [5450, 2240], [5410, 2230]
    ],
    color: '#4a7c59'
  },
  {
    points: [
      [5500, 2300], [5550, 2280], [5580, 2310], [5550, 2340], [5510, 2330]
    ],
    color: '#4a7c59'
  },
  // Каролинские острова
  {
    points: [
      [5800, 2500], [5870, 2480], [5900, 2520], [5860, 2550], [5810, 2540]
    ],
    color: '#4a7c59'
  },
  // Соломоновы острова
  {
    points: [
      [7400, 3100], [7470, 3080], [7500, 3120], [7460, 3150], [7410, 3140]
    ],
    color: '#4a7c59'
  },
  // Новая Зеландия
  {
    points: [
      [8400, 5500], [8450, 5400], [8500, 5450], [8520, 5600], [8480, 5750],
      [8430, 5700], [8400, 5600]
    ],
    color: '#4a7c59',
    name: 'НОВАЯ ЗЕЛАНДИЯ'
  },
  // Фиджи
  {
    points: [
      [8100, 3800], [8150, 3780], [8180, 3810], [8150, 3840], [8110, 3830]
    ],
    color: '#4a7c59'
  },
  // Алеутские острова (цепочка)
  {
    points: [[1200, 350], [1280, 330], [1300, 360], [1250, 380]],
    color: '#4a7c59'
  },
  {
    points: [[1400, 320], [1480, 300], [1500, 330], [1450, 350]],
    color: '#4a7c59'
  },
  {
    points: [[1600, 310], [1680, 290], [1700, 320], [1650, 340]],
    color: '#4a7c59'
  },
  {
    points: [[1800, 330], [1880, 310], [1900, 340], [1850, 360]],
    color: '#4a7c59'
  },
  {
    points: [[2000, 370], [2080, 350], [2100, 380], [2050, 400]],
    color: '#4a7c59'
  },
  // Камчатка
  {
    points: [
      [7800, 400], [7900, 350], [8000, 400], [8050, 550], [8000, 700],
      [7900, 750], [7800, 650], [7750, 500]
    ],
    color: '#5a8c69',
    name: 'КАМЧАТКА'
  },
  // Охотское море - побережье
  {
    points: [
      [7200, 400], [7400, 350], [7600, 380], [7800, 400], [7750, 500],
      [7600, 550], [7400, 500], [7200, 450]
    ],
    color: '#5a8c69'
  },
  // Вьетнам
  {
    points: [
      [6400, 2500], [6500, 2450], [6550, 2600], [6500, 2800], [6450, 3000],
      [6400, 3100], [6350, 3000], [6350, 2800], [6380, 2600]
    ],
    color: '#5a8c69'
  },
];

// Морские течения (пунктирные линии)
interface Current {
  points: [number, number][];
  color: string;
}

const currents: Current[] = [
  // Куросио (тёплое течение)
  { points: [[6800, 1800], [7200, 1600], [7600, 1400], [7900, 1200]], color: '#ff6b6b' },
  // Оясиво (холодное течение)
  { points: [[7800, 800], [7500, 1000], [7200, 1200], [6900, 1400]], color: '#4ecdc4' },
  // Северо-Тихоокеанское течение
  { points: [[7000, 2000], [6000, 2100], [5000, 2000], [4000, 1900], [3000, 1800]], color: '#4ecdc4' },
  // Калифорнийское течение
  { points: [[1200, 1800], [1100, 2200], [1000, 2600], [900, 3000]], color: '#4ecdc4' },
  // Южное Пассатное течение
  { points: [[8000, 3500], [7000, 3600], [6000, 3500], [5000, 3400], [4000, 3300]], color: '#ff6b6b' },
  // Восточно-Австралийское течение
  { points: [[8000, 4200], [8200, 4600], [8300, 5000], [8400, 5400]], color: '#ff6b6b' },
];

function getTileDimensions(tileId: number) {
  const row = Math.floor(tileId / TILE_COLS);
  const col = tileId % TILE_COLS;
  const isLastColumn = col === 6;
  const isLastRow = row === 5;
  return {
    width: isLastColumn ? LAST_COL_W : STANDARD_TILE_W,
    height: isLastRow ? LAST_ROW_H : STANDARD_TILE_H
  };
}

function getTilePosition(tileId: number) {
  const row = Math.floor(tileId / TILE_COLS);
  const col = tileId % TILE_COLS;
  let x = 0;
  for (let c = 0; c < col; c++) {
    x += (c === 6 ? LAST_COL_W : STANDARD_TILE_W);
  }
  let y = 0;
  for (let r = 0; r < row; r++) {
    y += (r === 5 ? LAST_ROW_H : STANDARD_TILE_H);
  }
  return { x, y };
}

function drawLandmass(ctx: CanvasRenderingContext2D, landmass: Landmass, offsetX: number, offsetY: number) {
  const { points, color } = landmass;
  if (points.length < 3) return;

  ctx.beginPath();
  ctx.moveTo(points[0][0] - offsetX, points[0][1] - offsetY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] - offsetX, points[i][1] - offsetY);
  }
  ctx.closePath();

  // Заполняем сушу
  ctx.fillStyle = color;
  ctx.fill();

  // Береговая линия
  ctx.strokeStyle = '#2d5a3d';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Добавляем текстуру (штриховка для гор)
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  const bounds = getBounds(points);
  for (let y = bounds.minY - offsetY; y < bounds.maxY - offsetY; y += 8) {
    ctx.beginPath();
    ctx.moveTo(bounds.minX - offsetX, y);
    ctx.lineTo(bounds.maxX - offsetX, y + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function getBounds(points: [number, number][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

function drawCurrent(ctx: CanvasRenderingContext2D, current: Current, offsetX: number, offsetY: number) {
  const { points, color } = current;
  ctx.beginPath();
  ctx.setLineDash([8, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.moveTo(points[0][0] - offsetX, points[0][1] - offsetY);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev[0] + curr[0]) / 2 - offsetX;
    const cpy = (prev[1] + curr[1]) / 2 - offsetY;
    ctx.quadraticCurveTo(prev[0] - offsetX, prev[1] - offsetY, cpx, cpy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Стрелка направления
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  const ax = last[0] - offsetX;
  const ay = last[1] - offsetY;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 10 * Math.cos(angle - 0.4), ay - 10 * Math.sin(angle - 0.4));
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 10 * Math.cos(angle + 0.4), ay - 10 * Math.sin(angle + 0.4));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, offsetX: number, offsetY: number) {
  const sx = x - offsetX;
  const sy = y - offsetY;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(text, sx + 1, sy + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, sx, sy);
}

function drawOceanDetails(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, tileW: number, tileH: number) {
  // Глубина океана - градиентные пятна
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 5; i++) {
    const cx = tileX + Math.random() * tileW;
    const cy = tileY + Math.random() * tileH;
    const r = 100 + Math.random() * 200;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

function drawGridLines(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, tileW: number, tileH: number) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 0.5;

  // Меридианы (вертикальные линии)
  const lonStep = 500;
  const startLon = Math.ceil(tileX / lonStep) * lonStep;
  for (let x = startLon; x < tileX + tileW; x += lonStep) {
    ctx.beginPath();
    ctx.moveTo(x - tileX, 0);
    ctx.lineTo(x - tileX, tileH);
    ctx.stroke();
  }

  // Параллели (горизонтальные линии)
  const latStep = 500;
  const startLat = Math.ceil(tileY / latStep) * latStep;
  for (let y = startLat; y < tileY + tileH; y += latStep) {
    ctx.beginPath();
    ctx.moveTo(0, y - tileY);
    ctx.lineTo(tileW, y - tileY);
    ctx.stroke();
  }
}

/**
 * Генерация одного тайла карты
 */
export function generateTile(tileId: number): string {
  const { width, height } = getTileDimensions(tileId);
  const { x: tileX, y: tileY } = getTilePosition(tileId);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Фон океана - градиент
  const oceanGradient = ctx.createLinearGradient(0, 0, width, height);
  oceanGradient.addColorStop(0, '#1a3a6e');
  oceanGradient.addColorStop(0.3, '#1e4d8a');
  oceanGradient.addColorStop(0.6, '#1a4070');
  oceanGradient.addColorStop(1, '#152d5a');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, width, height);

  // Детали океана
  drawOceanDetails(ctx, tileX, tileY, width, height);

  // Координатная сетка
  drawGridLines(ctx, tileX, tileY, width, height);

  // Рисуем морские течения
  for (const current of currents) {
    drawCurrent(ctx, current, tileX, tileY);
  }

  // Рисуем сушу
  for (const landmass of landmasses) {
    drawLandmass(ctx, landmass, tileX, tileY);
  }

  // Подписи регионов
  for (const landmass of landmasses) {
    if (landmass.name) {
      const bounds = getBounds(landmass.points);
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      drawLabel(ctx, landmass.name, cx, cy, tileX, tileY);
    }
  }

  // Подписи океана
  const oceanLabels: [string, number, number][] = [
    ['ТИХИЙ ОКЕАН', 4000, 2500],
    ['СЕВЕРНАЯ ЧАСТЬ', 4000, 1200],
    ['ЮЖНАЯ ЧАСТЬ', 5000, 4500],
    ['Берингово м.', 6500, 500],
    ['Охотское м.', 7200, 700],
    ['Южно-Китайское м.', 6200, 2800],
    ['Коралловое м.', 7500, 3800],
    ['Тасманово м.', 8300, 5200],
  ];

  for (const [text, x, y] of oceanLabels) {
    if (x >= tileX && x < tileX + width && y >= tileY && y < tileY + height) {
      ctx.font = 'italic 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
      ctx.fillText(text, x - tileX, y - tileY);
    }
  }

  // Компас (в правом нижнем углу первого тайла)
  if (tileId === 0) {
    const cx = width - 80;
    const cy = height - 80;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - 20);
    ctx.fillText('S', cx, cy + 25);
    ctx.fillText('W', cx - 22, cy + 4);
    ctx.fillText('E', cx + 22, cy + 4);
    // Стрелка
    ctx.beginPath();
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.closePath();
    ctx.fillStyle = '#ff4444';
    ctx.fill();
  }

  // Номер тайла (мелкий, в углу)
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.textAlign = 'left';
  ctx.fillText(`${String(tileId).padStart(2, '0')}`, 5, 15);

  return canvas.toDataURL('image/png');
}

/**
 * Генерация всех 42 тайлов
 */
export function generateAllTiles(): Array<{ id: number; imageData: string; row: number; col: number; width: number; height: number }> {
  const tiles: Array<{ id: number; imageData: string; row: number; col: number; width: number; height: number }> = [];

  for (let id = 0; id < 42; id++) {
    const row = Math.floor(id / TILE_COLS);
    const col = id % TILE_COLS;
    const { width, height } = getTileDimensions(id);
    const imageData = generateTile(id);
    tiles.push({ id, imageData, row, col, width, height });
  }

  return tiles;
}

/**
 * Получить размеры тайла по его ID
 */
export { getTileDimensions, getTilePosition };
