
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NoteData, COLORS } from '../types';
import { getLanePosition, NOTE_SIZE } from '../constants';

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
        <group ref={groupRef}>
             <mesh rotation={[Math.PI/2, 0, 0]}>
                 <ringGeometry args={[0.3, 1.5 + timeSinceHit * 5, 32]} />
                 <meshBasicMaterial color={color} transparent opacity={0.6 * (1 - timeSinceHit * 2)} />
             </mesh>
             {particles.map((p, i) => (
                 <mesh key={i} position={[
                     p.dir.x * p.speed * timeSinceHit,
                     p.dir.y * p.speed * timeSinceHit,
                     p.dir.z * p.speed * timeSinceHit
                 ]}>
                     <sphereGeometry args={[p.size]} />
                     <meshBasicMaterial color={i % 2 === 0 ? color : COLORS.ink} />
                 </mesh>
             ))}
        </group>
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
          <group position={position}>
              <Debris data={data} timeSinceHit={currentTime - data.hitTime} color={color} />
          </group>
      );
  }

  return (
    <group position={position} rotation={[Math.PI / 2, 0, rotationZ]}>
      {/* Glow Aura */}
      <mesh scale={[1.3, 1, 1.3]}>
          <cylinderGeometry args={[NOTE_SIZE, NOTE_SIZE, 0.1, 16]} />
          <meshBasicMaterial color={glow} transparent opacity={0.2} />
      </mesh>

      {/* Drum Body */}
      <mesh castShadow>
         <cylinderGeometry args={[NOTE_SIZE, NOTE_SIZE, 0.3, 32]} />
         <meshStandardMaterial color={COLORS.ink} roughness={0.3} />
      </mesh>
      
      {/* Drum Skin */}
      <mesh position={[0, 0.16, 0]}>
         <cylinderGeometry args={[NOTE_SIZE * 0.9, NOTE_SIZE * 0.9, 0.02, 32]} />
         <meshStandardMaterial color={COLORS.track} roughness={0.9} />
      </mesh>

      {/* Pattern */}
      <mesh position={[0, 0.18, 0]}>
         <ringGeometry args={[NOTE_SIZE * 0.5, NOTE_SIZE * 0.7, 32]} />
         <meshBasicMaterial color={color} />
      </mesh>

      <mesh position={[0, 0.18, 0]}>
         <circleGeometry args={[NOTE_SIZE * 0.2, 32]} />
         <meshBasicMaterial color={COLORS.ink} />
      </mesh>
    </group>
  );
};

export default React.memo(Note);
