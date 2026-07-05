import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type BoxPart = {
  args: [number, number, number];          // размеры бокса [w,h,d]
  pos: [number, number, number];           // позиция (локальная)
  rot?: [number, number, number];          // поворот (Эйлер), если нужен
};

/**
 * Склеивает набор боксов (с одним материалом) в ОДНУ геометрию.
 * Это позволяет рисовать десятки одинаковых деталей (пилястры, ниши, пояски)
 * за один draw call вместо десятков. Позиции/повороты «запекаются» в геометрию,
 * поэтому результирующий <mesh> ставится в начало координат группы.
 */
export function mergeBoxes(parts: BoxPart[]): THREE.BufferGeometry | null {
  if (!parts.length) return null;
  const geos = parts.map((p) => {
    const g = new THREE.BoxGeometry(p.args[0], p.args[1], p.args[2]);
    if (p.rot) { g.rotateX(p.rot[0]); g.rotateY(p.rot[1]); g.rotateZ(p.rot[2]); }
    g.translate(p.pos[0], p.pos[1], p.pos[2]);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}
