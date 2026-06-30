import * as TweakpaneEssentialsPlugin from '@tweakpane/plugin-essentials';
import {
  AxesHelper,
  Color,
  DirectionalLight,
  InstancedBufferAttribute,
  InstancedMesh,
  Layers,
  LinearFilter,
  LinearMipmapLinearFilter,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NearestMipMapLinearFilter,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RectAreaLight,
  RepeatWrapping,
  Scene,
  ShaderChunk,
  ShaderLib,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Timer,
  TorusGeometry,
  Uniform,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import {
  EffectComposer,
  FXAAPass,
  GLTFLoader,
  HDRLoader,
  OrbitControls,
  OutputPass,
  RectAreaLightHelper,
  Reflector,
  RenderPass,
  ShaderPass,
  TrackballControls,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
import bloomFragmentShader from './shader/bloom/fragment.glsl?raw';
import bloomVertexShader from './shader/bloom/vertex.glsl?raw';
import random2D from './shader/include/random2D.glsl?raw';
import simplex3DNoise from './shader/include/simplex3DNoise.glsl?raw';
import rainFragmentShader from './shader/rain/fragment.glsl?raw';
import rainVertexShader from './shader/rain/vertex.glsl?raw';
import rippleFragmentShader from './shader/ripple/fragment.glsl?raw';
import rippleVertexShader from './shader/ripple/vertex.glsl?raw';
import './style.css';

type ShaderLab = typeof ShaderChunk & {
  random2D: string;
  simplex3DNoise: string;
};

(ShaderChunk as ShaderLab)['random2D'] = random2D;
(ShaderChunk as ShaderLab)['simplex3DNoise'] = simplex3DNoise;

console.log(ShaderLib);

const LAYERS = {
  BLOOM: 1,
  RAIN: 2,
};

const BLOOM_LAYER = new Layers();
BLOOM_LAYER.set(LAYERS.BLOOM);

const RAIN_LAYER = new Layers();
RAIN_LAYER.enable(LAYERS.RAIN);

const el = document.querySelector('#root') as HTMLDivElement;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelratio: Math.min(2, window.devicePixelRatio),
  resolution: new Vector2(window.innerWidth, window.innerHeight),
};

const materials: Record<string, Material> = {};
const darkMaterial = new MeshBasicMaterial({ color: '#000' });

/**
 * Loader
 */

const textureLoader = new TextureLoader();
textureLoader.setPath('/src/assets/textures');

const gltfLoader = new GLTFLoader();
gltfLoader.setPath('/src/assets/models/');

const hdrLoader = new HDRLoader();
hdrLoader.setPath('/src/assets/hdr/');

/**
 * Textures
 */

const floorNormal = textureLoader.load('/normal.png');
const floorRoughness = textureLoader.load('/roughness.jpg');
const floorMask = textureLoader.load('/opacity.jpg');

const rainNormal = textureLoader.load('/rainNormal.png');

const breakNormal = textureLoader.load('/brick-normal2.jpg');
breakNormal.wrapS = breakNormal.wrapT = RepeatWrapping;
breakNormal.repeat.set(2, 2);

/**
 * Basic
 */

const renderer = new WebGLRenderer({
  alpha: true,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(1.0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
el.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color('#000');

const camera = new PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(-0.2, 0.5, 1);
camera.lookAt(scene.position);
camera.layers.enable(LAYERS.BLOOM);
camera.layers.enable(LAYERS.RAIN);

const timer = new Timer();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = true;
controls.enablePan = false;
controls.enableZoom = false;
controls.maxPolarAngle = Math.PI / 2.25;
controls.minPolarAngle = 0;

const controls2 = new TrackballControls(camera, renderer.domElement);
controls2.noRotate = true;
controls2.noPan = true;
controls2.noZoom = false;
controls2.dynamicDampingFactor = 0.2;

const stats = new Stats();
el.append(stats.dom);

/**
 * Post progressing
 */

const composer = new EffectComposer(renderer);
composer.setSize(sizes.width, sizes.height);
composer.setPixelRatio(sizes.pixelratio);

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.setSize(sizes.width, sizes.height);
bloomComposer.setPixelRatio(sizes.pixelratio);

const renderPass = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new Vector2(sizes.width, sizes.height),
  0.1,
  0.5,
  0.0,
);

const mixPass = new ShaderPass(
  new ShaderMaterial({
    uniforms: {
      uDiffuse: new Uniform(null),
      uBloomTexture: new Uniform(bloomComposer.renderTarget2.texture),
    },
    vertexShader: bloomVertexShader,
    fragmentShader: bloomFragmentShader,
  }),
  'uDiffuse',
);

bloomComposer.addPass(renderPass);
bloomComposer.addPass(bloomPass);

const fxaa = new FXAAPass();
const outputPass = new OutputPass();

composer.addPass(renderPass);
composer.addPass(mixPass);
composer.addPass(fxaa);
composer.addPass(outputPass);

/**
 * Uniforms
 */

const uniforms = {
  uResolution: new Uniform(sizes.resolution),
  uTime: new Uniform(0),

  uGroundWetMask: new Uniform(floorMask),
  uRoughnessMap: new Uniform(floorRoughness),
  uGroundNormal: new Uniform(floorNormal),
  uGroundReflection: new Uniform<Texture | null>(null),
  uTextureMatrix: new Uniform<Matrix4>(new Matrix4()),

  uRippleCircleScale: new Uniform(15.049),
  uDistortionAmount: new Uniform(0.088),
  uBlurStrength: new Uniform(5.894),
};

/**
 * World
 */
const floorGeometry = new PlaneGeometry(5, 5, 128, 128);

// Reflection
const reflectionGeometry = floorGeometry.clone();
const floorMirror = new Reflector(reflectionGeometry, {
  clipBias: 0.003,
  textureWidth: sizes.width * sizes.pixelratio,
  textureHeight: sizes.height * sizes.pixelratio,
  color: 0xb5b5b5,
});
floorMirror.rotation.x = -Math.PI / 2;
floorMirror.position.y = -0.001;
scene.add(floorMirror);

// Floor
const floorMaterial = new ShaderMaterial({
  uniforms,
  vertexShader: rippleVertexShader,
  fragmentShader: rippleFragmentShader,
});
const floor = new Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true;
floor.castShadow = true;
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

uniforms.uGroundReflection.value = floorMirror.getRenderTarget().texture;
uniforms.uGroundReflection.value.generateMipmaps = true;
uniforms.uGroundReflection.value.minFilter = LinearMipmapLinearFilter;
uniforms.uGroundReflection.value.magFilter = LinearFilter;

uniforms.uTextureMatrix.value = (
  floorMirror.material as ShaderMaterial
).uniforms.textureMatrix.value;

const ringGeometry = new TorusGeometry(0.8, 0.03, 32, 100);
const ringMaterial = new MeshBasicMaterial({
  color: new Color().setRGB(0.53, 0.36, 0.9),
});
const ring = new Mesh(ringGeometry, ringMaterial);
scene.add(ring);

// Rain
// Rain refract https://threejs.org/examples/#webgl_effects_stereo
const frameTexture = new WebGLRenderTarget(
  sizes.width * 1.0,
  sizes.height * 1.0,
  {
    magFilter: LinearFilter,
    minFilter: NearestMipMapLinearFilter,
    generateMipmaps: true,
  },
);

const rainUniforms = {
  uTime: new Uniform(0.0),
  uSpeed: new Uniform(10.0),
  uHeightRange: new Uniform(20),
  uRefraction: new Uniform(0.05),
  uBaseBrightness: new Uniform(0.1),
  uNormalTexture: new Uniform(rainNormal),
  uBgRT: new Uniform<Texture>(frameTexture.texture),
};

const rainParams: {
  count: number;
  progress: number[];
  speed: number[];
} = {
  count: 5000,
  progress: [],
  speed: [],
};

function updateFrameTexture() {
  camera.layers.disable(LAYERS.RAIN);

  renderer.setRenderTarget(frameTexture);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  camera.layers.enable(LAYERS.RAIN);
}

const rainGeometry = new PlaneGeometry();
const rainMaterial = new ShaderMaterial({
  vertexShader: rainVertexShader,
  fragmentShader: rainFragmentShader,
  uniforms: rainUniforms,
  transparent: true,
});

const objectRef = new Object3D();

const rain = new InstancedMesh(rainGeometry, rainMaterial, rainParams.count);
scene.add(rain);

const debug = false;

for (let i = 0; i < rainParams.count; i++) {
  // Rain Matrix
  objectRef.position.set(
    MathUtils.randFloat(-5, 5),
    0,
    MathUtils.randFloat(-15, 5),
  );
  objectRef.scale.set(0.01, MathUtils.randFloat(0.2, 0.4), 0.01);

  if (debug) {
    objectRef.scale.set(1, 1, 1);
    rainUniforms.uSpeed.value = 0;
  }

  objectRef.updateMatrix();

  // Rain Progress
  rainParams.progress.push(Math.random());

  // Rain Speed
  rainParams.speed.push(objectRef.scale.y * 1.0);

  rain.setMatrixAt(i, objectRef.matrix);
}

rain.layers.set(LAYERS.RAIN);
rain.rotation.set(-0.1, 0, 0.1);
rain.position.set(0, 1.0, 4);
rain.geometry.setAttribute(
  'aProgress',
  new InstancedBufferAttribute(new Float32Array(rainParams.progress), 1),
);
rain.geometry.setAttribute(
  'aSpeed',
  new InstancedBufferAttribute(new Float32Array(rainParams.speed), 1),
);

// Walls
const wallGeometry = new PlaneGeometry(5, 5, 128, 128);

// Back Wall
const backWallMaterial = new MeshPhysicalMaterial({
  normalMap: breakNormal,
});
const backWall = new Mesh(wallGeometry, backWallMaterial);
backWall.position.y = 2.5;
backWall.position.z = -2.5;
scene.add(backWall);

// Left Wall
const leftWallMaterial = new MeshStandardMaterial({});
const leftWall = new Mesh(wallGeometry, leftWallMaterial);
leftWall.position.x = -2.5;
leftWall.position.y = 2.5;
leftWall.rotation.y = Math.PI / 2;
// scene.add(leftWall);

// Right Wall
const rightWallMaterial = new MeshStandardMaterial({});
const rightWall = new Mesh(wallGeometry, rightWallMaterial);
rightWall.position.x = 2.5;
rightWall.position.y = 2.5;
rightWall.rotation.y = -Math.PI / 2;
// scene.add(rightWall);

/**
 * Debug
 */

/**
 * Lights
 */

const directionalLight = new DirectionalLight('#ffffff', 0.1);
directionalLight.position.set(0, 1, 0);
directionalLight.castShadow = true;
// scene.add(directionalLight);

const pointLight = new PointLight('#81C8F2', 0.05, 10);
pointLight.position.set(0, 4, -2);
scene.add(pointLight);
// scene.add(new PointLightHelper(pointLight));

const rectLight1 = new RectAreaLight('#89D7FF', 0.5, 4.5, 0.2);
rectLight1.position.set(0, 2, -2.5);
rectLight1.rotation.set(MathUtils.degToRad(90), MathUtils.degToRad(180), 0);
scene.add(rectLight1);

const rectLight1Helper = new RectAreaLightHelper(rectLight1);
scene.add(rectLight1Helper);

/**
 * Helpers
 */

const axesHelper = new AxesHelper(10);
axesHelper.visible = false;
scene.add(axesHelper);

/**
 * Pane
 */

const pane = new Pane({ title: 'Debug Params' });
pane.registerPlugin(TweakpaneEssentialsPlugin);
pane.element.parentElement!.style.width = '380px';

const fpsGraph: any = pane.addBlade({
  view: 'fpsgraph',
  label: undefined,
  rows: 3,
  min: 30,
  max: 80,
});

// Rain
{
  const folder = pane.addFolder({ title: '🌧️ Rain' });
  folder.addBinding(uniforms.uRippleCircleScale, 'value', {
    label: 'CircleScale',
    min: 0.1,
    max: 20.0,
    step: 0.001,
  });
  folder.addBinding(rainUniforms.uRefraction, 'value', {
    label: 'Refraction',
    min: -0.1,
    max: 0.1,
    step: 0.0001,
  });
  folder.addBinding(uniforms.uDistortionAmount, 'value', {
    label: 'Distortion Amount',
    min: 0.0,
    max: 1.0,
    step: 0.001,
  });
  folder.addBinding(uniforms.uBlurStrength, 'value', {
    label: 'Blur Strength',
    min: -10,
    max: 10,
    step: 0.001,
  });
  folder.addBinding(rain.position, 'x', {
    label: 'Rain Position X',
    min: 0,
    max: 10,
    step: 0.01,
  });
  folder.addBinding(rain.position, 'y', {
    label: 'Rain Position Y',
    min: -10,
    max: 10,
    step: 0.01,
  });
  folder.addBinding(rain.position, 'z', {
    label: 'Rain Position Z',
    min: 0,
    max: 10,
    step: 0.01,
  });
}
// Light
{
  const folder = pane.addFolder({ title: '💡 Light' });
  folder.addBinding(directionalLight, 'color', {
    label: 'Light Color',
    color: {
      type: 'float',
    },
  });
}
// Bloom
{
  const f = pane.addFolder({ title: 'Bloom' });
  f.addBinding(bloomPass, 'radius', {
    min: 0,
    max: 1,
    step: 0.001,
  });
  f.addBinding(bloomPass, 'strength', {
    min: 0,
    max: 1,
    step: 0.001,
  });
  f.addBinding(bloomPass, 'threshold', {
    min: 0,
    max: 10,
    step: 0.001,
  });
}

const f_monkey = pane.addFolder({
  title: 'Monkey',
});
f_monkey
  .addBinding(ringMaterial, 'color', {
    color: { type: 'float' },
  })
  .on('change', (val) => {
    ringMaterial.color = new Color().setRGB(
      val.value.r,
      val.value.g,
      val.value.b,
    );
  });

/**
 * Event
 */

function render() {
  fpsGraph.begin();

  // Time
  timer.update();
  const delta = timer.getDelta();
  const elapsedTime = timer.getElapsed();

  updateFrameTexture();

  bloomComposer.render(delta);
  composer.render(delta);

  // Update
  controls2.update();
  controls.update(delta);
  stats.update();

  uniforms.uTime.value = elapsedTime;
  rainUniforms.uTime.value = elapsedTime;

  // Animation
  requestAnimationFrame(render);

  fpsGraph.end();
}
render();

function resize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.resolution.x = window.innerWidth;
  sizes.resolution.y = window.innerHeight;
  sizes.pixelratio = Math.min(2, window.devicePixelRatio);

  uniforms.uResolution.value = sizes.resolution;

  renderer.setSize(sizes.width, sizes.height);

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);

function darkenMaterial(obj: Object3D) {
  if (obj instanceof Mesh && !BLOOM_LAYER.test(obj.layers)) {
    materials[obj.uuid] = obj.material;
    obj.material = darkMaterial;
  }
}

function restoreMaterial(obj: Object3D) {
  if (obj instanceof Mesh && materials[obj.uuid]) {
    obj.material = materials[obj.uuid];
    delete materials[obj.uuid];
  }
}
