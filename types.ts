
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';

export enum GameStatus {
  LOADING = 'LOADING',
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type HandType = 'left' | 'right';

export enum CutDirection {
  UP = 0,
  DOWN = 1,
  LEFT = 2,
  RIGHT = 3,
  ANY = 4
}

export interface NoteData {
  id: string;
  time: number;
  lineIndex: number;
  lineLayer: number;
  type: HandType;
  cutDirection: CutDirection;
  hit?: boolean;
  missed?: boolean;
  hitTime?: number;
}

export interface HandPositions {
  left: THREE.Vector3 | null;
  right: THREE.Vector3 | null;
  leftVelocity: THREE.Vector3;
  rightVelocity: THREE.Vector3;
}

export const COLORS = {
  left: '#c02c38',  // Zhu Red (朱红)
  right: '#2e5e6e', // Stone Cyan (石青)
  track: '#f4f1e8', // Rice Paper (宣纸)
  ink: '#1a1a1a',   // Dark Ink (玄墨)
  mountain1: '#3d5c5c', // Mineral Green
  mountain2: '#1a2e2e', // Deep Ink
  glowRed: '#ff1e42',
  glowCyan: '#00f2ff'
};
