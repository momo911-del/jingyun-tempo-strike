
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useState, useMemo, useEffect, Suspense } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import { PerspectiveCamera, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, NoteData, HandPositions, COLORS } from '../types';
import { PLAYER_Z, SPAWN_Z, MISS_Z, NOTE_SPEED, HEX_RADIUS, HEX_CENTER_Y, getLanePosition } from '../constants';
import Note from './Note';
import Saber from './Saber';

// Define capitalized constants for Three.js elements to bypass JSX intrinsic element type errors.
const Mesh = 'mesh' as any;
const Group = 'group' as any;
const SphereGeometry = 'sphereGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const PlaneGeometry = 'planeGeometry' as any;
const RingGeometry = 'ringGeometry' as any;
const Color_ = 'color' as any;
const Fog_ = 'fog' as any;
const AmbientLight = 'ambientLight' as any;
const DirectionalLight = 'directionalLight' as any;

interface GameSceneProps {
  gameStatus: GameStatus;
  audioRef: React.RefObject<HTMLAudioElement>;
  handPositionsRef: React.MutableRefObject<any>; 
  chart: NoteData[];
  backgroundUrl: string | null;
  onNoteHit: (note: NoteData, goodCut: boolean) => void;
  onNoteMiss: (note: NoteData) => void;
  onSongEnd: () => void;
}

const DiffuseBlob: React.FC<{ position: [number, number, number], scale: number, color: string }> = ({ position, scale, color }) => {
    return (
        // Using capitalized constants to avoid JSX intrinsic element type errors.
        <Mesh position={position}>
            <SphereGeometry args={[scale, 32, 32]} />
            <MeshBasicMaterial color={color} transparent opacity={0.12} />
        </Mesh>
    );
};

const HexagonalTrack = () => {
    const lanes = Array.from({ length: 6 }).map((_, i) => getLanePosition(i));
    
    return (
        <Group position={[0, 0, -25]}>
            {/* 6 Lanes in Hexagonal Pattern */}
            {lanes.map((pos, i) => (
                <Group key={i} position={[pos.x, pos.y, 0]} rotation={[0, 0, (i * (Math.PI / 3)) + (Math.PI / 6)]}>
                    {/* Lane Path */}
                    <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                        <PlaneGeometry args={[0.3, 100]} />
                        <MeshBasicMaterial color={COLORS.ink} transparent opacity={0.05} />
                    </Mesh>
                    {/* Glowing Core Line */}
                    <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                        <PlaneGeometry args={[0.02, 100]} />
                        <MeshBasicMaterial color={i % 2 === 0 ? COLORS.glowRed : COLORS.glowCyan} transparent opacity={0.3} />
                    </Mesh>
                </Group>
            ))}

            {/* Hit Zone Highlight - A hexagonal ring */}
            <Mesh position={[0, HEX_CENTER_Y, 25]} rotation={[0, 0, Math.PI / 6]}>
                <RingGeometry args={[HEX_RADIUS - 0.2, HEX_RADIUS + 0.2, 6]} />
                <MeshBasicMaterial color={COLORS.ink} transparent opacity={0.1} />
            </Mesh>
            <Mesh position={[0, HEX_CENTER_Y, 25.1]} rotation={[0, 0, Math.PI / 6]}>
                <RingGeometry args={[HEX_RADIUS - 0.05, HEX_RADIUS + 0.05, 6]} />
                <MeshBasicMaterial color="#c02c38" transparent opacity={0.4} />
            </Mesh>
        </Group>
    );
};

const TextureMesh: React.FC<{ url: string }> = ({ url }) => {
    // 异步加载纹理，受内部 Suspense 保护
    const texture = useTexture(url);
    return (
        <Mesh position={[0, 10, -50]}>
            <PlaneGeometry args={[100, 56.25]} />
            <MeshBasicMaterial map={texture} transparent opacity={0.9} />
        </Mesh>
    );
};

