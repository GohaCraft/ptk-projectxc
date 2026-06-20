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
    id: 'zone_f1_b1_top',
    name: 'Зона — Лит. Б1 (1 этаж, север)',
    floor: 1,
    block: 'B1',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [-19.65, 3.15, -10.38],
    size: [9.55, 3.3, 3.4],
    cameraPos: [-29.65, 8.15, -20.38],
    beforeImg: '/photos/floor1/left/zone_f1_b1_top_before.jpg',
    afterImg: '/photos/floor1/left/zone_f1_b1_top_after1.jpg',
    gallery: [
      '/photos/floor1/left/zone_f1_b1_top_after1.jpg',
      '/photos/floor1/left/zone_f1_b1_top_after2.jpg',
    ]
  },
  {
    id: 'zone_f1_central_hall',
    name: 'Центральный холл (Лит. Б)',
    floor: 1,
    block: 'B',
    roomNumber: '68',
    area: '341.1 м²',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [-1.25, 2.95, 6.44],
    size: [27.51, 2.9, 11.21],
    cameraPos: [-11.25, 7.95, -3.56],
    beforeImg: '/photos/floor1/center/zone_f1_central_hall_before.jpg',
    afterImg: '/photos/floor1/center/zone_f1_central_hall_after1.jpg',
    gallery: [
      '/photos/floor1/center/zone_f1_central_hall_after1.jpg',
      '/photos/floor1/center/zone_f1_central_hall_after2.jpg',
      '/photos/floor1/center/zone_f1_central_hall_after3.jpg',
    ]
  },
  {
    id: 'zone_f1_b1_bottom',
    name: 'Зона — Лит. Б1 (1 этаж, юг)',
    floor: 1,
    block: 'B1',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [-22.84, 3.15, 23.51],
    size: [3.67, 3.3, 24.52],
    cameraPos: [-32.84, 8.15, 13.51],
    beforeImg: '/photos/floor1/left/zone_f1_b1_bottom_before.jpg',
    afterImg: '/photos/floor1/left/zone_f1_b1_bottom_after1.jpg',
    gallery: [
      '/photos/floor1/left/zone_f1_b1_bottom_after1.jpg',
    ]
  },
  {
    id: 'zone_f2_b1_top',
    name: 'Зона — Лит. Б1 (2 этаж, север)',
    floor: 2,
    block: 'B1',
    roomNumber: '26/27',
    area: '—',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [-20.13, 6.45, -9.46],
    size: [9.02, 3.3, 4.24],
    cameraPos: [-30.13, 11.45, -19.46],
    beforeImg: '/photos/floor2/left/zone_f2_b1_top_before.jpg',
    afterImg: '/photos/floor2/left/zone_f2_b1_top_after1.jpg',
    gallery: [
      '/photos/floor2/left/zone_f2_b1_top_after1.jpg',
    ]
  },
  {
    id: 'zone_f3_b1_top',
    name: 'Зона — Лит. Б1 (3 этаж, север)',
    floor: 3,
    block: 'B1',
    roomNumber: '26',
    area: '—',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [-19.57, 9.75, -10.88],
    size: [9.39, 3.3, 3.96],
    cameraPos: [-29.57, 14.75, -20.88],
    beforeImg: '/photos/floor3/left/zone_f3_b1_top_before.jpg',
    afterImg: '/photos/floor3/left/zone_f3_b1_top_after1.jpg',
    gallery: [
      '/photos/floor3/left/zone_f3_b1_top_after1.jpg',
    ]
  },
  {
    id: 'zone_f3_b2_top',
    name: 'Зона — Лит. Б2 (3 этаж, север)',
    floor: 3,
    block: 'B2',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [21.96, 9.75, -17.49],
    size: [3.57, 3.3, 4.55],
    cameraPos: [31.96, 14.75, -27.49],
    beforeImg: '/photos/floor3/right/zone_f3_b2_top_before.jpg',
    afterImg: '/photos/floor3/right/zone_f3_b2_top_after1.jpg',
    gallery: [
      '/photos/floor3/right/zone_f3_b2_top_after1.jpg',
    ]
  },
  {
    id: 'zone_f4_b1_mid',
    name: 'Зона — Лит. Б1 (4 этаж)',
    floor: 4,
    block: 'B1',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [-23.34, 13.05, 8.94],
    size: [14.87, 3.3, 5.17],
    cameraPos: [-33.34, 18.05, -1.06],
    beforeImg: '/photos/floor4/left/zone_f4_b1_mid_before.jpg',
    afterImg: '/photos/floor4/left/zone_f4_b1_mid_after1.jpg',
    gallery: [
      '/photos/floor4/left/zone_f4_b1_mid_after1.jpg',
      '/photos/floor4/left/zone_f4_b1_mid_after2.jpg',
    ]
  },
  {
    id: 'zone_f4_b2_corridor',
    name: 'Зона — Лит. Б2 (4 этаж, коридор)',
    floor: 4,
    block: 'B2',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона',
    styleDesc: 'Фото будут добавлены в папку public/photos.',
    center: [17.44, 13.05, 0.06],
    size: [4.04, 3.3, 27.45],
    cameraPos: [27.44, 18.05, -9.94],
    beforeImg: '/photos/floor4/right/zone_f4_b2_corridor_before.jpg',
    afterImg: '/photos/floor4/right/zone_f4_b2_corridor_after1.jpg',
    gallery: [
      '/photos/floor4/right/zone_f4_b2_corridor_after1.jpg',
      '/photos/floor4/right/zone_f4_b2_corridor_after2.jpg',
    ]
  }
];
