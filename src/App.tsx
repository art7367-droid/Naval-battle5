import { useState, useCallback, useRef } from 'react';
import { Ship, GamePhase, Shot, Trajectory, BattleLogEntry, createCompartments, calculateShipStats } from './types';
import { ShipDatabaseEntry } from './types/shipDatabase';
import { generatePlayerShips, generateEnemyShips, executeShots, allShipsSunk, getReachableHexes, hexDistance, getHeading } from './gameLogic';
import { resetAI, generateAIShots, generateAIMoves, updateAIAfterShots } from './ai';
import { processDamagePropagation } from './damagePropagation';
import HexGrid from './HexGrid';
import BattleLog from './components/BattleLog';
import BattleShipDetailCard from './components/BattleShipDetailCard';
import ShipDatabaseManager from './components/ShipDatabaseManager';
import ShipSelectionScreen from './components/ShipSelectionScreen';
import StrategicMap from './components/StrategicMap';
import StrategicMapEditor from './components/StrategicMapEditor';
import { saveToIndexedDB, loadFromIndexedDB, migrateFromLocalStorage } from './utils/indexedDB';
import { StrategicMapData } from './types/shipDatabase';
import { generateAllTiles, MAP_WIDTH as GEN_MAP_WIDTH, MAP_HEIGHT as GEN_MAP_HEIGHT } from './utils/generateMapTiles';

function shipIcon(type: string): string {
  switch (type) { case 'battleship': return '🚢'; case 'cruiser': return '⛴️'; case 'destroyer': return '🚤'; default: return '⚓'; }
}

type AppScreen = 'menu' | 'database' | 'selection' | 'battle' | 'campaign' | 'mapEditor';

