
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { CutDirection, NoteData } from "./types";
import * as THREE from 'three';

// Game World Config
export const TRACK_LENGTH = 50;
export const SPAWN_Z = -30;
export const PLAYER_Z = 0;
export const MISS_Z = 5;
export const NOTE_SPEED = 12; 

// Hexagonal Layout Config - Lowered and tightened for reachability
export const HEX_RADIUS = 1.4;
export const HEX_CENTER_Y = 1.5; 
export const NOTE_SIZE = 0.55; 

// Function to get 3D position of a lane at index 0-5
export const getLanePosition = (index: number): { x: number, y: number } => {
  // Rotate by 30 degrees (Math.PI / 6) to have two tracks at the top/bottom or left/right
  const angle = (index * (Math.PI / 3)) + (Math.PI / 6);
  return {
    x: Math.cos(angle) * HEX_RADIUS,
    y: Math.sin(angle) * HEX_RADIUS + HEX_CENTER_Y
  };
};

// Keeping these for backwards compatibility if needed, but the scene will use getLanePosition
export const LANE_X_POSITIONS = [0, 0, 0, 0, 0, 0]; 
export const LAYER_Y_POSITIONS = [0, 0, 0, 0, 0, 0];

export const LANE_WIDTH = 0.8;

// Audio - Default BPM
export const SONG_BPM = 128; 
const BEAT_TIME = 60 / SONG_BPM;

// Generate a rhythmic chart using 6 lanes
export const generateDemoChart = (): NoteData[] => {
  const notes: NoteData[] = [];
  let idCount = 0;

  for (let i = 4; i < 200; i += 1.5) { 
    const time = i * BEAT_TIME;
    const pattern = Math.floor(i / 8) % 4;

    if (pattern === 0) {
      // Circle flow
      const laneIndex = Math.floor(i) % 6;
      notes.push({
        id: `note-${idCount++}`,
        time: time,
        lineIndex: laneIndex,
        lineLayer: 0,
        type: laneIndex < 3 ? 'left' : 'right',
        cutDirection: CutDirection.ANY
      });
    } else if (pattern === 1) {
      // Opposites
      if (i % 3 === 0) {
        notes.push(
          { id: `note-${idCount++}`, time, lineIndex: 0, lineLayer: 0, type: 'left', cutDirection: CutDirection.ANY },
          { id: `note-${idCount++}`, time, lineIndex: 3, lineLayer: 0, type: 'right', cutDirection: CutDirection.ANY }
        );
      }
    } else if (pattern === 2) {
      // Random bursts
      if (i % 2 === 0) {
        const idx = Math.floor(Math.random() * 6);
        notes.push({
          id: `note-${idCount++}`,
          time,
          lineIndex: idx,
          lineLayer: 0,
          type: Math.random() > 0.5 ? 'left' : 'right',
          cutDirection: CutDirection.ANY
        });
      }
    } else {
      // Parallel lines
      if (i % 4 === 0) {
        notes.push(
          { id: `note-${idCount++}`, time, lineIndex: 1, lineLayer: 0, type: 'left', cutDirection: CutDirection.ANY },
          { id: `note-${idCount++}`, time, lineIndex: 4, lineLayer: 0, type: 'right', cutDirection: CutDirection.ANY }
        );
      }
    }
  }

  return notes.sort((a, b) => a.time - b.time);
};

export const DEMO_CHART = generateDemoChart();

export const DIRECTION_VECTORS: Record<CutDirection, THREE.Vector3> = {
  [CutDirection.UP]: new THREE.Vector3(0, 1, 0),
  [CutDirection.DOWN]: new THREE.Vector3(0, -1, 0),
  [CutDirection.LEFT]: new THREE.Vector3(-1, 0, 0),
  [CutDirection.RIGHT]: new THREE.Vector3(1, 0, 0),
  [CutDirection.ANY]: new THREE.Vector3(0, 0, 0)
};
