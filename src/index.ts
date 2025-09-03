import * as TweakpaneEssentialsPlugin from '@tweakpane/plugin-essentials';
import {
	AxesHelper,
	Clock,
	Color,
	DirectionalLight,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	PCFSoftShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	ReinhardToneMapping,
	Scene,
	ShaderChunk,
	ShaderMaterial,
	Texture,
	TextureLoader,
	Uniform,
	Vector2,
	WebGLRenderer,
} from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import {
	GLTFLoader,
	OrbitControls,
	Reflector,
	RGBELoader,
	TrackballControls,
} from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
import random2D from './shader/include/random2D.glsl?raw';
import simplex3DNoise from './shader/include/simplex3DNoise.glsl?raw';
import rippleFragmentShader from './shader/ripple/fragment.glsl?raw';
import rippleVertexShader from './shader/ripple/vertex.glsl?raw';
import './style.css';

type ShaderLab = typeof ShaderChunk & {
	random2D: string;
	simplex3DNoise: string;
};

(ShaderChunk as ShaderLab)['random2D'] = random2D;
(ShaderChunk as ShaderLab)['simplex3DNoise'] = simplex3DNoise;

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

/**
 * Basic
 */

const renderer = new WebGLRenderer({
	alpha: true,
	antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(1.0);
renderer.toneMapping = ReinhardToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
el.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color('#1e1e1e');

const camera = new PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(3, 3, 3);
camera.lookAt(scene.position);

const clock = new Clock();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = true;
controls.enablePan = false;
controls.enableZoom = false;

const controls2 = new TrackballControls(camera, renderer.domElement);
controls2.noRotate = true;
controls2.noPan = true;
controls2.noZoom = false;
controls2.dynamicDampingFactor = 0.2;

const stats = new Stats();
el.append(stats.dom);

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
const floorGeometry = new PlaneGeometry(3, 3, 128, 128);

// Reflection
const reflectionGeometry = floorGeometry.clone();
const floorMirror = new Reflector(reflectionGeometry, {
	clipBias: 0.003,
	textureWidth: 1024,
	textureHeight: 1024,
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

// Test
gltfLoader.load('/suzanne.glb', (data) => {
	const suzanne = data.scene.children[0] as Mesh;
	suzanne.scale.setScalar(0.25);
	suzanne.position.y = 0.35;

	suzanne.material = new MeshStandardMaterial({
		color: 'yellow',
	});

	scene.add(suzanne);
});

/**
 * Lights
 */

const directionalLight = new DirectionalLight(0x94d2bd, 1.0);
directionalLight.position.set(-3, 3, -3);
directionalLight.castShadow = true;
scene.add(directionalLight);

/**
 * Helpers
 */

const axesHelper = new AxesHelper();
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

	// Render
	renderer.render(scene, camera);

	// Time
	const delta = clock.getDelta();
	const elapsedTime = clock.getElapsedTime();

	// Update
	controls.update(delta);
	controls2.update();
	stats.update();

	uniforms.uTime.value = elapsedTime;

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
