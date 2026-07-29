import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../gameStore';
import { ANT_TYPES } from '../../types';
import * as THREE from 'three';

interface AntProps {
  playerNum: 1 | 2;
}

export default function Ant({ playerNum }: AntProps) {
  const player = useGameStore(state => state.players[playerNum]);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const currentState = useGameStore.getState().players[playerNum];
    if (currentState && groupRef.current) {
      groupRef.current.position.set(...currentState.position);
      groupRef.current.rotation.y = currentState.rotation;
      
      if (currentState.isDashing && meshRef.current) {
        meshRef.current.scale.setScalar(1.2);
        (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      } else if (meshRef.current) {
        meshRef.current.scale.setScalar(1);
        (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }
    }
  });

  if (!player) return null;

  const config = ANT_TYPES[player.antType] || ANT_TYPES.red;

  return (
    <group ref={groupRef}>
      {/* Ant Body - simple voxel representation */}
      <mesh ref={meshRef} position={[0, config.size * 0.5, 0]} castShadow>
        <boxGeometry args={[config.size, config.size, config.size * 1.5]} />
        <meshStandardMaterial 
          color={config.color} 
          emissive={config.color}
          emissiveIntensity={0}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, config.size * 0.5, config.size * 1.0]} castShadow>
        <boxGeometry args={[config.size * 0.8, config.size * 0.8, config.size * 0.8]} />
        <meshStandardMaterial color={config.color} />
      </mesh>
      
      {/* Particle in mouth if carrying */}
      {player.carryingParticle && (
        <mesh position={[0, config.size * 0.5, config.size * 1.6]} castShadow>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#4ade80" />
        </mesh>
      )}
    </group>
  );
}
