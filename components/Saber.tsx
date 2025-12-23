/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandType, COLORS } from '../types';

interface SaberProps {
  type: HandType;
  positionRef: React.MutableRefObject<THREE.Vector3 | null>;
  velocityRef: React.MutableRefObject<THREE.Vector3 | null>;
}

const Saber: React.FC<SaberProps> = ({ type, positionRef, velocityRef }) => {
  const meshRef = useRef<THREE.Group>(null);
  const stickLength = 0.8; 

  const targetRotation = useRef(new THREE.Euler());

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const targetPos = positionRef.current;
    const velocity = velocityRef.current;

    if (targetPos) {
      meshRef.current.visible = true;
      meshRef.current.position.lerp(targetPos, 0.5); 
      
      // Dynamic Rotation Logic for Drumsticks
      // Resting: Pointed forward and down
      const restingX = -Math.PI / 4; 
      const restingY = 0;
      const restingZ = type === 'left' ? 0.3 : -0.3; 

      let swayX = 0;
      let swayY = 0;
      let swayZ = 0;

      if (velocity) {
          swayX = velocity.y * 0.08; 
          swayZ = -velocity.x * 0.08;
          swayX += velocity.z * 0.04;
      }

      targetRotation.current.set(
          restingX + swayX,
          restingY + swayY,
          restingZ + swayZ
      );

      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.current.x, 0.2);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.current.y, 0.2);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.current.z, 0.2);

    } else {
      meshRef.current.visible = false;
    }
  });

  // Tassel color
  const color = type === 'left' ? COLORS.left : COLORS.right;

  return (
    <group ref={meshRef}>
      {/* --- DRUMSTICK MODEL (Gubang) --- */}
      
      {/* Main Stick - Tapered Wood */}
      <mesh position={[0, stickLength / 2 - 0.1, 0]}>
        {/* RadiusTop smaller than RadiusBottom for taper */}
        <cylinderGeometry args={[0.015, 0.025, stickLength, 12]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.7} /> 
      </mesh>

      {/* Handle Wrapping (Cloth/Ink style) */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.2, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Decorative Tassel Ring */}
      <mesh position={[0, -0.2, 0]}>
         <torusGeometry args={[0.02, 0.005, 8, 16]} />
         <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} /> {/* Gold */}
      </mesh>

      {/* Tassel (Simple cylinder representation) */}
      <mesh position={[0, -0.25, 0]}>
         <cylinderGeometry args={[0.005, 0.02, 0.1, 8]} />
         <meshBasicMaterial color={color} />
      </mesh>

      {/* Tip (Striking point) */}
      <mesh position={[0, stickLength / 2 + 0.05 - 0.1, 0]}>
         <sphereGeometry args={[0.02]} />
         <meshStandardMaterial color="#e6ccb2" roughness={0.5} />
      </mesh>
    </group>
  );
};

export default Saber;