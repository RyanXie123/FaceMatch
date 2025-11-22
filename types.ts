export enum GameState {
  INIT = 'INIT',
  LOADING_LEVEL = 'LOADING_LEVEL',
  WAITING_TO_START = 'WAITING_TO_START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
}

export interface ObstacleConfig {
  id: string;
  type: 'shark' | 'puffer' | 'mine' | 'jellyfish';
  yPercent: number; // 0-100
  speedMulti: number;
  entryTime: number; // Time in ms from start when this obstacle should spawn
}

export interface LevelData {
  name: string;
  description: string;
  obstacles: ObstacleConfig[];
  difficulty: string;
}

export interface GameStats {
  score: number;
  timeElapsed: number;
  lives: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  NEUTRAL = 'NEUTRAL',
}

export interface SimilarityResult {
  score: number;
  comment: string;
  features: string[];
}