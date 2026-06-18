"use client";

import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { InteractiveZone } from '../data/interactiveZones';

interface CameraManagerProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  isSliceMode?: boolean;
  activeFloor?: number;
  cameraMode?: 'orbit' | 'top' | 'flight';
  selectedZone?: InteractiveZone | null;
}

const getFloorHeight = (floor: number) => {
  if (floor === 1) return 1.5;
  if (floor === 2) return 4.4;
  if (floor === 2.5) return 5.85; // intermediate level
  if (floor === 3) return 7.3;
  if (floor === 3.5) return 8.75; // intermediate level
  if (floor === 4) return 10.2;
  if (floor === 5) return 13.1; // Student Attic level
  return 15.5; // Floor 6 / Roof Complete
};

export function CameraManager({ controlsRef, isSliceMode = false, activeFloor = 5, cameraMode = 'orbit', selectedZone = null }: CameraManagerProps) {
  const { camera } = useThree();

  const prevActiveFloor = useRef<number>(activeFloor);
  const prevCameraMode = useRef<'orbit' | 'top' | 'flight'>(cameraMode);
  const prevSelectedZone = useRef<InteractiveZone | null>(null);

  // Keyboard controls state
  const keys = useRef({
    w: false,
    s: false,
    a: false,
    d: false,
    q: false,
    e: false,
    space: false,
    shift: false,
  });

  const yaw = useRef<number>(0);
  const pitch = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const prevMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const { gl } = useThree();

  // Listen to keyboard for free flight
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      if (key === 'w' || key === 'ц' || code === 'ArrowUp') keys.current.w = true;
      if (key === 's' || key === 'ы' || code === 'ArrowDown') keys.current.s = true;
      if (key === 'a' || key === 'ф' || code === 'ArrowLeft') keys.current.a = true;
      if (key === 'd' || key === 'в' || code === 'ArrowRight') keys.current.d = true;
      if (key === 'q' || key === 'й') keys.current.q = true;
      if (key === 'e' || key === 'у') keys.current.e = true;
      if (code === 'Space') keys.current.space = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') keys.current.shift = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;

      if (key === 'w' || key === 'ц' || code === 'ArrowUp') keys.current.w = false;
      if (key === 's' || key === 'ы' || code === 'ArrowDown') keys.current.s = false;
      if (key === 'a' || key === 'ф' || code === 'ArrowLeft') keys.current.a = false;
      if (key === 'd' || key === 'в' || code === 'ArrowRight') keys.current.d = false;
      if (key === 'q' || key === 'й') keys.current.q = false;
      if (key === 'e' || key === 'у') keys.current.e = false;
      if (code === 'Space') keys.current.space = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') keys.current.shift = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize and synchronize yaw/pitch when switching to flight mode
  useEffect(() => {
    if (cameraMode === 'flight') {
      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.setFromQuaternion(camera.quaternion);
      yaw.current = euler.y;
      pitch.current = euler.x;
      
      // Initially focus the OrbitControls target ahead of the camera 
      if (controlsRef.current) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        controlsRef.current.target.copy(camera.position).addScaledVector(forward, 15);
        controlsRef.current.update();
      }
    }
  }, [cameraMode, camera, controlsRef]);

  // Direct custom mouse lookup for flight mode (1st person look around)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvasElement = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (cameraMode !== 'flight') return;
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
      try {
        canvasElement.setPointerCapture(e.pointerId);
      } catch (err) {
        // Safe check
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (cameraMode !== 'flight' || !isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      prevMouse.current = { x: e.clientX, y: e.clientY };

      const sens = 0.0025; // incredibly smooth and comfortable mouse look speed
      yaw.current -= dx * sens;
      pitch.current -= dy * sens;

      // Restrict up/down looking (-82 to +82 degrees) to prevent orientation flips
      const maxPitch = Math.PI / 2.15;
      pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current));

      const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      try {
        canvasElement.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe check
      }
    };

    canvasElement.addEventListener('pointerdown', handlePointerDown, { passive: true });
    canvasElement.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvasElement.addEventListener('pointerup', handlePointerUp, { passive: true });
    canvasElement.addEventListener('pointercancel', handlePointerUp, { passive: true });

    return () => {
      canvasElement.removeEventListener('pointerdown', handlePointerDown);
      canvasElement.removeEventListener('pointermove', handlePointerMove);
      canvasElement.removeEventListener('pointerup', handlePointerUp);
      canvasElement.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [cameraMode, gl, camera, controlsRef]);

  // Transition state
  const isTransitioning = useRef<boolean>(false);
  const transitionProgress = useRef<number>(0);
  const startCameraPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const startControlsTarget = useRef<THREE.Vector3>(new THREE.Vector3());
  const endCameraPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const endControlsTarget = useRef<THREE.Vector3>(new THREE.Vector3());

  // Trigger transition when activeFloor, cameraMode or selectedZone changes
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    const floorHeight = getFloorHeight(activeFloor);
    const oldFloorHeight = getFloorHeight(prevActiveFloor.current);

    // Capture starting state
    startCameraPos.current.copy(camera.position);
    startControlsTarget.current.copy(controls.target);

    const modeChanged = cameraMode !== prevCameraMode.current;
    const floorChanged = activeFloor !== prevActiveFloor.current;
    const zoneChanged = selectedZone?.id !== prevSelectedZone.current?.id;

    if (zoneChanged || modeChanged || floorChanged) {
      if (selectedZone) {
        // Zoom and orient camera focusing specifically on the high-fidelity room
        endControlsTarget.current.set(selectedZone.center[0], selectedZone.center[1], selectedZone.center[2]);
        endCameraPos.current.set(selectedZone.cameraPos[0], selectedZone.cameraPos[1], selectedZone.cameraPos[2]);
      } else {
        if (cameraMode === 'top') {
          // Top-down view centered on the building at the active floor height
          endControlsTarget.current.set(0, floorHeight, 0);
          endCameraPos.current.set(0, floorHeight + 35, 0.01); // 35m height looking straight down
        } else if (cameraMode === 'orbit') {
          // Orbit mode view
          if (modeChanged) {
            // Put the orbit point right in front of where player flew and look at it
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            endControlsTarget.current.copy(camera.position).addScaledVector(forward, 15);
            endCameraPos.current.copy(camera.position);
          } else {
            // If only floor changed in orbit mode, keep the current angle but shift the height nicely
            const heightDiff = floorHeight - oldFloorHeight;
            endControlsTarget.current.copy(controls.target);
            endControlsTarget.current.y = floorHeight;
            
            endCameraPos.current.copy(camera.position);
            endCameraPos.current.y += heightDiff;
          }
        } else if (cameraMode === 'flight') {
          // In flight mode, we stay exactly where we were to avoid abrupt visual adjustments!
          prevActiveFloor.current = activeFloor;
          prevCameraMode.current = cameraMode;
          prevSelectedZone.current = selectedZone;
          return;
        }
      }

      isTransitioning.current = true;
      transitionProgress.current = 0;
    }

    prevActiveFloor.current = activeFloor;
    prevCameraMode.current = cameraMode;
    prevSelectedZone.current = selectedZone;
  }, [activeFloor, cameraMode, controlsRef, camera, selectedZone]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;

    if (isTransitioning.current) {
      if (!controls) return;
      // Smooth interpolation over ~0.6 seconds
      const speedMultiplier = 4.0; 
      transitionProgress.current += delta * speedMultiplier;

      if (transitionProgress.current >= 1.0) {
        transitionProgress.current = 1.0;
        isTransitioning.current = false;
      }

      // Easing function (smoothstep equivalent: t * t * (3 - 2 * t))
      const t = transitionProgress.current;
      const ease = t * t * (3 - 2 * t);

      // Lerp camera position and controls target
      camera.position.lerpVectors(startCameraPos.current, endCameraPos.current, ease);
      controls.target.lerpVectors(startControlsTarget.current, endControlsTarget.current, ease);
      
      controls.update();
    } else if (cameraMode === 'flight') {
      // Keyboard-driven fly navigation (free flight/god mode)
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (!isTyping) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        
        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();

        const moveDir = new THREE.Vector3(0, 0, 0);
        if (keys.current.w) moveDir.add(forward);
        if (keys.current.s) moveDir.sub(forward);
        if (keys.current.d) moveDir.add(right);
        if (keys.current.a) moveDir.sub(right);

        // Vertical movement keys
        if (keys.current.space || keys.current.e) moveDir.y += 1.0;
        if (keys.current.shift || keys.current.q) moveDir.y -= 1.0;

        if (moveDir.lengthSq() > 0) {
          // Precise navigation speeds
          const baseSpeed = 10;
          const sprintSpeed = 26;
          const finalSpeed = keys.current.shift ? sprintSpeed : baseSpeed;
          moveDir.normalize().multiplyScalar(finalSpeed * delta);

          camera.position.add(moveDir);
        }
      }
    }

    // Prevent camera and target from going below the ground surface (y >= 0.6 for camera, y >= 0.1 for target)
    let groundLimitTriggered = false;
    if (camera.position.y < 0.6) {
      camera.position.y = 0.6;
      groundLimitTriggered = true;
    }
    if (cameraMode !== 'flight') {
      if (controls) {
        if (controls.target.y < 0.1) {
          controls.target.y = 0.1;
          groundLimitTriggered = true;
        }
        if (groundLimitTriggered) {
          controls.update();
        }
      }
    }
  });

  return null;
}
