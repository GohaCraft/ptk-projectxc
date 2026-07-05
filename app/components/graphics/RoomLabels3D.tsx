"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  СЛОЙ НОМЕРОВ АУДИТОРИЙ (3D)
//
//  Небольшие цифры-билборды над кабинетами активного этажа. Оптимизация:
//   • рендерится ТОЛЬКО этаж, на который смотрим (1..5); на «К» (вся модель)
//    и в меню слой вообще не монтируется — 0 нагрузки;
//   • позиции предрассчитаны один раз на загрузке (roomLabels3D.ts);
//   • метки не участвуют в raycast — не перехватывают клики по зонам;
//   • один общий стиль текста, без теней.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import { ROOM_LABELS_BY_FLOOR } from '../data/roomLabels3D';

const noRaycast = () => null;

export function RoomLabels3D({ activeFloor }: { activeFloor: number }) {
  const labels = ROOM_LABELS_BY_FLOOR[activeFloor];
  if (!labels || labels.length === 0) return null;

  return (
    <group>
      {labels.map((l) => (
        <Billboard key={l.id} position={l.position}>
          <Text
            fontSize={0.62}
            color="#eaf6ff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#0b2036"
            raycast={noRaycast}
          >
            {l.id}
          </Text>
        </Billboard>
      ))}
    </group>
  );
}
