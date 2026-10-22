import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import {
  lerp,
  lerpJoints,
  reachPose,
  runPose,
  sitPose,
  standPose,
  smoothstep,
  type Joints,
  type Vec3,
} from './pose'

const MODEL_URL = '/models/human.glb'
const SURFACE_POINTS = 120_000
const STAR_COLORS = ['#6f8dff', '#8fa7ff', '#c9d6ff', '#efe9df', '#d8c4ff', '#ffc9e0', '#ffd7a3']

const BONE_NAMES = [
  'pelvis',
  'spine_01',
  'spine_02',
  'spine_03',
  'neck_01',
  'Head',
  'clavicle_l',
  'upperarm_l',
  'lowerarm_l',
  'hand_l',
  'clavicle_r',
  'upperarm_r',
  'lowerarm_r',
  'hand_r',
  'thigh_l',
  'calf_l',
  'foot_l',
  'ball_l',
  'thigh_r',
  'calf_r',
  'foot_r',
  'ball_r',
] as const

type BoneName = (typeof BONE_NAMES)[number]

interface MeshSurface {
  mesh: THREE.SkinnedMesh
  position: THREE.BufferAttribute
  normal: THREE.BufferAttribute | null
  skinIndex: THREE.BufferAttribute
  skinWeight: THREE.BufferAttribute
  index: THREE.BufferAttribute | null
  triangles: number
  cumulative: Float64Array
  area: number
}

interface PointBuffers {
  position: Float32Array
  skinIndex: Float32Array
  skinWeight: Float32Array
  color: Float32Array
  size: Float32Array
  phase: Float32Array
  cursor: number
}

function starColor(brightness: number): THREE.Color {
  const color = new THREE.Color(STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)])
  return color.multiplyScalar(brightness)
}

function buildSurfaceData(scene: THREE.Object3D): MeshSurface[] {
  const meshes: THREE.SkinnedMesh[] = []
  scene.traverse((object) => {
    const skinned = object as THREE.SkinnedMesh
    if (skinned.isSkinnedMesh) meshes.push(skinned)
  })

  const surfaces: MeshSurface[] = []
  meshes.forEach((mesh) => {
    const geometry = mesh.geometry as THREE.BufferGeometry
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    const normal = geometry.getAttribute('normal') as THREE.BufferAttribute | null
    const skinIndex = geometry.getAttribute('skinIndex') as THREE.BufferAttribute
    const skinWeight = geometry.getAttribute('skinWeight') as THREE.BufferAttribute
    if (!position || !skinIndex || !skinWeight) return

    const index = geometry.index as THREE.BufferAttribute | null
    const triangles = index ? index.count / 3 : position.count / 3
    const cumulative = new Float64Array(triangles)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const ab = new THREE.Vector3()
    const ac = new THREE.Vector3()
    let total = 0

    for (let t = 0; t < triangles; t++) {
      const ia = index ? index.getX(t * 3) : t * 3
      const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1
      const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2
      a.fromBufferAttribute(position, ia)
      b.fromBufferAttribute(position, ib)
      c.fromBufferAttribute(position, ic)
      ab.subVectors(b, a)
      ac.subVectors(c, a)
      total += ab.cross(ac).length() * 0.5
      cumulative[t] = total
    }

    if (total > 0) {
      surfaces.push({ mesh, position, normal, skinIndex, skinWeight, index, triangles, cumulative, area: total })
    }
  })

  return surfaces
}

