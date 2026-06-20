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
  // зоны добавляются по разметке с чертежа
];
