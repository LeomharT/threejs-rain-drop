import {
	AxesHelper,
	Clock,
	Color,
	DirectionalLight,
	Mesh,
	MeshStandardMaterial,
	MirroredRepeatWrapping,
	PCFSoftShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	ReinhardToneMapping,
	RepeatWrapping,
	Scene,
	ShaderChunk,
	TextureLoader,
	Uniform,
	Vector2,
	WebGLRenderer,
} from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import {
	GLTFLoader,
	OrbitControls,
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

/**
 * Textures
 */

const floorNormal = textureLoader.load('/Ground_Normal.jpg');
const floorRoughness = textureLoader.load('/Ground_Wet_002_roughness.jpg');
floorRoughness.wrapS = floorRoughness.wrapT = MirroredRepeatWrapping;

const floorMask = textureLoader.load('/Ground_Wet_002_mask.jpg');
floorMask.wrapS = floorMask.wrapT = RepeatWrapping;

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

	uRippleCircleScale: new Uniform(2.5),
	uRoughnessMap: new Uniform(floorRoughness),
};

/**
 * World
 */

// Floor
const floorGeometry = new PlaneGeometry(3, 3, 128, 128);
const floorMaterial = new CustomShaderMaterial({
	baseMaterial: MeshStandardMaterial,
	uniforms,
	vertexShader: rippleVertexShader,
	fragmentShader: rippleFragmentShader,
	normalMap: floorNormal,
	color: 0x1e1e1e,
});
const floor = new Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true;
floor.castShadow = true;
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

/**
 * Lights
 */

const directionalLight = new DirectionalLight(0x90e0ef, 1.0);
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
pane.element.parentElement!.style.width = '380px';

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
