import React, { useMemo } from 'react';
import { useGameStore } from '../../gameStore';
import * as THREE from 'three';

export default function World() {
  const particles = useGameStore(state => state.particles);

  // Generate some static rocks
  const rocks = useMemo(() => {
    const arr = [];
    for(let i=0; i<30; i++) {
      const size = 1 + Math.random() * 2;
      arr.push({
        pos: [(Math.random() - 0.5) * 50, size/2, (Math.random() - 0.5) * 50] as [number, number, number],
        size
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2d4a22" />
      </mesh>

      {/* Anthill (Deposit zone) */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <coneGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#8b5a2b" flatShading />
      </mesh>

      {/* Rocks */}
      {rocks.map((rock, i) => (
        <mesh key={i} position={rock.pos} castShadow receiveShadow>
          <boxGeometry args={[rock.size, rock.size, rock.size]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      ))}

      {/* Particles (Leaves) */}
      {Object.values(particles).map(p => {
        if (p.carriedBy) return null; // rendered by the ant instead
        return (
          <mesh key={p.id} position={p.position} castShadow receiveShadow>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#4ade80" />
          </mesh>
        );
      })}
    </group>
  );
}
