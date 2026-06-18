import React, { useMemo } from 'react';
import { WallSegment, getFloorHeight } from '../data/buildingPassport';
import * as THREE from 'three';

interface WallBuilderProps {
  walls: WallSegment[];
  activeFloor: number;
  opacity?: number;
}

export function WallBuilder({ walls, activeFloor, opacity = 1 }: WallBuilderProps) {
  // Эта функция берёт массив отрезков стен из твоего паспорта
  // и автоматически высчитывает все необходимые 3D параметры:
  // длину, координаты центра и точный угол поворота (в радианах).
  const computedWalls = useMemo(() => {
    return walls.map(wall => {
      // 1. Вычисляем разницу координат (dx, dz)
      const dx = wall.end[0] - wall.start[0];
      const dz = wall.end[1] - wall.start[1];
      
      // 2. Длина стены по теореме Пифагора
      const length = Math.sqrt(dx * dx + dz * dz);
      
      // 3. Высчитываем угол наклона стены. 
      // В Three.js поворот по оси Y идет против часовой стрелки,
      // а X/Z ложатся в плоскость земли. atan2(dx, dz) идеально выравнивает наш куб!
      const angle = Math.atan2(dx, dz); 
      
      // 4. Получаем точную высоту текущего этажа из функции
      const height = getFloorHeight(wall.floor);
      
      // 5. Вычисляем базовую высоту Y. 
      // Нужно сложить высоты всех предыдущих этажей, чтобы стена стояла на правильном уровне
      let baseElevation = 0;
      for (let i = 1; i < wall.floor; i++) {
        baseElevation += getFloorHeight(i);
      }

      // Центр стены (смещение для Three.js всегда задается от центра объекта)
      const cx = (wall.start[0] + wall.end[0]) / 2;
      const cz = (wall.start[1] + wall.end[1]) / 2;
      const cy = baseElevation + (height / 2);

      return {
        ...wall,
        length,
        angle,
        height,
        center: [cx, cy, cz] as [number, number, number]
      };
    });
  }, [walls]);

  return (
    <group>
      {computedWalls.map((w) => {
        // Рендерим только стены активного этажа (или можно добавить логику показа нижних этажей)
        if (w.floor > activeFloor) return null;
        
        // Делаем нижние этажи полупрозрачными или просто 100% непрозрачными, если это активный этаж
        const isCurrentFloor = w.floor === activeFloor;
        const currentOpacity = isCurrentFloor ? opacity : opacity * 0.15;

        return (
          <mesh 
            key={w.id} 
            position={w.center} 
            rotation={[0, w.angle, 0]}
            castShadow
            receiveShadow
          >
            {/* 
              Поворачиваем геометрию коробки так, чтобы wall thickness шел по оси X,
              высота по Y, а длина вдоль оси Z (что соответствует углу поворота)
            */}
            <boxGeometry args={[w.thickness, w.height, w.length]} />
            <meshStandardMaterial 
              color={w.isOuter ? "#64748b" : "#cbd5e1"} 
              roughness={w.isOuter ? 0.8 : 0.6}
              metalness={w.isOuter ? 0.2 : 0.1}
              transparent={currentOpacity < 1}
              opacity={currentOpacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