function writePoint(
  buffers: PointBuffers,
  point: THREE.Vector3,
  skinIndex: THREE.BufferAttribute,
  skinWeight: THREE.BufferAttribute,
  dominant: number,
  color: THREE.Color,
  size: number,
  phase: number,
) {
  const i = buffers.cursor
  if (i * 3 >= buffers.position.length) return
  const p = i * 3
  const s = i * 4
  buffers.position[p] = point.x
  buffers.position[p + 1] = point.y
  buffers.position[p + 2] = point.z

  let sum = 0
  const w = [0, 0, 0, 0]
  for (let k = 0; k < 4; k++) {
    const value = skinWeight.getComponent(dominant, k)
    w[k] = value
    sum += value
  }
  if (sum < 0.0001) {
    w[0] = 1
    sum = 1
  }
  for (let k = 0; k < 4; k++) {
    buffers.skinIndex[s + k] = skinIndex.getComponent(dominant, k)
    buffers.skinWeight[s + k] = w[k] / sum
  }

  buffers.color[p] = color.r
  buffers.color[p + 1] = color.g
  buffers.color[p + 2] = color.b
  buffers.size[i] = size
  buffers.phase[i] = phase
  buffers.cursor++
}

function buildPointGeometry(scene: THREE.Object3D): THREE.BufferGeometry {
  const surfaces = buildSurfaceData(scene)
  const totalArea = surfaces.reduce((sum, surface) => sum + surface.area, 0)
  const counts = surfaces.map((surface) =>
    Math.max(1_500, Math.round((SURFACE_POINTS * surface.area) / Math.max(totalArea, 0.0001))),
  )
  const maxPoints = Math.ceil(SURFACE_POINTS * 1.65) + 4000

  const buffers: PointBuffers = {
    position: new Float32Array(maxPoints * 3),
    skinIndex: new Float32Array(maxPoints * 4),
    skinWeight: new Float32Array(maxPoints * 4),
    color: new Float32Array(maxPoints * 3),
    size: new Float32Array(maxPoints),
    phase: new Float32Array(maxPoints),
    cursor: 0,
  }

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const na = new THREE.Vector3()
  const nb = new THREE.Vector3()
  const nc = new THREE.Vector3()
  const point = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const scatter = new THREE.Vector3()

  surfaces.forEach((surface, surfaceIndex) => {
    const count = counts[surfaceIndex]
    const { position, normal: normalAttr, skinIndex, skinWeight, index, triangles, cumulative, area, mesh } = surface

    for (let i = 0; i < count; i++) {
      const target = Math.random() * area
      let lo = 0
      let hi = triangles - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cumulative[mid] < target) lo = mid + 1
        else hi = mid
      }

      const ia = index ? index.getX(lo * 3) : lo * 3
      const ib = index ? index.getX(lo * 3 + 1) : lo * 3 + 1
      const ic = index ? index.getX(lo * 3 + 2) : lo * 3 + 2
      a.fromBufferAttribute(position, ia)
      b.fromBufferAttribute(position, ib)
      c.fromBufferAttribute(position, ic)

      let u = Math.random()
      let v = Math.random()
      if (u + v > 1) {
        u = 1 - u
        v = 1 - v
      }
      const w0 = 1 - u - v
      const w1 = u
      const w2 = v

      point.set(
        a.x * w0 + b.x * w1 + c.x * w2,
        a.y * w0 + b.y * w1 + c.y * w2,
        a.z * w0 + b.z * w1 + c.z * w2,
      )
      point.applyMatrix4(mesh.bindMatrix)

      if (normalAttr) {
        na.fromBufferAttribute(normalAttr, ia)
        nb.fromBufferAttribute(normalAttr, ib)
        nc.fromBufferAttribute(normalAttr, ic)
        normal.set(
          na.x * w0 + nb.x * w1 + nc.x * w2,
          na.y * w0 + nb.y * w1 + nc.y * w2,
          na.z * w0 + nb.z * w1 + nc.z * w2,
        )
        if (normal.lengthSq() > 0.000001) normal.normalize()
        else normal.set(0, 1, 0)
      } else {
        normal.set(0, 1, 0)
      }

      const dominant = w0 >= w1 && w0 >= w2 ? ia : w1 >= w2 ? ib : ic
      const phase = Math.random() * Math.PI * 2
      const bright = Math.random() < 0.05
      writePoint(
        buffers,
        point,
        skinIndex,
        skinWeight,
        dominant,
        starColor(bright ? 0.9 : 0.36 + Math.random() * 0.24),
        bright ? 0.02 + Math.random() * 0.014 : 0.007 + Math.random() * 0.007,
        phase,
      )

      // A few little clusters make the surface read as gathered starlight
      // rather than an even mist.
      if (Math.random() < 0.07) {
        const clusterCount = 2 + Math.floor(Math.random() * 3)
        for (let k = 0; k < clusterCount; k++) {
          const clusterPoint = point.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.02,
              (Math.random() - 0.5) * 0.02,
              (Math.random() - 0.5) * 0.02,
            ),
          )
          writePoint(
            buffers,
            clusterPoint,
            skinIndex,
            skinWeight,
            dominant,
            starColor(0.48 + Math.random() * 0.26),
            0.011 + Math.random() * 0.012,
            Math.random() * Math.PI * 2,
          )
        }
      }

      // A sparse inner layer gives the body a soft volume instead of a shell.
      if (Math.random() < 0.14) {
        scatter.copy(normal).multiplyScalar(-(0.008 + Math.random() * 0.03))
        const inner = point.clone().add(scatter)
        writePoint(
          buffers,
          inner,
          skinIndex,
          skinWeight,
          dominant,
          starColor(0.24 + Math.random() * 0.2),
          0.005 + Math.random() * 0.005,
          Math.random() * Math.PI * 2,
        )
      }

      // A few stars drift just off the surface, like the body is gathering light.
      if (Math.random() < 0.06) {
        scatter
          .copy(normal)
          .multiplyScalar(0.012 + Math.random() * 0.035)
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.025,
              (Math.random() - 0.5) * 0.025,
              (Math.random() - 0.5) * 0.025,
            ),
          )
        const halo = point.clone().add(scatter)
        writePoint(
          buffers,
          halo,
          skinIndex,
          skinWeight,
          dominant,
          starColor(0.32 + Math.random() * 0.26),
          0.016 + Math.random() * 0.016,
          Math.random() * Math.PI * 2,
        )
      }
    }
  })

  const count = buffers.cursor
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(buffers.position.slice(0, count * 3), 3))
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(buffers.skinIndex.slice(0, count * 4), 4))
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(buffers.skinWeight.slice(0, count * 4), 4))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(buffers.color.slice(0, count * 3), 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(buffers.size.slice(0, count), 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(buffers.phase.slice(0, count), 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3)

  return geometry
}

const starFragment = /* glsl */ `
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

const vertexShader = /* glsl */ `
  uniform sampler2D boneTexture;
  uniform vec2 boneTextureSize;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFlash;

  attribute vec4 skinIndex;
  attribute vec4 skinWeight;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vAlpha;

  mat4 getBoneMatrix(const in float i) {
    float j = i * 4.0;
    float x = mod(j, boneTextureSize.x);
    float y = floor(j / boneTextureSize.x);
    vec4 v1 = texelFetch(boneTexture, ivec2(x, y), 0);
    vec4 v2 = texelFetch(boneTexture, ivec2(x + 1.0, y), 0);
    vec4 v3 = texelFetch(boneTexture, ivec2(x + 2.0, y), 0);
    vec4 v4 = texelFetch(boneTexture, ivec2(x + 3.0, y), 0);
    return mat4(v1, v2, v3, v4);
  }

  void main() {
    mat4 boneMatX = getBoneMatrix(skinIndex.x);
    mat4 boneMatY = getBoneMatrix(skinIndex.y);
    mat4 boneMatZ = getBoneMatrix(skinIndex.z);
    mat4 boneMatW = getBoneMatrix(skinIndex.w);

    vec4 skinned = boneMatX * vec4(position, 1.0) * skinWeight.x;
    skinned += boneMatY * vec4(position, 1.0) * skinWeight.y;
    skinned += boneMatZ * vec4(position, 1.0) * skinWeight.z;
    skinned += boneMatW * vec4(position, 1.0) * skinWeight.w;

    // A very small drift keeps the cloud alive without losing the body.
    skinned.xyz += vec3(
      sin(uTime * 0.8 + aPhase),
      cos(uTime * 0.6 + aPhase * 1.3),
      sin(uTime * 0.7 + aPhase * 0.8)
    ) * 0.004;

    vec4 mvPosition = modelViewMatrix * skinned;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (760.0 / max(1.0, -mvPosition.z)) * uPixelRatio;

    float twinkle = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase * 3.0);
    vColor = mix(aColor, vec3(0.55, 0.72, 1.0), uFlash);
    vAlpha = 0.3 + 0.56 * twinkle;
  }
