import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LevelData, GameState, ObstacleConfig } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, SUBMARINE_SIZE, OBSTACLE_SIZES, OBSTACLE_COLORS, BASE_SCROLL_SPEED } from '../constants';

interface GameEngineProps {
  levelData: LevelData | null;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onScoreUpdate: (score: number) => void;
  inputRef: React.MutableRefObject<number>; // 0 to 1
}

interface ActiveObstacle extends ObstacleConfig {
  x: number;
  y: number;
}

const GameEngine: React.FC<GameEngineProps> = ({
  levelData,
  gameState,
  setGameState,
  onScoreUpdate,
  inputRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs (for performance in loop)
  const submarineY = useRef(GAME_HEIGHT / 2);
  const activeObstacles = useRef<ActiveObstacle[]>([]);
  const startTime = useRef<number>(0);
  const scoreRef = useRef(0);
  const gameSpeedRef = useRef(1.0);

  // Particle system for bubbles
  const bubbles = useRef<{x: number, y: number, speed: number, size: number}[]>([]);

  const resetGame = useCallback(() => {
    submarineY.current = GAME_HEIGHT / 2;
    activeObstacles.current = [];
    scoreRef.current = 0;
    gameSpeedRef.current = 1.0;
    startTime.current = Date.now();
    bubbles.current = [];
    onScoreUpdate(0);
  }, [onScoreUpdate]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      resetGame();
      startTime.current = Date.now();
    }
  }, [gameState, resetGame]);

  const spawnObstacles = (currentTime: number) => {
    if (!levelData) return;
    // Spawn logic handled in update loop
  };
  
  // Use a ref to track next obstacle to spawn
  const nextObstacleIdx = useRef(0);
  
  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          nextObstacleIdx.current = 0;
      }
  }, [gameState]);

  const drawSubmarine = (ctx: CanvasRenderingContext2D, y: number) => {
    const x = 100; // Fixed X position
    const w = SUBMARINE_SIZE.width;
    const h = SUBMARINE_SIZE.height;

    ctx.save();
    ctx.translate(x, y);
    
    // Hull
    ctx.fillStyle = '#facc15'; // Yellow
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 20);
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#bfdbfe'; // Light blue glass
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.3, 10, 0, Math.PI * 2);
    ctx.fill();

    // Periscope
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(w * 0.4, -15, 10, 15);
    ctx.fillRect(w * 0.4, -15, 20, 5);

    // Propeller
    ctx.fillStyle = '#92400e';
    const propOffset = (Date.now() / 50) % 5;
    ctx.fillRect(-5, 10 + propOffset, 5, 20);
    
    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obs: ActiveObstacle) => {
    const size = OBSTACLE_SIZES[obs.type];
    ctx.fillStyle = OBSTACLE_COLORS[obs.type];
    
    ctx.save();
    ctx.translate(obs.x, obs.y);

    if (obs.type === 'shark') {
       // Simple shark shape
       ctx.beginPath();
       ctx.moveTo(size.width, size.height/2);
       ctx.lineTo(0, 0);
       ctx.lineTo(0, size.height);
       ctx.fill();
       // Eye
       ctx.fillStyle = 'white';
       ctx.beginPath();
       ctx.arc(15, size.height/2 - 5, 3, 0, Math.PI*2);
       ctx.fill();
    } else if (obs.type === 'mine') {
       ctx.beginPath();
       ctx.arc(size.width/2, size.height/2, size.width/2, 0, Math.PI*2);
       ctx.fill();
       // Spikes
       ctx.strokeStyle = OBSTACLE_COLORS[obs.type];
       ctx.lineWidth = 3;
       ctx.beginPath();
       ctx.moveTo(size.width/2, -5); ctx.lineTo(size.width/2, size.height+5);
       ctx.moveTo(-5, size.height/2); ctx.lineTo(size.width+5, size.height/2);
       ctx.stroke();
    } else if (obs.type === 'jellyfish') {
        ctx.beginPath();
        ctx.arc(size.width/2, size.height/3, size.width/2, Math.PI, 0);
        ctx.fill();
        // Tentacles
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 2;
        for(let i=0; i<3; i++) {
             ctx.beginPath();
             ctx.moveTo(10 + i*10, size.height/3);
             ctx.lineTo(10 + i*10 + Math.sin(Date.now()/200 + i)*5, size.height);
             ctx.stroke();
        }
    } else {
        // Generic fish
        ctx.beginPath();
        ctx.ellipse(size.width/2, size.height/2, size.width/2, size.height/2, 0, 0, Math.PI*2);
        ctx.fill();
    }
    
    ctx.restore();
  };

  const checkCollision = (subY: number, obs: ActiveObstacle): boolean => {
      const subX = 100;
      const subW = SUBMARINE_SIZE.width;
      const subH = SUBMARINE_SIZE.height;
      
      const obsW = OBSTACLE_SIZES[obs.type].width;
      const obsH = OBSTACLE_SIZES[obs.type].height;
      
      // Simple AABB
      // Shrink hitboxes slightly for fairness
      const padding = 5;
      
      return (
          subX + padding < obs.x + obsW - padding &&
          subX + subW - padding > obs.x + padding &&
          subY + padding < obs.y + obsH - padding &&
          subY + subH - padding > obs.y + padding
      );
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#0e7490'); // Cyan-700 surface
    gradient.addColorStop(1, '#0f172a'); // Slate-900 deep
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 1. Update Submarine Position (LERP for smoothness)
    // Use ref value directly
    const normalizedInputY = inputRef.current;
    const targetY = normalizedInputY * (GAME_HEIGHT - SUBMARINE_SIZE.height);
    
    // Smooth movement towards target
    submarineY.current = submarineY.current + (targetY - submarineY.current) * 0.1;
    
    // Clamp
    submarineY.current = Math.max(0, Math.min(GAME_HEIGHT - SUBMARINE_SIZE.height, submarineY.current));

    // 2. Spawn Obstacles
    const elapsed = Date.now() - startTime.current;
    if (levelData && nextObstacleIdx.current < levelData.obstacles.length) {
        const nextObs = levelData.obstacles[nextObstacleIdx.current];
        if (elapsed >= nextObs.entryTime) {
            activeObstacles.current.push({
                ...nextObs,
                x: GAME_WIDTH + 50, // Spawn just offscreen
                y: (nextObs.yPercent / 100) * (GAME_HEIGHT - 100) // Convert percent to pixel
            });
            nextObstacleIdx.current++;
        }
    }
    
    // 3. Update & Draw Obstacles
    for (let i = activeObstacles.current.length - 1; i >= 0; i--) {
        const obs = activeObstacles.current[i];
        // Move left
        obs.x -= BASE_SCROLL_SPEED * obs.speedMulti * gameSpeedRef.current;
        
        // Jellyfish movement
        if (obs.type === 'jellyfish') {
            obs.y += Math.sin(Date.now() / 500) * 1;
        }

        drawObstacle(ctx, obs);

        // Collision Check
        if (checkCollision(submarineY.current, obs)) {
            setGameState(GameState.GAME_OVER);
            return; // Stop loop
        }

        // Remove if off screen
        if (obs.x < -150) {
            activeObstacles.current.splice(i, 1);
            scoreRef.current += 100;
            onScoreUpdate(scoreRef.current);
        }
    }

    // 4. Bubbles FX
    if (Math.random() < 0.1) {
        bubbles.current.push({
            x: GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            speed: 1 + Math.random() * 3,
            size: 2 + Math.random() * 4
        });
    }
    // Submarine bubbles
    if (Math.random() < 0.3) {
        bubbles.current.push({
            x: 100,
            y: submarineY.current + SUBMARINE_SIZE.height / 2,
            speed: 2,
            size: 3
        });
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = bubbles.current.length - 1; i >= 0; i--) {
        const b = bubbles.current[i];
        b.x -= b.speed;
        b.y -= 1; // Float up
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
        ctx.fill();
        if (b.x < 0 || b.y < 0) bubbles.current.splice(i, 1);
    }

    // 5. Draw Submarine
    drawSubmarine(ctx, submarineY.current);

    // 6. Check Win Condition
    // If no more pending obstacles and no active obstacles, You Win!
    if (levelData && nextObstacleIdx.current >= levelData.obstacles.length && activeObstacles.current.length === 0) {
         // Ensure some time passed (don't win instantly on empty level)
         if (elapsed > 5000) {
            setGameState(GameState.VICTORY);
            return;
         }
    }

    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }); // Runs every render, logic gated by gameState

  return (
    <canvas 
        ref={canvasRef} 
        width={GAME_WIDTH} 
        height={GAME_HEIGHT}
        className="w-full h-full object-contain bg-slate-900 shadow-2xl rounded-xl border border-cyan-900"
    />
  );
};

export default GameEngine;