import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { shotFigureZ, SHOT_FIGURE_X } from '../shot/shotMotion'
import {
  BONES,
  HEAD_RADIUS,
  lerp,
  lerpJoints,
  reachPose,
  runPose,
  sitPose,
  standPose,
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

      // A few little clusters, so the surface reads as gathered starlight.
      if (Math.random() < 0.06) {
        const clusterCount = 2 + Math.floor(Math.random() * 3)
        for (let k = 0; k < clusterCount; k++) {
          addParticle(
            lists,
            index,
            pickColor().multiplyScalar(0.5 + Math.random() * 0.25),
            0.011 + Math.random() * 0.012,
            radial * (0.94 + Math.random() * 0.06),
            Math.random(),
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          )
        }
      }
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
  uniform float uFlash;

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

    // A tiny drift makes the cloud alive without losing the body.
    pos += vec3(
      sin(uTime * 0.8 + aPhase),
      cos(uTime * 0.6 + aPhase * 1.3),
      sin(uTime * 0.7 + aPhase * 0.8)
    ) * 0.004;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (720.0 / max(1.0, -mv.z)) * uPixelRatio;

    float twinkle = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase * 3.0);
    vColor = mix(aColor, vec3(0.55, 0.72, 1.0), uFlash);
    vAlpha = 0.3 + 0.56 * twinkle;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    if (r > 0.5) discard;

    float core = smoothstep(0.14, 0.0, r);
    float halo = smoothstep(0.5, 0.08, r) * 0.18;
    float spikeX = exp(-abs(p.x) * 42.0) * exp(-abs(p.y) * 7.0);
    float spikeY = exp(-abs(p.y) * 42.0) * exp(-abs(p.x) * 7.0);
    float alpha = core + (spikeX + spikeY) * 0.42 + halo;

    gl_FragColor = vec4(vColor, alpha * vAlpha * uOpacity);
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
export function HumanFigure({
  progress,
  mode = 'preview',
}: {
  progress: MotionValue<number>
  mode?: 'preview' | 'film' | 'shot'
}) {
  const group = useRef<THREE.Group>(null)
  const gl = useThree((state) => state.gl)
  const compact = useThree((state) => state.size.width < 900)

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
          uOpacity: { value: 1 },
          uFlash: { value: 0 },
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
    const figure = group.current
    if (!figure) return

    let sit: number
    let stand: number
    let fade = 1
    let flash = 0
    let pose: Joints
    const t = state.clock.elapsedTime

    if (mode === 'film') {
      const hero = smoothstep(Math.min(1, p / 0.15))
      figure.position.x = compact ? 0 : 1.15
      figure.position.z = lerp(-2.2, 0, hero)
      figure.rotation.y = -0.06
      const runPhase = state.clock.elapsedTime * 5.2
      sit = smoothstep((p - 0.15) / 0.12)
      stand = smoothstep((p - 0.5) / 0.08)
      fade = 1 - smoothstep((p - 0.7) / 0.14)
      flash = Math.exp(-Math.pow((p - 0.455) / 0.016, 2))
      const reach = smoothstep((p - 0.09) / 0.04) * (1 - smoothstep((p - 0.16) / 0.05))
      const reaching = lerpJoints(runPose(runPhase), reachPose, reach)
      pose = lerpJoints(lerpJoints(reaching, sitPose, sit), standPose, stand)
    } else if (mode === 'shot') {
      const t = THREE.MathUtils.clamp(p, 0, 1)
      figure.position.x = compact ? 0 : SHOT_FIGURE_X
      figure.position.z = shotFigureZ(t)
      figure.rotation.y = 0
      sit = 0
      stand = 0
      pose = runPose(0.9 + t * 36)
    } else {
      const runIn = smoothstep(Math.min(1, p / 0.45))
      figure.position.x = 0
      figure.position.z = lerp(-1.8, 0.2, runIn)
      figure.rotation.y = -0.12
      sit = smoothstep((p - 0.55) / 0.35)
      stand = 0
      const runPhase = 0.9 + Math.min(p, 0.5) * 30
      pose = lerpJoints(runPose(runPhase), sitPose, sit)
    }

    figure.position.y = Math.sin(t * 0.8) * 0.015
    figure.rotation.z = Math.sin(t * 0.5) * 0.006
    figure.updateMatrixWorld(true)

    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uPixelRatio.value = gl.getPixelRatio()
    u.uOpacity.value = fade
    u.uFlash.value = flash
    u.uHeadCenter.value.set(pose.head[0], pose.head[1], pose.head[2])

    BONES.forEach((bone, i) => {
      const a = pose[bone.a]
      const b = pose[bone.b]
      u.uBoneA.value[i].set(a[0], a[1], a[2])
      u.uBoneB.value[i].set(b[0], b[1], b[2])
    })
  })

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}
