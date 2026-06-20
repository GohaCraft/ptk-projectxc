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
    name: 'Зона 1 — Лит. Б1 (север)',
    floor: 1,
    block: 'B1',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Зона размечена по чертежу 1 этажа. Фото и описание будут привязаны позже.',
    center: [-19.65, 3.15, -10.38],
    size: [9.55, 3.3, 3.4],
    cameraPos: [-29.65, 8.15, -20.38],
    beforeImg: 'https://picsum.photos/seed/z1before/800/600',
    afterImg: 'https://picsum.photos/seed/z1after/800/600',
    gallery: []
  },
  {
    id: 'zone_f1_central_hall',
    name: 'Центральный холл (Лит. Б)',
    floor: 1,
    block: 'B',
    roomNumber: '68',
    area: '341.1 м²',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Большой вестибюль центрального блока (h = 4.25). Фото и описание будут привязаны позже.',
    center: [-1.25, 2.95, 6.44],
    size: [27.51, 2.9, 11.21],
    cameraPos: [-11.25, 7.95, -3.56],
    beforeImg: 'https://picsum.photos/seed/hallbefore/800/600',
    afterImg: 'https://picsum.photos/seed/hallafter/800/600',
    gallery: []
  },
  {
    id: 'zone_f1_b1_bottom',
    name: 'Зона 3 — Лит. Б1 (юг)',
    floor: 1,
    block: 'B1',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Зона размечена по чертежу 1 этажа. Фото и описание будут привязаны позже.',
    center: [-22.84, 3.15, 23.51],
    size: [3.67, 3.3, 24.52],
    cameraPos: [-32.84, 8.15, 13.51],
    beforeImg: 'https://picsum.photos/seed/z3before/800/600',
    afterImg: 'https://picsum.photos/seed/z3after/800/600',
    gallery: []
  },
  {
    id: 'zone_f2_b1_top',
    name: 'Зона — Лит. Б1 (2 этаж, север)',
    floor: 2,
    block: 'B1',
    roomNumber: '26/27',
    area: '—',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Зона размечена по чертежу 2 этажа. Фото и описание будут привязаны позже.',
    center: [-20.13, 6.45, -9.46],
    size: [9.02, 3.3, 4.24],
    cameraPos: [-30.13, 11.45, -19.46],
    beforeImg: 'https://picsum.photos/seed/z4before/800/600',
    afterImg: 'https://picsum.photos/seed/z4after/800/600',
    gallery: []
  },
  {
    id: 'zone_f3_b1_top',
    name: 'Зона — Лит. Б1 (3 этаж, север)',
    floor: 3,
    block: 'B1',
    roomNumber: '26',
    area: '—',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Зона размечена по чертежу 3 этажа. Фото и описание будут привязаны позже.',
    center: [-19.57, 9.75, -10.88],
    size: [9.39, 3.3, 3.96],
    cameraPos: [-29.57, 14.75, -20.88],
    beforeImg: 'https://picsum.photos/seed/z5before/800/600',
    afterImg: 'https://picsum.photos/seed/z5after/800/600',
    gallery: []
  },
  {
    id: 'zone_f3_b2_top',
    name: 'Зона — Лит. Б2 (3 этаж, север)',
    floor: 3,
    block: 'B2',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Зона размечена по чертежу 3 этажа. Фото и описание будут привязаны позже.',
    center: [21.96, 9.75, -17.49],
    size: [3.57, 3.3, 4.55],
    cameraPos: [31.96, 14.75, -27.49],
    beforeImg: 'https://picsum.photos/seed/z6before/800/600',
    afterImg: 'https://picsum.photos/seed/z6after/800/600',
    gallery: []
  },
  {
    id: 'zone_f4_b1_mid',
    name: 'Зона — Лит. Б1 (4 этаж)',
    floor: 4,
    block: 'B1',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Зона размечена по чертежу 4 этажа. Фото и описание будут привязаны позже.',
    center: [-23.34, 13.05, 8.94],
    size: [14.87, 3.3, 5.17],
    cameraPos: [-33.34, 18.05, -1.06],
    beforeImg: 'https://picsum.photos/seed/z7before/800/600',
    afterImg: 'https://picsum.photos/seed/z7after/800/600',
    gallery: []
  },
  {
    id: 'zone_f4_b2_corridor',
    name: 'Зона — Лит. Б2 (4 этаж, коридор)',
    floor: 4,
    block: 'B2',
    roomNumber: '—',
    area: '—',
    styleTitle: 'Зона (черновик)',
    styleDesc: 'Зона размечена по чертежу 4 этажа. Фото и описание будут привязаны позже.',
    center: [17.44, 13.05, 0.06],
    size: [4.04, 3.3, 27.45],
    cameraPos: [27.44, 18.05, -9.94],
    beforeImg: 'https://picsum.photos/seed/z8before/800/600',
    afterImg: 'https://picsum.photos/seed/z8after/800/600',
    gallery: []
  }
];
