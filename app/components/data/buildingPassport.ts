export interface WallSegment {
  id: string;
  start: [number, number]; // [x, z] в метрах
  end: [number, number];   // [x, z] в метрах
  block: 'Б' | 'Б1' | 'Б2' | 'Б3' | 'Б4' | 'Б5';
  floor: number;
  isOuter: boolean;
  thickness: number;
}

// Вспомогательная функция для получения реальной высоты этажа из паспорта БТИ
export const getFloorHeight = (floor: number): number => {
  switch (floor) {
    case 1: return 2.96; // По паспорту 1 этаж (стр. 8)
    case 2: return 3.00; // По паспорту 2 этаж (стр. 10)
    case 3: return 3.02; // По паспорту 3 этаж (стр. 11)
    case 4: return 2.97; // По паспорту 4 этаж (стр. 14)
    case 5: return 2.90; // Мезонин (Лит Б4, Б5)
    default: return 3.00;
  }
};

// Функция программной генерации стен по точным расчетам площадей из тех. паспорта (Стр. 2, 18-21)
const parseBuildingPassport = (): WallSegment[] => {
  const walls: WallSegment[] = [];
  
  // Из поэтажных планов (стр. 18-21) и таблицы "Исчисление площадей" (стр. 2) ясно, 
  // что здание НЕ П-образное. Оно представляет собой замкнутое кольцо (О-образное)
  // со внутренним двором ("Второй свет") в центре. Левое крыло (Б1) вытянуто сильнее вниз.
  
  // Размеры блоков (из формул подсчета стр. 2)
  const leftWingWidth = 16.25; // Б1
  const leftWingLength = 56.47;
  
  const rightWingWidth = 13.30; // Б2
  const rightWingLength = 43.17;
  
  const courtWidth = 25.0; // Приблизительная ширина внутреннего двора
  
  // Координаты базиса (Центр 0,0 - центр внутреннего двора)
  const leftWingStart = - (courtWidth / 2) - leftWingWidth; // -28.75
  const leftWingEnd = - (courtWidth / 2);                   // -12.5
  
  const rightWingStart = (courtWidth / 2);                  // 12.5
  const rightWingEnd = (courtWidth / 2) + rightWingWidth;   // 25.8
  
  const topZ = -20; // Северный фасад
  
  // Левое крыло (Б1) длиннее: 56.47
  const leftWingBotZ = topZ + leftWingLength; // 36.47
  
  // Правое крыло (Б2) короче: 43.17. И центральный южный блок заканчивается вровень с ним (см. план этажа).
  const rightWingBotZ = topZ + rightWingLength; // 23.17
  const bottomZ = rightWingBotZ;
  
  // Внутренний двор
  const courtTopZ = -10;   // Северный блок шириной 10м
  const courtBotZ = 13.17; // Южный блок шириной 10м (23.17 - 10)
  
  let idC = 1;

  // Генерация 4х основных этажей
  for (let floor = 1; floor <= 4; floor++) {
    const th = 0.6; // Наружная стена ~60см

    // ==========================================
    // НАРУЖНЫЕ ФАСАДЫ (Уличные)
    // ==========================================
    const outerWalls = [
      // 1. Северный фасад (Верхняя общая прямая линия)
      { s: [leftWingStart, topZ], e: [rightWingEnd, topZ], block: 'Б' },
      
      // 2. Восточный фасад (Внешняя стена правого крыла)
      { s: [rightWingEnd, topZ], e: [rightWingEnd, rightWingBotZ], block: 'Б2' },
      
      // 3. Южный фасад центра + правого крыла (Низ)
      { s: [rightWingEnd, bottomZ], e: [leftWingEnd, bottomZ], block: 'Б' },
      
      // 4. Внутренняя сторона торчащей «ноги» левого крыла (Смотрит на восток)
      { s: [leftWingEnd, bottomZ], e: [leftWingEnd, leftWingBotZ], block: 'Б1' },
      
      // 5. Южный фасад левого крыла (Самый низ здания)
      { s: [leftWingEnd, leftWingBotZ], e: [leftWingStart, leftWingBotZ], block: 'Б1' },
      
      // 6. Западный фасад (Внешняя стена левого крыла)
      { s: [leftWingStart, leftWingBotZ], e: [leftWingStart, topZ], block: 'Б1' },
    ];

    // ==========================================
    // ВНУТРЕННИЕ ФАСАДЫ ("ВТОРОЙ СВЕТ" / ДВОР)
    // ==========================================
    const courtWalls = [
      // Северная стена двора
      { s: [leftWingEnd, courtTopZ], e: [rightWingStart, courtTopZ], block: 'Б' },
      // Восточная стена двора
      { s: [rightWingStart, courtTopZ], e: [rightWingStart, courtBotZ], block: 'Б2' },
      // Южная стена двора
      { s: [rightWingStart, courtBotZ], e: [leftWingEnd, courtBotZ], block: 'Б' },
      // Западная стена двора
      { s: [leftWingEnd, courtBotZ], e: [leftWingEnd, courtTopZ], block: 'Б1' },
    ];

    [...outerWalls, ...courtWalls].forEach(w => {
      walls.push({
        id: `f${floor}_out_${idC++}`,
        start: w.s as [number, number],
        end: w.e as [number, number],
        block: w.block as 'Б' | 'Б1' | 'Б2',
        floor, isOuter: true, thickness: th
      });
    });

    // ==========================================
    // ВНУТРЕННИЕ СТЕНЫ (КОРИДОРЫ, ТОЛЩИНА 0.2)
    // ==========================================
    const inTh = 0.2;
    // Левое крыло (Коридоры идут вдоль)
    walls.push(
      { id: `f${floor}_in_${idC++}`, start: [-22, topZ + 2], end: [-22, leftWingBotZ - 2], block: 'Б1', floor, isOuter: false, thickness: inTh },
      { id: `f${floor}_in_${idC++}`, start: [-19, topZ + 2], end: [-19, leftWingBotZ - 2], block: 'Б1', floor, isOuter: false, thickness: inTh }
    );
    // Правое крыло
    walls.push(
      { id: `f${floor}_in_${idC++}`, start: [20.5, topZ + 2], end: [20.5, rightWingBotZ - 2], block: 'Б2', floor, isOuter: false, thickness: inTh },
      { id: `f${floor}_in_${idC++}`, start: [17.5, topZ + 2], end: [17.5, rightWingBotZ - 2], block: 'Б2', floor, isOuter: false, thickness: inTh }
    );
    // Северный и Южный блоки (Соединительные)
    walls.push(
      { id: `f${floor}_in_${idC++}`, start: [-19, topZ + 4], end: [17.5, topZ + 4], block: 'Б', floor, isOuter: false, thickness: inTh },
      { id: `f${floor}_in_${idC++}`, start: [-19, courtBotZ + 3], end: [17.5, courtBotZ + 3], block: 'Б', floor, isOuter: false, thickness: inTh }
    );
  }

  return walls;
};

export const buildingPassport: WallSegment[] = parseBuildingPassport();

