import * as TweakpaneEssentialsPlugin from '@tweakpane/plugin-essentials';
import {
	AxesHelper,
	Clock,
	Color,
	DirectionalLight,
	InstancedBufferAttribute,
	InstancedMesh,
	LinearFilter,
	MathUtils,
	Matrix4,
	Mesh,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	NearestMipMapLinearFilter,
	Object3D,
	PCFSoftShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	RepeatWrapping,
	Scene,
	ShaderChunk,
	ShaderMaterial,
	Texture,
	TextureLoader,
	Uniform,
	Vector2,
	WebGLRenderer,
	WebGLRenderTarget,
} from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import {
	EffectComposer,
	GLTFLoader,
	OrbitControls,
	OutputPass,
	Reflector,
	RenderPass,
	RGBELoader,
	TrackballControls,
	UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
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

const RAIN_LAYER = 2;

const el = document.querySelector('#root') as HTMLDivElement;

const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
	pixelratio: Math.min(2, window.devicePixelRatio),
	resolution: new Vector2(window.innerWidth, window.innerHeight),
};

/**
 * Loader
 */

const textureLoader = new TextureLoader();
textureLoader.setPath('/src/assets/textures');

const gltfLoader = new GLTFLoader();
gltfLoader.setPath('/src/assets/models/');

const rgbeLoader = new RGBELoader();
rgbeLoader.setPath('/src/assets/hdr/');

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
renderer.shadowMap.type = PCFSoftShadowMap;
el.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color('#1e1e1e');

const camera = new PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 0, 1);
camera.lookAt(scene.position);
camera.layers.enable(RAIN_LAYER);

const clock = new Clock();

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

// Render pass
const renderPass = new RenderPass(scene, camera);
// Bloom pass
const bloomPass = new UnrealBloomPass(
	new Vector2(sizes.width, sizes.height),
	2.011,
	0.935,
	0.424
);
// Output pass
const outputPass = new OutputPass();

composer.addPass(renderPass);
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

	uRippleCircleScale: new Uniform(4.5),
};

/**
 * World
 */
const floorGeometry = new PlaneGeometry(5, 5, 128, 128);

// Reflection
const reflectionGeometry = floorGeometry.clone();
const floorMirror = new Reflector(reflectionGeometry, {
	clipBias: 0.003,
	textureWidth: 512,
	textureHeight: 512,
	color: 0xb5b5b5,
});
floorMirror.rotation.x = -Math.PI / 2;
floorMirror.position.y = -0.001;
scene.add(floorMirror);

// Floor
const floorMaterial = new CustomShaderMaterial({
	baseMaterial: MeshStandardMaterial,
	uniforms,
	normalMap: floorNormal,
	vertexShader: rippleVertexShader,
	fragmentShader: rippleFragmentShader,
	color: 0x1e1e1e,
});
const floor = new Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true;
floor.castShadow = true;
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

uniforms.uGroundReflection.value = floorMirror.getRenderTarget().texture;
uniforms.uTextureMatrix.value = (
	floorMirror.material as ShaderMaterial
).uniforms.textureMatrix.value;

// Monkey
gltfLoader.load('/suzanne.glb', (data) => {
	const suzanne = data.scene.children[0] as Mesh;
	suzanne.scale.setScalar(0.25);
	suzanne.position.y = 0.35;

	suzanne.material = new MeshStandardMaterial({
		color: 'yellow',
	});

	scene.add(suzanne);
});

// Rain
// Rain refract https://threejs.org/examples/#webgl_effects_stereo
const frameTexture = new WebGLRenderTarget(
	sizes.width * 1.0,
	sizes.height * 1.0,
	{
		magFilter: LinearFilter,
		minFilter: NearestMipMapLinearFilter,
		generateMipmaps: true,
	}
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
	rain.visible = false;

	renderer.setRenderTarget(frameTexture);
	renderer.render(scene, camera);
	renderer.setRenderTarget(null);

	rain.visible = true;
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
		MathUtils.randFloat(-15, 5)
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

rain.layers.set(RAIN_LAYER);
rain.rotation.set(-0.1, 0, 0.1);
rain.position.set(0, 1.0, 4);
rain.geometry.setAttribute(
	'aProgress',
	new InstancedBufferAttribute(new Float32Array(rainParams.progress), 1)
);
rain.geometry.setAttribute(
	'aSpeed',
	new InstancedBufferAttribute(new Float32Array(rainParams.speed), 1)
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
scene.add(leftWall);

// Right Wall
const rightWallMaterial = new MeshStandardMaterial({});
const rightWall = new Mesh(wallGeometry, rightWallMaterial);
rightWall.position.x = 2.5;
rightWall.position.y = 2.5;
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

/**
 * Debug
 */

/**
 * Lights
 */

const directionalLight = new DirectionalLight('#ffffff', 1.0);
directionalLight.position.set(3, 3, 3);
directionalLight.castShadow = true;
scene.add(directionalLight);

/**
 * Helpers
 */

const axesHelper = new AxesHelper();
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
		max: 5.0,
		step: 0.001,
	});
	folder.addBinding(rainUniforms.uRefraction, 'value', {
		label: 'Refraction',
		min: 0,
		max: 0.1,
		step: 0.0001,
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

/**
 * Event
 */

function render() {
	fpsGraph.begin();

	// Time
	const delta = clock.getDelta();
	const elapsedTime = clock.getElapsedTime();

	// Render
	updateFrameTexture();
	composer.render(delta);

	// Update
	controls.update(delta);
	controls2.update();
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
