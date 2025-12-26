
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useMemo, useRef } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { NoteData, COLORS } from '../types';
import { getLanePosition, NOTE_SIZE } from '../constants';

// Define capitalized constants for Three.js elements to bypass JSX intrinsic element type errors.
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const RingGeometry = 'ringGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const SphereGeometry = 'sphereGeometry' as any;
const CylinderGeometry = 'cylinderGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const CircleGeometry = 'circleGeometry' as any;

interface NoteProps {
  data: NoteData;
  zPos: number;
  currentTime: number;
}

const Debris: React.FC<{ data: NoteData, timeSinceHit: number, color: string }> = ({ data, timeSinceHit, color }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    const particles = useMemo(() => {
        return new Array(12).fill(0).map(() => ({
            dir: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
            speed: 4 + Math.random() * 8,
            size: 0.05 + Math.random() * 0.15
        }));
    }, []);

    useFrame(() => {
        if (groupRef.current) {
            const scale = Math.max(0, 1 - timeSinceHit * 3);
            groupRef.current.scale.setScalar(scale);
        }
    });

    return (
        // Using capitalized constants to avoid JSX intrinsic element type errors.
        <Group ref={groupRef}>
             <Mesh rotation={[Math.PI/2, 0, 0]}>
                 <RingGeometry args={[0.3, 1.5 + timeSinceHit * 5, 32]} />
                 <MeshBasicMaterial color={color} transparent opacity={0.6 * (1 - timeSinceHit * 2)} />
             </Mesh>
             {particles.map((p, i) => (
                 <Mesh key={i} position={[
                     p.dir.x * p.speed * timeSinceHit,
                     p.dir.y * p.speed * timeSinceHit,
                     p.dir.z * p.speed * timeSinceHit
                 ]}>
                     <SphereGeometry args={[p.size]} />
                     <MeshBasicMaterial color={i % 2 === 0 ? color : COLORS.ink} />
                 </Mesh>
             ))}
        </Group>
    );
};

const Note: React.FC<NoteProps> = ({ data, zPos, currentTime }) => {
  const color = data.type === 'left' ? COLORS.left : COLORS.right;
  const glow = data.type === 'left' ? COLORS.glowRed : COLORS.glowCyan;
  
  const position: [number, number, number] = useMemo(() => {
     const lanePos = getLanePosition(data.lineIndex);
     return [lanePos.x, lanePos.y, zPos];
  }, [data.lineIndex, zPos]);

  // Rotate note to face center of the hexagon
  const rotationZ = useMemo(() => {
      const angle = (data.lineIndex * (Math.PI / 3)) + (Math.PI / 6);
      return angle + Math.PI / 2;
  }, [data.lineIndex]);

  if (data.missed) return null;

  if (data.hit && data.hitTime) {
      return (
          <Group position={position}>
              <Debris data={data} timeSinceHit={currentTime - data.hitTime} color={color} />
          </Group>
      );
  }

  return (
    // Using capitalized constants for intrinsic elements to fix type errors.
    <Group position={position} rotation={[Math.PI / 2, 0, rotationZ]}>
      {/* Glow Aura */}
      <Mesh scale={[1.3, 1, 1.3]}>
          <CylinderGeometry args={[NOTE_SIZE, NOTE_SIZE, 0.1, 16]} />
          <MeshBasicMaterial color={glow} transparent opacity={0.2} />
      </Mesh>

      {/* Drum Body */}
      <Mesh castShadow>
         <CylinderGeometry args={[NOTE_SIZE, NOTE_SIZE, 0.3, 32]} />
         <MeshStandardMaterial color={COLORS.ink} roughness={0.3} />
      </Mesh>
      
      {/* Drum Skin */}
      <Mesh position={[0, 0.16, 0]}>
         <CylinderGeometry args={[NOTE_SIZE * 0.9, NOTE_SIZE * 0.9, 0.02, 32]} />
         <MeshStandardMaterial color={COLORS.track} roughness={0.9} />
      </Mesh>

      {/* Pattern */}
      <Mesh position={[0, 0.18, 0]}>
         <RingGeometry args={[NOTE_SIZE * 0.5, NOTE_SIZE * 0.7, 32]} />
         <MeshBasicMaterial color={color} />
      </Mesh>

      <Mesh position={[0, 0.18, 0]}>
         <CircleGeometry args={[NOTE_SIZE * 0.2, 32]} />
         <MeshBasicMaterial color={COLORS.ink} />
      </Mesh>
    </Group>
  );
};

export default React.memo(Note);