const DefaultBackground = () => (
    <Group position={[0, 0, -45]}>
        <DiffuseBlob position={[-30, 10, -5]} scale={15} color="#ffcfd2" />
        <DiffuseBlob position={[25, 15, -10]} scale={20} color="#cfdcff" />
        <DiffuseBlob position={[-15, -10, 5]} scale={25} color="#e2ffcf" />
        <DiffuseBlob position={[10, -5, 0]} scale={12} color="#fff4cf" />
        <DiffuseBlob position={[0, 25, -20]} scale={30} color="#f4cfff" />
    </Group>
);

const BackgroundLayer: React.FC<{ url: string | null }> = ({ url }) => {
    return (
        <Suspense fallback={<DefaultBackground />}>
            {url ? <TextureMesh url={url} /> : <DefaultBackground />}
        </Suspense>
    );
};

const GameScene: React.FC<GameSceneProps> = ({ 
    gameStatus, 
    audioRef, 
    handPositionsRef, 
    chart,
    backgroundUrl,
    onNoteHit,
    onNoteMiss,
    onSongEnd
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const activeNotesRef = useRef<NoteData[]>([]);
  const nextNoteIndexRef = useRef(0);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  const vecA = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    activeNotesRef.current = [];
    nextNoteIndexRef.current = 0;
  }, [chart, gameStatus]);

  useFrame((state) => {
    if (gameStatus !== GameStatus.PLAYING || !audioRef.current) return;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    const spawnAheadTime = Math.abs(SPAWN_Z - PLAYER_Z) / NOTE_SPEED;
    while (nextNoteIndexRef.current < chart.length) {
      const nextNote = chart[nextNoteIndexRef.current];
      if (nextNote.time - spawnAheadTime <= time) {
        activeNotesRef.current.push(nextNote);
        nextNoteIndexRef.current++;
      } else break;
    }

    const hands = handPositionsRef.current as HandPositions;
    for (let i = activeNotesRef.current.length - 1; i >= 0; i--) {
        const note = activeNotesRef.current[i];
        if (note.hit || note.missed) continue;

        const currentZ = PLAYER_Z - ((note.time - time) * NOTE_SPEED);

        if (currentZ > MISS_Z) {
            note.missed = true;
            onNoteMiss(note);
            activeNotesRef.current.splice(i, 1);
            continue;
        }

        // Collision check against hexagonal lane position
        if (currentZ > PLAYER_Z - 1.2 && currentZ < PLAYER_Z + 0.6) {
            const handPos = note.type === 'left' ? hands.left : hands.right;
            if (handPos) {
                 const lanePos = getLanePosition(note.lineIndex);
                 const notePos = vecA.set(lanePos.x, lanePos.y, currentZ);
                 // Larger threshold for easier drumming on a circle
                 if (handPos.distanceTo(notePos) < 1.1) {
                     note.hit = true;
                     note.hitTime = time;
                     onNoteHit(note, true);
                     activeNotesRef.current.splice(i, 1);
                 }
            }
        }
    }
  });

  const visibleNotes = useMemo(() => {
     return chart.filter(n => !n.missed && (!n.hit || (currentTime - (n.hitTime || 0) < 0.3)) && Math.abs(n.time - currentTime) < 4.5);
  }, [chart, currentTime]);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 2.0, 6]} fov={50} />
      {/* Using capitalized constants for intrinsic elements to fix type errors. */}
      <Color_ attach="background" args={[COLORS.track]} />
      <Fog_ attach="fog" args={[COLORS.track, 45, 75]} />
      
      <AmbientLight intensity={2.2} />
      <DirectionalLight position={[10, 25, 10]} intensity={0.8} />

      <BackgroundLayer url={backgroundUrl} />

      <HexagonalTrack />

      <Saber type="left" positionRef={{current: handPositionsRef.current.left}} velocityRef={{current: handPositionsRef.current.leftVelocity}} />
      <Saber type="right" positionRef={{current: handPositionsRef.current.right}} velocityRef={{current: handPositionsRef.current.rightVelocity}} />

      {visibleNotes.map(note => (
          <Note key={note.id} data={note} zPos={PLAYER_Z - ((note.time - currentTime) * NOTE_SPEED)} currentTime={currentTime} />
      ))}
    </>
  );
};

export default GameScene;