function App() {
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [phase, setPhase] = useState<GamePhase>('placement');
  const [playerShips, setPlayerShips] = useState<Ship[]>([]);
  const [enemyShips, setEnemyShips] = useState<Ship[]>([]);
  const [message, setMessage] = useState('Нажмите "Начать бой" для размещения кораблей');
  const [playerShotTargets, setPlayerShotTargets] = useState<{ shipId: number; targetShipId: number }[]>([]);
  const [playerShots, setPlayerShots] = useState<Shot[]>([]);
  const [enemyShots, setEnemyShots] = useState<Shot[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<{ shipId: number } | null>(null);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [turnNumber, setTurnNumber] = useState(1);
  const [selectedShipForMove, setSelectedShipForMove] = useState<Ship | null>(null);
  const [reachableHexes, setReachableHexes] = useState<{ q: number; r: number }[]>([]);
  const [playerTrajectories, setPlayerTrajectories] = useState<Trajectory[]>([]);
  const [enemyTrajectories, setEnemyTrajectories] = useState<Trajectory[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [movementOrders, setMovementOrders] = useState<Map<number, { q: number; r: number }>>(new Map());
  const [shotAnimations, setShotAnimations] = useState<Array<{from: {q: number; r: number}; to: {q: number; r: number}; id: number}>>([]);
  const [selectedShipForDetail, setSelectedShipForDetail] = useState<Ship | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [showBattleLog, setShowBattleLog] = useState(true);
  const [hitMarkers, setHitMarkers] = useState<Array<{shipId: number; compartmentId: string; turn: number; damage: number}>>([]);
  const [strategicMapData, setStrategicMapData] = useState<StrategicMapData | undefined>(() => {
    loadFromIndexedDB().then(data => {
      if (data && data.tiles && data.tiles.length > 0) {
        setStrategicMapData(data);
      } else {
        // Пробуем мигрировать из localStorage
        migrateFromLocalStorage().then(migrated => {
          if (migrated) {
            loadFromIndexedDB().then(d => {
              if (d && d.tiles && d.tiles.length > 0) {
                setStrategicMapData(d);
              } else {
                // Генерируем дефолтные тайлы карты
                generateDefaultMap();
              }
            });
          } else {
            // Генерируем дефолтные тайлы карты
            generateDefaultMap();
          }
        });
      }
    });
    return undefined;
  });

  // Генерация дефолтной карты Тихого океана
  const generateDefaultMap = () => {
    console.log('🗺️ Генерация дефолтной карты Тихого океана...');
    setTimeout(() => {
      const tiles = generateAllTiles();
      const defaultData: StrategicMapData = {
        tiles,
        mapWidth: GEN_MAP_WIDTH,
        mapHeight: GEN_MAP_HEIGHT,
        tileWidth: 1500,
        tileHeight: 1500
      };
      setStrategicMapData(defaultData);
      // Сохраняем в IndexedDB для будущего использования
      saveToIndexedDB(defaultData).then(() => {
        console.log('✅ Дефолтная карта сохранена в IndexedDB');
      }).catch(err => {
        console.error('❌ Ошибка сохранения дефолтной карты:', err);
      });
    }, 100);
  };

  const playerShotTargetsRef = useRef<{ shipId: number; targetShipId: number }[]>([]);
  const setPlayerShotTargetsWithRef = (targets: { shipId: number; targetShipId: number }[]) => { playerShotTargetsRef.current = targets; setPlayerShotTargets(targets); };

  const startBattleFromDB = useCallback((playerDBShips: ShipDatabaseEntry[], enemyDBShips: ShipDatabaseEntry[]) => {
    const pShips = playerDBShips.map((dbShip, index) => {
      const shipLength = dbShip.length || (dbShip.class === 'battleship' ? 250 : dbShip.class === 'cruiser' ? 200 : 115);
      let compartments;
      if (dbShip.compartmentData?.compartments && dbShip.compartmentData.compartments.length > 0) {
        compartments = dbShip.compartmentData.compartments.map(c => ({
          id: c.id, position: c.position as any, deck: c.deck as any, side: c.side as any, type: c.type as any,
          name: c.name, maxHP: c.maxHP, currentHP: c.currentHP, status: c.status as any, watertight: c.watertight,
          armor: c.armor, flooded: 0, fire: 0, components: [], adjacentIds: [], lengthMeters: 10, positionFromBow: c.gridX * 5, gridX: c.gridX, gridY: c.gridY
        }));
      } else { compartments = createCompartments(dbShip.class as any, shipLength); }
      const stats = calculateShipStats(compartments);
      const totalHP = compartments.reduce((sum: number, c: any) => sum + c.maxHP, 0);
      let accuracy = 85; let damage = 50;
      if (dbShip.class === 'battleship') { accuracy = 90; damage = 60; } else if (dbShip.class === 'cruiser') { accuracy = 85; damage = 45; } else { accuracy = 80; damage = 35; }
      return {
        id: index + 1, type: dbShip.class as any, name: dbShip.name, maxHP: totalHP, currentHP: totalHP,
        q: Math.floor(Math.random() * 8), r: Math.floor(Math.random() * 25), heading: 0 as any,
        accuracy, damage, speed: Math.round(dbShip.speed / 10), range: dbShip.range,
        hasMoved: false, hasFired: false, compartments, stats, battleLog: [], isSunk: false,
        length: dbShip.length, beam: dbShip.beam, draft: dbShip.draft,
        backgroundImage: dbShip.compartmentData?.backgroundImage, backgroundPosition: dbShip.compartmentData?.backgroundPosition,
      };
    });

    const eShips = enemyDBShips.map((dbShip, index) => {
      const shipLength = dbShip.length || (dbShip.class === 'battleship' ? 250 : dbShip.class === 'cruiser' ? 200 : 115);
      let compartments;
      if (dbShip.compartmentData?.compartments && dbShip.compartmentData.compartments.length > 0) {
        compartments = dbShip.compartmentData.compartments.map(c => ({
          id: c.id, position: c.position as any, deck: c.deck as any, side: c.side as any, type: c.type as any,
          name: c.name, maxHP: c.maxHP, currentHP: c.currentHP, status: c.status as any, watertight: c.watertight,
          armor: c.armor, flooded: 0, fire: 0, components: [], adjacentIds: [], lengthMeters: 10, positionFromBow: c.gridX * 5, gridX: c.gridX, gridY: c.gridY
        }));
      } else { compartments = createCompartments(dbShip.class as any, shipLength); }
      const stats = calculateShipStats(compartments);
      const totalHP = compartments.reduce((sum: number, c: any) => sum + c.maxHP, 0);
      let accuracy = 70; let damage = 30;
      if (dbShip.class === 'battleship') { accuracy = 80; damage = 45; } else if (dbShip.class === 'cruiser') { accuracy = 75; damage = 35; } else { accuracy = 70; damage = 25; }
      return {
        id: index + 100, type: dbShip.class as any, name: dbShip.name, maxHP: totalHP, currentHP: totalHP,
        q: 25 - Math.floor(Math.random() * 8), r: Math.floor(Math.random() * 25), heading: 3 as any,
        accuracy, damage, speed: Math.round(dbShip.speed / 10), range: dbShip.range,
        hasMoved: false, hasFired: false, compartments, stats, battleLog: [], isSunk: false,
        length: dbShip.length, beam: dbShip.beam, draft: dbShip.draft,
        backgroundImage: dbShip.compartmentData?.backgroundImage, backgroundPosition: dbShip.compartmentData?.backgroundPosition,
      };
    });

    setPlayerShips(pShips); setEnemyShips(eShips); setScreen('battle'); setPhase('movement');
    setCurrentShipIndex(0); setMessage(`Ход 1: Фаза движения. Выберите корабль для перемещения.`); resetAI();
  }, []);

  const handleShipClickForDetail = useCallback((ship: Ship) => {
    if (phase === 'movement' && ship.currentHP > 0 && !ship.hasMoved) {
      setSelectedShipForMove(ship); setSelectedShipForDetail(ship);
      const reachable = getReachableHexes(ship, [...playerShips, ...enemyShips].filter(s => s.currentHP > 0));
      setReachableHexes(reachable);
      setMessage(`${shipIcon(ship.type)} ${ship.name} выбран. Выберите клетку (макс. ${ship.speed} гексов). ПКМ - пропустить.`);
    } else { setSelectedShipForDetail(ship); }
  }, [phase, playerShips, enemyShips]);

  const handleShipRightClick = useCallback((e: React.MouseEvent, ship: Ship) => {
    e.preventDefault(); e.stopPropagation();
    if (phase === 'movement' && selectedShipForMove?.id === ship.id) {
      const updatedShips = playerShips.map(s => s.id === ship.id ? { ...s, hasMoved: true } : s);
      setPlayerShips(updatedShips); setSelectedShipForMove(null); setReachableHexes([]);
      const allMoved = updatedShips.filter(s => s.currentHP > 0).every(s => s.hasMoved);
      if (allMoved) {
        setMessage('Все корабли обработаны! Переход к фазе планирования...');
        setTimeout(() => { setPhase('planning'); const firstAlive = updatedShips.findIndex(s => s.currentHP > 0); if (firstAlive !== -1) { setCurrentShipIndex(firstAlive); setMessage(`Ход ${turnNumber}: Выберите цель для ${shipIcon(updatedShips[firstAlive].type)} ${updatedShips[firstAlive].name}`); } }, 1000);
      } else { setMessage('Выберите следующий корабль для перемещения.'); }
    }
  }, [phase, selectedShipForMove, playerShips, turnNumber]);

  const handleMoveClick = useCallback((q: number, r: number) => {
    if (phase !== 'movement' || !selectedShipForMove) return;
    const isReachable = reachableHexes.some(h => h.q === q && h.r === r);
    if (!isReachable) return;
    const isOccupied = [...playerShips, ...enemyShips].some(s => s.q === q && s.r === r && s.currentHP > 0 && s.id !== selectedShipForMove.id);
    const isOrderOccupied = Array.from(movementOrders.entries()).some(([shipId, dest]) => shipId !== selectedShipForMove.id && dest.q === q && dest.r === r);
    if (isOccupied || isOrderOccupied) { setMessage('⚠️ Клетка занята!'); return; }
    const newOrders = new Map(movementOrders); newOrders.set(selectedShipForMove.id, { q, r }); setMovementOrders(newOrders);
    const updatedShips = playerShips.map(s => s.id === selectedShipForMove.id ? { ...s, hasMoved: true } : s);
    setPlayerShips(updatedShips); setSelectedShipForMove(null); setReachableHexes([]);
    const allMoved = updatedShips.filter(s => s.currentHP > 0).every(s => s.hasMoved);
    if (allMoved) {
      setMessage('Все приказы отданы! Переход к планированию атаки...');
      setTimeout(() => { setPhase('planning'); const firstAlive = updatedShips.findIndex(s => s.currentHP > 0); if (firstAlive !== -1) { setCurrentShipIndex(firstAlive); setMessage(`Ход ${turnNumber}: Выберите цель для ${shipIcon(updatedShips[firstAlive].type)} ${updatedShips[firstAlive].name}`); } }, 1000);
    } else { setMessage('Выберите следующий корабль.'); }
  }, [phase, selectedShipForMove, reachableHexes, playerShips, turnNumber, movementOrders]);

  const handleCellClick = useCallback((q: number, r: number) => {
    if (phase === 'movement') { handleMoveClick(q, r); return; }
    if (phase !== 'planning') return;
    const currentShip = playerShips[currentShipIndex];
    if (!currentShip || currentShip.currentHP <= 0) return;
    const isOwnShip = playerShips.some(s => s.q === q && s.r === r && s.currentHP > 0);
    if (isOwnShip) { setMessage('⚠️ Нельзя стрелять по своим!'); return; }
    const targetShip = enemyShips.find(s => s.q === q && s.r === r && s.currentHP > 0);
    if (!targetShip) { setMessage('⚠️ Нет вражеского корабля!'); return; }
    const distance = hexDistance(currentShip.q, currentShip.r, q, r);
    if (distance > currentShip.range) { setMessage(`⚠️ Вне дальности! Макс: ${currentShip.range}`); return; }
    setSelectedTarget({ shipId: targetShip.id });
    setMessage(`${shipIcon(currentShip.type)} ${currentShip.name} → цель: ${targetShip.name}. Подтвердить?`);
  }, [phase, playerShips, currentShipIndex, handleMoveClick]);

  const confirmShot = useCallback(() => {
    if (!selectedTarget) return;
    const currentShip = playerShips[currentShipIndex];
    if (!currentShip) return;
    const targetShipId = selectedTarget.shipId;
    const newTarget = { shipId: currentShip.id, targetShipId };
    const updatedTargets = [...playerShotTargets, newTarget];
    setPlayerShotTargetsWithRef(updatedTargets);
    const nextAlive = playerShips.findIndex((s, i) => i > currentShipIndex && s.currentHP > 0);
    if (nextAlive !== -1) { setCurrentShipIndex(nextAlive); setSelectedTarget(null); setMessage(`Выберите цель для ${shipIcon(playerShips[nextAlive].type)} ${playerShips[nextAlive].name}`); }
    else { setMessage('Все корабли выбрали цели! Выполнение...'); setTimeout(() => executePhase(), 1000); }
  }, [selectedTarget, playerShips, currentShipIndex, playerShotTargets]);

  const skipShot = useCallback(() => {
    const currentShip = playerShips[currentShipIndex];
    if (!currentShip) return;
    setMessage(`${shipIcon(currentShip.type)} ${currentShip.name} пропустил`);
    const nextAlive = playerShips.findIndex((s, i) => i > currentShipIndex && s.currentHP > 0);
    if (nextAlive !== -1) { setCurrentShipIndex(nextAlive); setSelectedTarget(null); setTimeout(() => setMessage(`Выберите цель для ${shipIcon(playerShips[nextAlive].type)} ${playerShips[nextAlive].name}`), 500); }
    else { setMessage('Все обработаны! Выполнение...'); setTimeout(() => executePhase(), 1000); }
  }, [playerShips, currentShipIndex]);

  const nextTurn = useCallback(() => {
    setTurnNumber(t => t + 1); setPhase('movement'); setCurrentShipIndex(0);
    setSelectedTarget(null); setPlayerShotTargetsWithRef([]); setPlayerShots([]); setEnemyShots([]);
    setSelectedShipForMove(null); setReachableHexes([]); setHitMarkers([]);
    setMovementOrders(new Map()); setShotAnimations([]);
    setPlayerShips(prev => prev.map(s => ({ ...s, hasMoved: false, hasFired: false })));
    setEnemyShips(prev => prev.map(s => ({ ...s, hasMoved: false, hasFired: false })));
    setTimeout(() => {
      setEnemyShips(prev => {
        const moves = generateAIMoves(prev, playerShips);
        let updated = [...prev];
        moves.forEach(move => {
          const ship = prev.find(s => s.id === move.shipId);
          const newHeading = ship ? getHeading(move.fromQ, move.fromR, move.toQ, move.toR) : 0;
          setEnemyTrajectories(t => [...t, { shipId: move.shipId, path: [{ q: move.fromQ, r: move.fromR }, { q: move.toQ, r: move.toR }] }]);
          updated = updated.map(s => s.id === move.shipId ? { ...s, q: move.toQ, r: move.toR, heading: newHeading, hasMoved: true } : s);
        });
        return updated;
      });
      setMessage(`Ход ${turnNumber + 1}: Фаза движения. Выберите корабль.`);
    }, 500);
  }, [playerShips, turnNumber]);

  const executePhase = useCallback(() => {
    const currentTargets = playerShotTargetsRef.current;
    setPhase('execution'); setIsAnimating(true); setMessage('⚓ Исполнение приказов...');
    let updatedPlayerShips: Ship[] = []; let updatedEnemyShips: Ship[] = [];

    setTimeout(() => {
      updatedPlayerShips = playerShips.map(ship => {
        const destination = movementOrders.get(ship.id);
        if (destination) {
          const newHeading = getHeading(ship.q, ship.r, destination.q, destination.r);
          setPlayerTrajectories(prev => [...prev, { shipId: ship.id, path: [{ q: ship.q, r: ship.r }, { q: destination.q, r: destination.r }] }]);
          return { ...ship, q: destination.q, r: destination.r, heading: newHeading };
        }
        return ship;
      });
      const enemyMoves = generateAIMoves(enemyShips, updatedPlayerShips);
      updatedEnemyShips = enemyShips.map(ship => {
        const move = enemyMoves.find(m => m.shipId === ship.id);
        if (move) {
          const newHeading = getHeading(move.fromQ, move.fromR, move.toQ, move.toR);
          setEnemyTrajectories(prev => [...prev, { shipId: ship.id, path: [{ q: move.fromQ, r: move.fromR }, { q: move.toQ, r: move.toR }] }]);
          return { ...ship, q: move.toQ, r: move.toR, heading: newHeading };
        }
        return ship;
      });
      setPlayerShips(updatedPlayerShips); setEnemyShips(updatedEnemyShips); setMovementOrders(new Map());

      const playerShotAnims = currentTargets.map((t, idx) => {
        const attacker = updatedPlayerShips.find(s => s.id === t.shipId);
        const target = updatedEnemyShips.find(s => s.id === t.targetShipId);
        if (attacker && target) return { from: { q: attacker.q, r: attacker.r }, to: { q: target.q, r: target.r }, id: Date.now() + idx };
        return null;
      }).filter(a => a !== null) as Array<{from: {q: number; r: number}; to: {q: number; r: number}; id: number}>;
      setShotAnimations(playerShotAnims);

      setTimeout(() => {
        const playerResult = executeShots(currentTargets, updatedPlayerShips, updatedEnemyShips);
        updatedEnemyShips = playerResult.updatedShips; setPlayerShots(playerResult.shots);
        const playerHitMarkers: Array<{shipId: number; compartmentId: string; turn: number; damage: number}> = [];
        playerResult.shots.filter(s => s.hit && s.targetShipId).forEach(shot => {
          const targetShip = updatedEnemyShips.find(s => s.id === shot.targetShipId);
          if (targetShip) { const dc = targetShip.compartments.find(c => c.status !== 'intact' && c.currentHP < c.maxHP); if (dc) playerHitMarkers.push({ shipId: shot.targetShipId!, compartmentId: dc.id, turn: turnNumber, damage: shot.damage }); }
        });
        const enemyShotTargets = generateAIShots(enemyShips, updatedPlayerShips);
        const enemyResult = executeShots(enemyShotTargets, enemyShips, updatedPlayerShips);
        updatedPlayerShips = enemyResult.updatedShips; setEnemyShots(enemyResult.shots);
        const enemyHitMarkers: Array<{shipId: number; compartmentId: string; turn: number; damage: number}> = [];
        enemyResult.shots.filter(s => s.hit && s.targetShipId).forEach(shot => {
          const targetShip = updatedPlayerShips.find(s => s.id === shot.targetShipId);
          if (targetShip) { const dc = targetShip.compartments.find(c => c.status !== 'intact' && c.currentHP < c.maxHP); if (dc) enemyHitMarkers.push({ shipId: shot.targetShipId!, compartmentId: dc.id, turn: turnNumber, damage: shot.damage }); }
        });
        setHitMarkers(prev => [...prev, ...playerHitMarkers, ...enemyHitMarkers]);
        updateAIAfterShots(enemyResult.shots, enemyResult.updatedShips);
        const propagationResult = processDamagePropagation([...updatedPlayerShips, ...updatedEnemyShips], turnNumber);
        updatedPlayerShips = propagationResult.ships.filter(s => s.id < 100);
        updatedEnemyShips = propagationResult.ships.filter(s => s.id >= 100);
        setPlayerShips(updatedPlayerShips); setEnemyShips(updatedEnemyShips);
        const playerShotLogs: BattleLogEntry[] = playerResult.shots.map(s => ({
          id: `log_${Date.now()}_${Math.random()}`, turn: turnNumber, timestamp: Date.now(),
          type: s.hit ? 'shot_hit' as const : 'shot_miss' as const, shipId: s.shipId, shipName: s.shipName,
          message: s.hit ? `🎯 ${s.shipName} попал в ${s.targetShipName} (${s.damage})` : `💨 ${s.shipName} промахнулся`,
          severity: s.hit ? 'info' as const : 'warning' as const
        }));
        const enemyShotLogs: BattleLogEntry[] = enemyResult.shots.map(s => ({
          id: `log_${Date.now()}_${Math.random()}`, turn: turnNumber, timestamp: Date.now(),
          type: s.hit ? 'shot_hit' as const : 'shot_miss' as const, shipId: s.shipId, shipName: s.shipName,
          message: s.hit ? `🎯 Вражеский ${s.shipName} попал в ${s.targetShipName}` : `💨 Вражеский ${s.shipName} промахнулся`,
          severity: s.hit ? 'critical' as const : 'warning' as const
        }));
        setBattleLog(prev => [...prev, ...playerShotLogs, ...enemyShotLogs, ...propagationResult.allLogs]);
        setIsAnimating(false); setPhase('results'); setShotAnimations([]);
        if (allShipsSunk(updatedPlayerShips)) { setMessage('💀 Поражение!'); setPhase('gameOver'); }
        else if (allShipsSunk(updatedEnemyShips)) { setMessage('🏆 Победа!'); setPhase('gameOver'); }
        else { setTimeout(() => nextTurn(), 2000); }
      }, 1000);
    }, 1500);
  }, [playerShips, enemyShips, turnNumber, movementOrders, nextTurn]);

  const resetGame = () => {
    setScreen('menu'); setPhase('placement'); setPlayerShips([]); setEnemyShips([]);
    setPlayerShotTargetsWithRef([]); setPlayerShots([]); setEnemyShots([]);
    setSelectedTarget(null); setCurrentShipIndex(0); setTurnNumber(1);
    setSelectedShipForMove(null); setReachableHexes([]); setPlayerTrajectories([]);
    setEnemyTrajectories([]); setIsAnimating(false); setSelectedShipForDetail(null);
    setBattleLog([]); setShowBattleLog(false); resetAI();
  };

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">⚓ Морской Бой</h1>
            <p className="text-xl text-blue-200">Тактическая игра WeGO</p>
          </div>
          <div className="space-y-4">
            <button onClick={() => setScreen('database')} className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">🔧 Редактор</button>
            <button onClick={() => setScreen('mapEditor')} className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg">🗺️ Редактор карты</button>
            <button onClick={() => setScreen('selection')} className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-bold text-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-lg">⚔️ Начать бой</button>
            <button onClick={() => setScreen('campaign')} className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg font-bold text-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg">🗺️ Кампания</button>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400"><p>Версия с базой данных кораблей и стратегической картой</p></div>
        </div>
      </div>
    );
  }

  if (screen === 'database') {
    return (<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4"><div className="max-w-7xl mx-auto"><div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold text-cyan-300">📚 Управление базой данных</h1><button onClick={() => setScreen('menu')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">← Назад</button></div><ShipDatabaseManager /></div></div>);
  }

  if (screen === 'selection') {
    return (<div><div className="bg-slate-900 p-2 flex justify-between items-center"><button onClick={() => setScreen('menu')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">← Назад</button></div><ShipSelectionScreen onStartBattle={startBattleFromDB} /></div>);
  }

  if (screen === 'mapEditor') {
    return (<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4"><div className="max-w-7xl mx-auto"><div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold text-cyan-300">🗺️ Редактор стратегической карты</h1><button onClick={() => setScreen('menu')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">← Назад</button></div><StrategicMapEditor strategicMapData={strategicMapData} onUpdate={async (data) => { setStrategicMapData(data); try { await saveToIndexedDB(data); } catch (error) { console.error('Ошибка:', error); } }} /></div></div>);
  }

  if (screen === 'campaign') {
    return <StrategicMap onBack={() => setScreen('menu')} strategicMapData={strategicMapData} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-1">
      <div className="w-full">
        {phase !== 'placement' && (
          <div className="flex flex-row justify-start gap-2 items-start">
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="flex flex-col gap-2">
                {phase === 'planning' && selectedTarget && <button onClick={confirmShot} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-700 transition-all shadow-lg animate-pulse text-sm">🎯 Подтвердить выстрел</button>}
                {phase === 'planning' && <button onClick={skipShot} className="px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg font-semibold hover:from-slate-600 hover:to-slate-700 transition-all shadow-lg text-sm">⏭️ Пропустить выстрел</button>}
                {(phase === 'results' || phase === 'gameOver') && battleLog.length > 0 && <button onClick={() => setShowBattleLog(!showBattleLog)} className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg font-semibold text-sm">📜 {showBattleLog ? 'Скрыть' : 'Показать'} журнал ({battleLog.length})</button>}
                {phase === 'gameOver' && <button onClick={resetGame} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg font-semibold text-sm">🔄 Новая игра</button>}
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-center"><div className="text-cyan-300 font-semibold mb-1 text-xs">🛡️ Ваш флот</div>
                  <div className="flex gap-1 text-xs flex-wrap justify-center max-w-[750px]">
                    {playerShips.map(ship => (<button key={ship.id} onClick={() => phase === 'movement' && handleShipClickForDetail(ship)} disabled={ship.currentHP <= 0 || ship.hasMoved || ship.isSunk} className={`px-2 py-1 rounded transition-all ${ship.isSunk ? 'bg-gray-900/70 text-gray-400 line-through opacity-60' : ship.currentHP <= 0 ? 'bg-red-900/50 text-red-300 line-through opacity-50' : selectedShipForMove?.id === ship.id ? 'bg-green-600/70 text-green-100 ring-2 ring-green-400' : phase === 'movement' && !ship.hasMoved ? 'bg-blue-700/50 text-blue-200 hover:bg-blue-600/50 cursor-pointer' : 'bg-slate-700/50 text-slate-300'}`}>{shipIcon(ship.type)} {ship.currentHP}/{ship.maxHP}{ship.stats.fires > 0 && <span className="ml-1">🔥</span>}{ship.isSunk && <span className="ml-1">☠️</span>}</button>))}
                  </div>
                </div>
                <div className="text-center"><div className="text-red-300 font-semibold mb-1 text-xs">🎯 Вражеский флот</div>
                  <div className="flex gap-1 text-xs flex-wrap justify-center max-w-[750px]">
                    {enemyShips.map(ship => (<div key={ship.id} className={`px-2 py-1 rounded ${ship.isSunk ? 'bg-gray-900/70 text-gray-400 line-through opacity-60' : ship.currentHP <= 0 ? 'bg-red-900/50 text-red-300 line-through opacity-50' : ship.currentHP < ship.maxHP ? 'bg-orange-600/50 text-orange-200' : 'bg-slate-700/50 text-slate-300'}`}>{shipIcon(ship.type)} {ship.currentHP}/{ship.maxHP}{ship.isSunk && <span className="ml-1">☠️</span>}</div>))}
                  </div>
                </div>
              </div>
              <BattleShipDetailCard ship={selectedShipForDetail} hitMarkers={hitMarkers} />
              {showBattleLog && <BattleLog entries={battleLog} title="Журнал боя" />}
            </div>
            <div className="flex-1 overflow-auto">
              <HexGrid playerShips={playerShips} enemyShips={enemyShips} phase={phase} selectedTarget={selectedTarget} shotTargets={playerShotTargets} shots={playerShots} enemyShots={enemyShots} selectedShipForMove={selectedShipForMove} reachableHexes={reachableHexes} attackingShip={playerShips[currentShipIndex]} playerTrajectories={playerTrajectories} enemyTrajectories={enemyTrajectories} isAnimating={isAnimating} movementOrders={movementOrders} shotAnimations={shotAnimations} onCellClick={handleCellClick} onShipClick={handleShipClickForDetail} onShipRightClick={handleShipRightClick} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
