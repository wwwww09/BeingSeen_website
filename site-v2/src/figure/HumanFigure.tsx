import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import {
  BONES,
  HEAD_RADIUS,
  lerp,
  lerpJoints,
  runPose,
  sitPose,
  smoothstep,
  type Joints,
} from './pose'

const MAX_BONES = 13

const CORE_COLORS = ['#6f8dff', '#8fa7ff', '#c9d6ff', '#efe9df', '#d8c4ff', '#ffc9e0', '#ffcf9a']

interface ParticleLists {
  bone: number[]
  t: number[]
  angle: number[]
  radius: number[]
  size: number[]
  phase: number[]
  color: number[]
}

function addParticle(
  lists: ParticleLists,
  bone: number,
  color: THREE.Color,
  size: number,
  radius: number,
  t: number,
  angle: number,
  phase: number,
) {
  lists.bone.push(bone)
  lists.t.push(t)
  lists.angle.push(angle)
  lists.radius.push(radius)
  lists.size.push(size)
  lists.phase.push(phase)
  lists.color.push(color.r, color.g, color.b)
}

function buildGeometry(): THREE.BufferGeometry {
  const lists: ParticleLists = {
    bone: [],
    t: [],
    angle: [],
    radius: [],
    size: [],
    phase: [],
    color: [],
  }
  const palette = CORE_COLORS.map((hex) => new THREE.Color(hex))
  const pickColor = () => palette[Math.floor(Math.random() * palette.length)].clone()

  // Body: dense, mostly on the skin, with some volume.
  BONES.forEach((bone, index) => {
    const count = bone.count
    for (let i = 0; i < count; i++) {
      const onSurface = Math.random() < (index < 2 ? 0.2 : 0.4)
      const radial = onSurface
        ? bone.radius * (0.82 + Math.random() * 0.18)
        : bone.radius * Math.cbrt(Math.random())
      const halo = Math.random() < 0.12
      const color = pickColor().multiplyScalar(halo ? 0.25 : 0.45 + Math.random() * 0.25)
      addParticle(
        lists,
        index,
        color,
        halo ? 0.026 + Math.random() * 0.014 : 0.007 + Math.random() * 0.006,
        radial,
        Math.random(),
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      )
    }
  })

  // Head: a sphere of points. No face; that is the eerie part.
  const headCount = 8500
  for (let i = 0; i < headCount; i++) {
    const onSurface = Math.random() < 0.55
    const radial = onSurface ? 0.86 + Math.random() * 0.14 : Math.cbrt(Math.random())
    const halo = Math.random() < 0.1
    const color = pickColor().multiplyScalar(halo ? 0.24 : 0.4 + Math.random() * 0.2)
    addParticle(
      lists,
      13,
      color,
      halo ? 0.02 + Math.random() * 0.012 : 0.006 + Math.random() * 0.0045,
      radial,
      Math.random(),
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    )
  }

  const count = lists.bone.length
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aBone', new THREE.BufferAttribute(new Float32Array(lists.bone), 1))
  geometry.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(lists.t), 1))
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(new Float32Array(lists.angle), 1))
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(new Float32Array(lists.radius), 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(lists.size), 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(lists.phase), 1))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(lists.color), 3))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 4)

  return geometry
}

const vertexShader = /* glsl */ `
  uniform vec3 uBoneA[13];
  uniform vec3 uBoneB[13];
  uniform vec3 uHeadCenter;
  uniform float uHeadRadius;
  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aBone;
  attribute float aT;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos;

    if (aBone > 12.5) {
      float ct = aT * 2.0 - 1.0;
      float st = sqrt(max(0.0, 1.0 - ct * ct));
      vec3 n = vec3(st * cos(aAngle), ct, st * sin(aAngle));
      pos = uHeadCenter + n * uHeadRadius * aRadius;
    } else {
      int index = int(aBone + 0.5);
      vec3 a = uBoneA[index];
      vec3 b = uBoneB[index];
      vec3 d = b - a;
      float len = length(d);
      d = len > 0.0001 ? d / len : vec3(0.0, 1.0, 0.0);
      vec3 up = abs(d.y) > 0.95 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
      vec3 u = normalize(cross(d, up));
      vec3 v = normalize(cross(d, u));
      pos = a + d * (aT * len) + u * cos(aAngle) * aRadius + v * sin(aAngle) * aRadius;
    }

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (720.0 / max(1.0, -mv.z)) * uPixelRatio;

    vColor = aColor;
    vAlpha = 0.72 + 0.28 * sin(uTime * 1.6 + aPhase);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, r);
    alpha *= alpha;
    gl_FragColor = vec4(vColor, alpha * vAlpha);
  }
`

/**
 * The figure is a dense GPU point cloud, in the spirit of the TouchDesigner
 * reference: the body is read from the density of the points, not from a solid
 * mesh. Approximately 45,000 points ride 13 bones plus a spherical head; the
 * vertex shader reconstructs the tube around each bone every frame, so only the
 * 13 bone endpoints are uploaded from JS.
 *
 * `progress` drives the whole shot:
 *   0.00–0.45  run toward the camera
 *   0.45–0.72  camera pulls back
 *   0.55–1.00  the figure sits and the black hole grows in the chest
 */
export function HumanFigure({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null)
  const blackHole = useRef<THREE.Group>(null)
  const gl = useThree((state) => state.gl)

  const geometry = useMemo(buildGeometry, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uBoneA: {
            value: Array.from({ length: MAX_BONES }, () => new THREE.Vector3()),
          },
          uBoneB: {
            value: Array.from({ length: MAX_BONES }, () => new THREE.Vector3()),
          },
          uHeadCenter: { value: new THREE.Vector3(0, 1.6, 0) },
          uHeadRadius: { value: HEAD_RADIUS },
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  useFrame((state) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)

    const runIn = smoothstep(Math.min(1, p / 0.45))
    const sit = smoothstep((p - 0.55) / 0.35)
    const runPhase = 0.9 + Math.min(p, 0.5) * 30
    const pose: Joints = lerpJoints(runPose(runPhase), sitPose, sit)

    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uPixelRatio.value = gl.getPixelRatio()
    u.uHeadCenter.value.set(pose.head[0], pose.head[1], pose.head[2])

    BONES.forEach((bone, i) => {
      const a = pose[bone.a]
      const b = pose[bone.b]
      u.uBoneA.value[i].set(a[0], a[1], a[2])
      u.uBoneB.value[i].set(b[0], b[1], b[2])
    })

    if (group.current) {
      group.current.position.z = lerp(-1.8, 0.2, runIn)
      group.current.rotation.y = -0.12
    }

    if (blackHole.current) {
      const scale = smoothstep((p - 0.72) / 0.24) * 0.105
      const bx = (pose.chest[0] + pose.hips[0]) / 2
      const by = pose.chest[1] - 0.01
      const bz = pose.chest[2] + 0.1
      blackHole.current.position.set(bx, by, bz)
      blackHole.current.scale.setScalar(Math.max(0.0001, scale))
      blackHole.current.visible = scale > 0.004
    }
  })

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />

      <group ref={blackHole} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#010103" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.01, 0.0035, 6, 128]} />
          <meshBasicMaterial color="#3c5578" toneMapped={false} transparent opacity={0.22} />
        </mesh>
      </group>
    </group>
  )
}
