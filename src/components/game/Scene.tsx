import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import Ant from './Ant';
import World from './World';
import { useGameStore } from '../../gameStore';

function GameManager() {
  const gameTick = useGameStore(state => state.gameTick);
  
  useFrame((state, delta) => {
    // Cap delta to prevent huge jumps on lag
    const dt = Math.min(delta, 0.1);
    gameTick(dt);
  });
  
  return null;
}

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [0, 20, 20], fov: 45 }}>
      <Sky sunPosition={[100, 20, 100]} turbidity={0.3} rayleigh={0.5} />
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        castShadow 
        intensity={1.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      <GameManager />
      
      <Ant playerNum={1} />
      <Ant playerNum={2} />
      
      <World />
      
      <OrbitControls 
        target={[0, 0, 0]}
        minDistance={10}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </Canvas>
  );
}