`

const heartVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMix;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float a = uTime * 0.45 + aPhase;
    p.x += sin(a) * 0.004;
    p.y += cos(a * 1.2) * 0.004;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (760.0 / max(1.0, -mvPosition.z)) * uPixelRatio;

    float twinkle = 0.5 + 0.5 * sin(uTime * 2.4 + aPhase * 4.0);
    vColor = mix(aColor, vec3(0.5, 0.72, 1.0), uMix);
    vAlpha = 0.35 + 0.6 * twinkle;
  }
`

function buildHeart() {
  const count = 600
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const radius = 0.07 * Math.cbrt(Math.random())
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.cos(phi)
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    const color = new THREE.Color(Math.random() < 0.35 ? '#ffd7a3' : '#efe9df').multiplyScalar(
      0.24 + Math.random() * 0.25,
    )
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
    sizes[i] = 0.006 + Math.random() * 0.011
    phases[i] = Math.random() * Math.PI * 2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 1 },
      uMix: { value: 0 },
    },
    vertexShader: heartVertexShader,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  return new THREE.Points(geometry, material)
}

function toVector3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2])
}

function between(a: Vec3, b: Vec3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  )
}

/**
 * A real, skinned 3D human surface sampled into star points.
 *
 * The Superhero mesh (CC0) is only used for geometry and skin weights; the
 * visible object is a points cloud. The GPU samples the skeleton's bone
 * texture, so the stars deform with the real human rig. A sparse inner layer
 * and a drifting halo keep it from reading as a thin shell, and a small warm
 * star cluster replaces the old hollow black-hole placeholder at the chest.
 */
