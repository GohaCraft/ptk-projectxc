"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";

import { getProceduralTextures } from "./proceduralTextures";
export { getProceduralTextures };
export type { TextureSet } from "./proceduralTextures";


// ──────────────────────────────────────────────────────────────────
//  MATERIALS
// ──────────────────────────────────────────────────────────────────

export const PanelMaterial = ({ args, color = "#ffffff", ...props }: { args?: [number, number, number], color?: string, [key: string]: any }) => {
  const tex = getProceduralTextures();
  const args0 = args?.[0];
  const args1 = args?.[1];
  const maps = useMemo(() => {
    if (!tex) return null;
    const mw = tex.concreteMap.clone();
    const mb = tex.concreteBump.clone();
    const repeatX = args0 ? Math.max(1, args0 / 3) : 4;
    const repeatY = args1 ? Math.max(1, args1 / 3) : 3;
    mw.repeat.set(repeatX, repeatY);
    mb.repeat.set(repeatX, repeatY);
    return { map: mw, bump: mb };
  }, [tex, args0, args1]);
  if (!maps) return <meshStandardMaterial color="#7A7A65" roughness={0.95} side={THREE.DoubleSide} {...props} />;
  return (
    <meshStandardMaterial
      map={maps.map}
      bumpMap={maps.bump}
      bumpScale={0.8}
      roughness={0.80}
      metalness={0.06}
      color={color}
      side={THREE.DoubleSide}
      {...props}
    />
  );
};

export const StuccoMaterial = ({ args, color = "#ffffff", ...props }: { args?: [number, number, number], color?: string, [key: string]: any }) => {
  const tex = getProceduralTextures();
  const args0 = args?.[0];
  const args1 = args?.[1];
  const maps = useMemo(() => {
    if (!tex) return null;
    const mw = tex.stuccoMap.clone();
    const mb = tex.stuccoBump.clone();
    const repeatX = args0 ? Math.max(2, args0 * 0.6) : 4;
    const repeatY = args1 ? Math.max(2, args1 * 1.5) : 3;
    mw.repeat.set(repeatX, repeatY);
    mb.repeat.set(repeatX, repeatY);
    return { map: mw, bump: mb };
  }, [tex, args0, args1]);
  if (!maps) return <meshStandardMaterial color="#5E2E2E" roughness={1} side={THREE.DoubleSide} {...props} />;
  return (
    <meshStandardMaterial
      map={maps.map}
      bumpMap={maps.bump}
      bumpScale={1.2}
      roughness={0.84}
      metalness={0.04}
      color={color}
      side={THREE.DoubleSide}
      {...props}
    />
  );
};

export const BrickMaterial = ({ args, ...props }: { args?: [number, number, number], [key: string]: any }) => {
  const tex = getProceduralTextures();
  const args0 = args?.[0];
  const args1 = args?.[1];
  const maps = useMemo(() => {
    if (!tex) return null;
    const mw = tex.brickMap.clone();
    const mb = tex.brickBump.clone();
    const repeatX = args0 ? Math.max(0.2, args0 / 2.0) : 1;
    const repeatY = args1 ? Math.max(0.2, args1 / 2.4) : 1;
    mw.repeat.set(repeatX, repeatY);
    mb.repeat.set(repeatX, repeatY);
    return { map: mw, bump: mb };
  }, [tex, args0, args1]);
  if (!maps) return <meshStandardMaterial color="#A0432A" roughness={0.85} side={THREE.DoubleSide} {...props} />;
  return (
    <meshStandardMaterial
      map={maps.map}
      bumpMap={maps.bump}
      bumpScale={0.6}
      roughness={0.88}
      color="#ffffff"
      side={THREE.DoubleSide}
      {...props}
    />
  );
};

export const BeltMaterial = ({ args, ...props }: { args?: [number, number, number], [key: string]: any }) => {
  const tex = getProceduralTextures();
  const args0 = args?.[0];
  const m = useMemo(() => {
    if (!tex) return null;
    const mw = tex.beltMap.clone();
    const repeatX = args0 ? Math.max(1, args0 / 2) : 4;
    mw.repeat.set(repeatX, 1);
    return mw;
  }, [tex, args0]);
  if (!m) return <meshStandardMaterial color="#9B928A" roughness={0.9} side={THREE.DoubleSide} {...props} />;
  return <meshStandardMaterial map={m} roughness={0.9} side={THREE.DoubleSide} {...props} />;
};

export const MetalDarkMaterial = () => {
  const tex = getProceduralTextures();
  return <meshStandardMaterial color="#362923" roughnessMap={tex?.metalRoughness} metalness={0.6} roughness={0.7} side={THREE.DoubleSide} />;
};

export const RampMetalMaterial = () => {
  const tex = getProceduralTextures();
  return <meshStandardMaterial color="#b35144" roughnessMap={tex?.metalRoughness} metalness={0.5} roughness={0.8} side={THREE.DoubleSide} />;
};

export const RampFloorMaterial = ({ args }: { args?: [number, number] }) => {
  const tex = getProceduralTextures();
  const args0 = args?.[0];
  const args1 = args?.[1];

  const maps = useMemo(() => {
    if (!tex) return { map: null, alphaMap: null };
    const map = tex.rampFloorMap.clone();
    const alphaMap = tex.rampFloorAlphaMap.clone();

    const repeatX = args0 ? Math.max(1, args0 * 3) : 5;
    const repeatY = args1 ? Math.max(1, args1 * 3) : 10;
    map.repeat.set(repeatX, repeatY);
    alphaMap.repeat.set(repeatX, repeatY);

    return { map, alphaMap };
  }, [tex, args0, args1]);

  useEffect(() => {
    return () => {
      if (maps.map) maps.map.dispose();
      if (maps.alphaMap) maps.alphaMap.dispose();
    };
  }, [maps]);

  if (!maps.map) return <meshStandardMaterial color="#b35144" roughness={0.9} />;
  
  return (
    <meshStandardMaterial 
      color="#d46a5b"
      map={maps.map} 
      alphaMap={maps.alphaMap} 
      alphaTest={0.4} 
      roughness={0.9} 
      metalness={0.4}
      side={THREE.DoubleSide}
      roughnessMap={tex?.metalRoughness}
    />
  );
};


export const GreyConcreteMaterial = () => (
  <meshStandardMaterial color="#7A7470" roughness={0.92} metalness={0.0} side={THREE.DoubleSide} />
);

export const DirtyRubberTreadMaterial = () => {
  const tex = getProceduralTextures();
  if (!tex) {
     return <meshStandardMaterial color="#802621" roughness={1.0} />;
  }

  return (
    <meshStandardMaterial 
       map={tex.dirtyRubberMap} 
       roughness={1.0} 
       bumpScale={0.02} 
       color="#ffffff"
    />
  );
};

export const ConcreteMaterial = StuccoMaterial;
