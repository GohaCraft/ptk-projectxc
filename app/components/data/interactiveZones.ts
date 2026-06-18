export interface InteractiveZone {
  id: string;
  name: string;
  floor: number;
  block: 'B' | 'B1' | 'B2';
  roomNumber: string;
  area: string;
  styleTitle: string;
  styleDesc: string;
  center: [number, number, number]; // [x, y, z] to focus
  size: [number, number, number];   // [w, h, d] for highlight box
  cameraPos: [number, number, number]; // focus camera translation
  beforeImg: string;
  afterImg: string;
  gallery: string[]; // multi-angle gallery photos
}

export const INTERACTIVE_ZONES: InteractiveZone[] = [
  {
    id: 'zone_room_108',
    name: 'Кабинет 108 — Творческий коворкинг',
    floor: 1,
    block: 'B1',
    roomNumber: '108',
    area: '84.0 м²',
    styleTitle: 'Скандинавский лофт',
    styleDesc: 'Светлые тона, открытые кирпичные стены, массивные деревянные балки, панорамные окна и функциональные рабочие островки для совместной работы.',
    center: [-27.105, 3.15, -14.96],
    size: [6.4, 2.96, 6.52],
    cameraPos: [-37.105, 7.5, -24.96],
    beforeImg: 'https://picsum.photos/seed/108before/800/600',
    afterImg: 'https://picsum.photos/seed/108after/800/600',
    gallery: [
      'https://picsum.photos/seed/108g1/800/600',
      'https://picsum.photos/seed/108g2/800/600',
      'https://picsum.photos/seed/108g3/800/600'
    ]
  },
  {
    id: 'zone_canteen',
    name: 'Столовая — Пищевой блок',
    floor: 1,
    block: 'B2',
    roomNumber: '114',
    area: '186.0 м²',
    styleTitle: 'Индустриальный минимализм',
    styleDesc: 'Просторный обеденный зал на первом этаже Лит. Б2. Столы из переработанных материалов, подвесное дизайнерское освещение и открытая кухня.',
    center: [21.305, 3.15, 4.915],
    size: [11.9, 3.3, 20.0],
    cameraPos: [11.305, 8.5, -5.085],
    beforeImg: 'https://picsum.photos/seed/canteen_before/800/600',
    afterImg: 'https://picsum.photos/seed/canteen_after/800/600',
    gallery: [
      'https://picsum.photos/seed/canteen_g1/800/600',
      'https://picsum.photos/seed/canteen_g2/800/600',
      'https://picsum.photos/seed/canteen_g3/800/600'
    ]
  },
  {
    id: 'zone_lobby',
    name: 'Центральный холл и гардероб',
    floor: 1,
    block: 'B',
    roomNumber: '100',
    area: '184.0 м²',
    styleTitle: 'Неоклассика с элементами хай-тек',
    styleDesc: 'Парадный вестибюль входной группы Литера Б. Гладкие наливные полы, футуристичные встроенные световые линии и отреставрированные кессонные потолки.',
    center: [0.0, 2.95, -0.55],
    size: [26.8, 2.9, 3.9],
    cameraPos: [0.0, 6.0, 10.0],
    beforeImg: 'https://picsum.photos/seed/lobby_before/800/600',
    afterImg: 'https://picsum.photos/seed/lobby_after/800/600',
    gallery: [
      'https://picsum.photos/seed/lobby_g1/800/600',
      'https://picsum.photos/seed/lobby_g2/800/600',
      'https://picsum.photos/seed/lobby_g3/800/600'
    ]
  },
  {
    id: 'zone_room_207',
    name: 'Компьютерная лаборатория 207',
    floor: 2,
    block: 'B',
    roomNumber: '207',
    area: '53.4 м²',
    styleTitle: 'Киберпанк техно-лаб',
    styleDesc: 'Передовая учебная лаборатория с эргономичными игровыми креслами, скрытым кабель-менеджментом, неоновой регулируемой подсветкой и VR-зоной.',
    center: [-6.0, 5.85, -5.0],
    size: [12.0, 2.9, 5.0],
    cameraPos: [-16.0, 10.0, -15.0],
    beforeImg: 'https://picsum.photos/seed/lab_before/800/600',
    afterImg: 'https://picsum.photos/seed/lab_after/800/600',
    gallery: [
      'https://picsum.photos/seed/lab_g1/800/600',
      'https://picsum.photos/seed/lab_g2/800/600',
      'https://picsum.photos/seed/lab_g3/800/600'
    ]
  },
  {
    id: 'zone_library',
    name: 'Читальный зал библиотеки',
    floor: 3,
    block: 'B',
    roomNumber: '321',
    area: '110.0 м²',
    styleTitle: 'Эко-урбанистическая библиотека',
    styleDesc: 'Светлый читальный зал на 3-м этаже Литера Б. Интегрированное фито-озеленение, акустические панели для шумоподавления и удобные кресла-коконы.',
    center: [-13.0, 8.75, 2.0],
    size: [4.0, 2.9, 14.0],
    cameraPos: [-23.0, 13.0, -8.0],
    beforeImg: 'https://picsum.photos/seed/lib_before/800/600',
    afterImg: 'https://picsum.photos/seed/lib_after/800/600',
    gallery: [
      'https://picsum.photos/seed/lib_g1/800/600',
      'https://picsum.photos/seed/lib_g2/800/600',
      'https://picsum.photos/seed/lib_g3/800/600'
    ]
  }
];