export function HumanFigure({
  progress,
  mode = 'preview',
}: {
  progress: MotionValue<number>
  mode?: 'preview' | 'film'
}) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Group>(null)
  const coreMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const bones = useRef<Partial<Record<BoneName, THREE.Object3D>>>({})
  const restQuaternions = useRef(new Map<THREE.Object3D, THREE.Quaternion>())
  const skeleton = useRef<THREE.Skeleton | null>(null)
  const headRestInGroup = useRef<THREE.Quaternion | null>(null)
  const gl = useThree((state) => state.gl)
  const rootScene = useThree((state) => state.scene)

  const { scene } = useGLTF(MODEL_URL)

  const geometry = useMemo(() => buildPointGeometry(scene), [scene])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          boneTexture: { value: null },
          boneTextureSize: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uOpacity: { value: 1 },
          uFlash: { value: 0 },
        },
        vertexShader,
        fragmentShader: starFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const points = useMemo(() => new THREE.Points(geometry, material), [geometry, material])
  const heart = useMemo(() => buildHeart(), [])

  useEffect(() => {
    let skinned: THREE.SkinnedMesh | null = null
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) mesh.visible = false
      if (!skinned && (object as THREE.SkinnedMesh).isSkinnedMesh) {
        skinned = object as THREE.SkinnedMesh
      }
    })

    if (!skinned) return

    const body = skinned as THREE.SkinnedMesh
    body.skeleton.computeBoneTexture()
    skeleton.current = body.skeleton
    material.uniforms.boneTexture.value = body.skeleton.boneTexture
    if (body.skeleton.boneTexture) {
      const image = body.skeleton.boneTexture.image as { width: number; height: number }
      material.uniforms.boneTextureSize.value.set(image.width, image.height)
    }

    const found: Partial<Record<BoneName, THREE.Object3D>> = {}
    const rest = new Map<THREE.Object3D, THREE.Quaternion>()
    BONE_NAMES.forEach((name) => {
      const bone = scene.getObjectByName(name)
      if (bone) {
        found[name] = bone
        rest.set(bone, bone.quaternion.clone())
      }
    })
    bones.current = found
    restQuaternions.current = rest

    if (found.Head && group.current) {
      group.current.updateMatrixWorld(true)
      const headWorld = found.Head.getWorldQuaternion(new THREE.Quaternion())
      const groupWorld = group.current.getWorldQuaternion(new THREE.Quaternion())
      headRestInGroup.current = groupWorld.invert().multiply(headWorld)
    }

    rootScene.add(points)
    return () => {
      rootScene.remove(points)
    }
  }, [scene, material, points, rootScene])

  useFrame((state) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const figure = group.current
    if (!figure) return

    let sit: number
    let stand: number
    let fade = 1
    let flash = 0
    let magnetar = 0
    let heartScale = 1
    let heartMix = 0
    let pose: Joints

    if (mode === 'film') {
      const hero = smoothstep(Math.min(1, p / 0.15))
      figure.position.z = lerp(-2.2, 0, hero)
      figure.rotation.y = -0.06
      const runPhase = state.clock.elapsedTime * 5.2
      sit = smoothstep((p - 0.15) / 0.12)
      stand = smoothstep((p - 0.5) / 0.08)
      fade = 1 - smoothstep((p - 0.7) / 0.14)
      flash = Math.exp(-Math.pow((p - 0.455) / 0.016, 2))
      magnetar = smoothstep((p - 0.34) / 0.08) * (1 - smoothstep((p - 0.56) / 0.08))
      heartScale = (1 - 0.55 * smoothstep((p - 0.16) / 0.12)) * (1 + 0.3 * magnetar)
      heartMix = magnetar
      const reach = smoothstep((p - 0.09) / 0.04) * (1 - smoothstep((p - 0.16) / 0.05))
      const reaching = lerpJoints(runPose(runPhase), reachPose, reach)
      pose = lerpJoints(lerpJoints(reaching, sitPose, sit), standPose, stand)
    } else {
      const runIn = smoothstep(Math.min(1, p / 0.45))
      figure.position.z = lerp(-1.8, 0.2, runIn)
      figure.rotation.y = -0.08
      sit = smoothstep((p - 0.55) / 0.35)
      stand = 0
      const runPhase = 0.9 + Math.min(p, 0.5) * 30
      pose = lerpJoints(runPose(runPhase), sitPose, sit)
    }

    figure.updateMatrixWorld(true)

    const b = bones.current
    const rest = restQuaternions.current
    if (!b.pelvis || !b.spine_01 || !b.spine_02 || !b.spine_03 || !b.neck_01 || !b.Head) return

    rest.forEach((quaternion, bone) => {
      bone.quaternion.copy(quaternion)
    })

    const pelvis = b.pelvis
    const parent = pelvis.parent
    if (!parent) return
    const targetHips = figure.localToWorld(toVector3(pose.hips))
    pelvis.position.copy(parent.worldToLocal(targetHips.clone()))
    figure.updateMatrixWorld(true)

    const inverseGroup = new THREE.Matrix4().copy(figure.matrixWorld).invert()

    const aim = (bone: THREE.Object3D | undefined, child: THREE.Object3D | undefined, target: THREE.Vector3) => {
      if (!bone || !child) return
      const bonePos = bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseGroup)
      const childPos = child.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseGroup)
      const current = childPos.sub(bonePos)
      if (current.lengthSq() < 0.0000001) return
      const desired = target.clone().sub(bonePos)
      if (desired.lengthSq() < 0.0000001) return
      current.normalize()
      desired.normalize()
      const rotation = new THREE.Quaternion().setFromUnitVectors(current, desired)
      const world = bone.getWorldQuaternion(new THREE.Quaternion())
      const parentWorld = bone.parent?.getWorldQuaternion(new THREE.Quaternion())
      if (!parentWorld) return
      world.premultiply(rotation)
      bone.quaternion.copy(parentWorld.invert().multiply(world))
      bone.updateMatrixWorld(true)
    }

    aim(b.spine_01, b.spine_02, between(pose.hips, pose.chest, 0.35))
    aim(b.spine_02, b.spine_03, between(pose.hips, pose.chest, 0.68))
    aim(b.spine_03, b.neck_01, toVector3(pose.neck))
    aim(b.neck_01, b.Head, toVector3(pose.head))

    if (b.Head && headRestInGroup.current) {
      const groupWorld = figure.getWorldQuaternion(new THREE.Quaternion())
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -sit * (1 - stand) * 0.22)
      const desiredHead = groupWorld.multiply(headRestInGroup.current.clone()).multiply(tilt)
      const neckWorld = b.Head.parent?.getWorldQuaternion(new THREE.Quaternion())
      if (neckWorld) {
        b.Head.quaternion.copy(neckWorld.invert().multiply(desiredHead))
        b.Head.updateMatrixWorld(true)
      }
    }

    aim(b.clavicle_l, b.upperarm_l, toVector3(pose.shoulderL))
    aim(b.upperarm_l, b.lowerarm_l, toVector3(pose.elbowL))
    aim(b.lowerarm_l, b.hand_l, toVector3(pose.handL))
    aim(b.clavicle_r, b.upperarm_r, toVector3(pose.shoulderR))
    aim(b.upperarm_r, b.lowerarm_r, toVector3(pose.elbowR))
    aim(b.lowerarm_r, b.hand_r, toVector3(pose.handR))

    aim(b.thigh_l, b.calf_l, toVector3(pose.kneeL))
    aim(b.calf_l, b.foot_l, toVector3(pose.footL))
    aim(b.foot_l, b.ball_l, new THREE.Vector3(pose.footL[0], pose.footL[1] - 0.01, pose.footL[2] + 0.12))
    aim(b.thigh_r, b.calf_r, toVector3(pose.kneeR))
    aim(b.calf_r, b.foot_r, toVector3(pose.footR))
    aim(b.foot_r, b.ball_r, new THREE.Vector3(pose.footR[0], pose.footR[1] - 0.01, pose.footR[2] + 0.12))

    figure.updateMatrixWorld(true)
    skeleton.current?.update()
    if (skeleton.current?.boneTexture) skeleton.current.boneTexture.needsUpdate = true

    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uPixelRatio.value = gl.getPixelRatio()
    material.uniforms.uOpacity.value = fade
    material.uniforms.uFlash.value = flash

    // Warm star cluster at the chest; it contracts, then turns blue for the
    // magnetar and finally fades into the crowd.
    heart.position.set(pose.chest[0], pose.chest[1] - 0.01, pose.chest[2] + 0.07)
    heart.rotation.y = state.clock.elapsedTime * 0.25
    heart.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.15
    heart.scale.setScalar(heartScale)
    const heartMaterial = heart.material as THREE.ShaderMaterial
    heartMaterial.uniforms.uTime.value = state.clock.elapsedTime
    heartMaterial.uniforms.uPixelRatio.value = gl.getPixelRatio()
    heartMaterial.uniforms.uOpacity.value = fade
    heartMaterial.uniforms.uMix.value = heartMix

    if (core.current) {
      const coreScale = magnetar * 0.06 + flash * 0.16
      core.current.position.set(pose.chest[0], pose.chest[1] - 0.01, pose.chest[2] + 0.08)
      core.current.scale.setScalar(Math.max(0.0001, coreScale))
      core.current.rotation.y = state.clock.elapsedTime * 1.2
      core.current.visible = mode === 'film' && (magnetar > 0.01 || flash > 0.01)
      if (coreMaterial.current) coreMaterial.current.opacity = 0.6 * magnetar * fade
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
      <primitive object={heart} />
      <group ref={core} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial
            ref={coreMaterial}
            color="#5f8dff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[1.55, 0.03, 8, 96]} />
          <meshBasicMaterial
            color="#a9c8ff"
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
