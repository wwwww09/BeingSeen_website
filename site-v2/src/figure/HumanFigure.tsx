import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { getDotTexture } from '../scene/dotTexture'
import {
  BONES,
  HEAD_RADIUS,
  JOINT_SPHERES,
  curlPose,
  lerpJoints,
  runPose,
  smoothstep,
  type Joints,
} from './pose'

const UP = new THREE.Vector3(0, 1, 0)
const FALLBACK_UP = new THREE.Vector3(0, 0, 1)

interface ParticleSeed {
  bone: number
  t: number
  u: number
  v: number
}

function buildParticles(): { seeds: ParticleSeed[]; positions: Float32Array; colors: Float32Array } {
  const seeds: ParticleSeed[] = []
  const palette = [new THREE.Color('#a9c8ff'), new THREE.Color('#efe9dd'), new THREE.Color('#ffcf9a')]

  BONES.forEach((bone, boneIndex) => {
    const count = Math.round(210 + bone.radius * 1000)
    for (let i = 0; i < count; i++) {
      // Bias toward the skin so the silhouette stays legible.
      const radial = bone.radius * (0.62 + 0.38 * Math.sqrt(Math.random()))
      const angle = Math.random() * Math.PI * 2
      seeds.push({
        bone: boneIndex,
        t: Math.random(),
        u: Math.cos(angle) * radial,
        v: Math.sin(angle) * radial,
      })
    }
  })

  const positions = new Float32Array(seeds.length * 3)
  const colors = new Float32Array(seeds.length * 3)
  const color = new THREE.Color()

  seeds.forEach((_seed, i) => {
    const pick = palette[Math.floor(Math.random() * palette.length)]
    color.copy(pick).multiplyScalar(0.55 + Math.random() * 0.45)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  })

  return { seeds, positions, colors }
}

/**
 * The figure is rebuilt every frame from a joint pose:
 *
 *   - 13 capsule bones (torso, shoulders, limbs) give a clear human silhouette
 *   - joint spheres close the elbows, knees, hands and head
 *   - ~4,000 particles ride on the same bones as a soft glowing shell
 *
 * `collapse` blends the running pose into the curled pose. The black hole grows
 * out of the chest as the body folds.
 */
export function HumanFigure({
  collapse,
  running,
}: {
  collapse: MotionValue<number>
  running: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const boneRefs = useRef<Array<THREE.Mesh | null>>([])
  const jointRefs = useRef<Array<THREE.Mesh | null>>([])
  const particleRef = useRef<THREE.Points>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const blackHole = useRef<THREE.Group>(null)
  const runTime = useRef(0.55)

  const { seeds, positions, colors } = useMemo(buildParticles, [])

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0c1521',
        roughness: 0.96,
        metalness: 0.0,
        emissive: '#02050b',
        emissiveIntensity: 0.7,
      }),
    [],
  )

  const scratch = useMemo(
    () => ({
      dir: new THREE.Vector3(),
      mid: new THREE.Vector3(),
      u: new THREE.Vector3(),
      v: new THREE.Vector3(),
      point: new THREE.Vector3(),
      basisUp: new THREE.Vector3(),
    }),
    [],
  )

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1)
    if (running) runTime.current += d

    const c = smoothstep(Math.min(1, Math.max(0, collapse.get())))
    const pose: Joints = lerpJoints(runPose(runTime.current), curlPose, c)

    // Bones.
    BONES.forEach((bone, i) => {
      const mesh = boneRefs.current[i]
      if (!mesh) return
      const a = pose[bone.a]
      const b = pose[bone.b]
      scratch.dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      const distance = scratch.dir.length() || 0.001
      scratch.mid.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
      mesh.position.copy(scratch.mid)
      mesh.quaternion.setFromUnitVectors(UP, scratch.dir.normalize())
      mesh.scale.set(1, Math.max(0.01, distance - bone.radius * 2), 1)
    })

    // Joint spheres.
    JOINT_SPHERES.forEach((joint, i) => {
      const mesh = jointRefs.current[i]
      if (!mesh) return
      const p = pose[joint.key]
      mesh.position.set(p[0], p[1], p[2])
    })

    if (headRef.current) {
      const h = pose.head
      headRef.current.position.set(h[0], h[1], h[2])
      headRef.current.scale.set(0.9, 1.08, 0.92)
    }

    // Particle shell, riding the same bones.
    const positionsAttr = particleRef.current?.geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined
    if (positionsAttr) {
      const array = positionsAttr.array as Float32Array
      const boneFrames = BONES.map((bone) => {
        const a = pose[bone.a]
        const b = pose[bone.b]
        const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
        const length = dir.length() || 0.001
        dir.normalize()
        const up = Math.abs(dir.y) > 0.95 ? FALLBACK_UP : UP
        const u = new THREE.Vector3().crossVectors(dir, up).normalize()
        const v = new THREE.Vector3().crossVectors(dir, u).normalize()
        return { a, dir, length, u, v }
      })

      seeds.forEach((seed, i) => {
        const frame = boneFrames[seed.bone]
        const px = frame.a[0] + frame.dir.x * seed.t * frame.length
        const py = frame.a[1] + frame.dir.y * seed.t * frame.length
        const pz = frame.a[2] + frame.dir.z * seed.t * frame.length
        array[i * 3] = px + frame.u.x * seed.u + frame.v.x * seed.v
        array[i * 3 + 1] = py + frame.u.y * seed.u + frame.v.y * seed.v
        array[i * 3 + 2] = pz + frame.u.z * seed.u + frame.v.z * seed.v
      })
      positionsAttr.needsUpdate = true
    }

    // The black hole forms in the chest as the figure folds.
    if (blackHole.current) {
      const scale = smoothstep((c - 0.42) / 0.5) * 0.13
      const bx = (pose.chest[0] + pose.hips[0]) / 2
      const by = (pose.chest[1] + pose.hips[1]) / 2 + 0.02
      const bz = Math.max(pose.chest[2], pose.hips[2]) + 0.13
      blackHole.current.scale.setScalar(Math.max(0.0001, scale))
      blackHole.current.position.set(bx, by, bz)
      blackHole.current.visible = scale > 0.004
    }

    if (group.current) {
      // A very slight turn keeps the 3/4 view alive without hiding the profile.
      const time = runTime.current
      group.current.rotation.y = -0.34 + Math.sin(time * 0.4) * 0.02
    }
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
      {BONES.map((bone, i) => (
        <mesh
          key={`${bone.a}-${bone.b}`}
          ref={(mesh) => {
            boneRefs.current[i] = mesh
          }}
          material={bodyMaterial}
          castShadow={false}
          receiveShadow={false}
        >
          <capsuleGeometry args={[bone.radius, 1, 6, 12]} />
        </mesh>
      ))}

      <mesh ref={headRef} material={bodyMaterial}>
        <sphereGeometry args={[HEAD_RADIUS, 24, 18]} />
      </mesh>

      {JOINT_SPHERES.map((joint, i) => (
        <mesh
          key={joint.key}
          ref={(mesh) => {
            jointRefs.current[i] = mesh
          }}
          material={bodyMaterial}
        >
          <sphereGeometry args={[joint.radius, 18, 14]} />
        </mesh>
      ))}

      <points ref={particleRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.021}
          sizeAttenuation
          vertexColors
          map={getDotTexture()}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <group ref={blackHole} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#010103" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.06, 0.008, 8, 128]} />
          <meshBasicMaterial color="#6f8eb8" toneMapped={false} transparent opacity={0.4} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.12, 0.045, 8, 128]} />
          <meshBasicMaterial
            color="#ffb06a"
            transparent
            opacity={0.1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}
