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
  }
];
