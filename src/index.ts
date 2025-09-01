import {
	ACESFilmicToneMapping,
	AxesHelper,
	Clock,
	EquirectangularReflectionMapping,
	Mesh,
	PCFSoftShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	Scene,
	ShaderChunk,
	ShaderMaterial,
	TextureLoader,
	Uniform,
	Vector2,
	WebGLRenderer,
} from 'three';
import {
	GLTFLoader,
	OrbitControls,
	RGBELoader,
	TrackballControls,
} from 'three/examples/jsm/Addons.js';
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

const abstract = textureLoader.load('/acstract2.jpg');

rgbeLoader.load('/zawiszy_czarnego_1k.hdr', (texture) => {
	texture.mapping = EquirectangularReflectionMapping;

	scene.background = texture;
	scene.environment = texture;
});

/**
 * Basic
 */

const renderer = new WebGLRenderer({
	alpha: true,
	antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelratio);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
el.append(renderer.domElement);

const scene = new Scene();

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

/**
 * Uniforms
 */

const uniforms = {
	uResolution: new Uniform(sizes.resolution),
	uTime: new Uniform(0),

	uAbstract: new Uniform(abstract),
};

/**
 * World
 */

const floorGeometry = new PlaneGeometry(3, 3, 128, 128);
const floorMaterial = new ShaderMaterial({
	uniforms,
	vertexShader: rippleVertexShader,
	fragmentShader: rippleFragmentShader,
});
const floor = new Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

/**
 * Lights
 */

/**
 * Helpers
 */

const axesHelper = new AxesHelper();
scene.add(axesHelper);

/**
 * Pane
 */

/**
 * Event
 */

function render() {
	// Render
	renderer.render(scene, camera);

	const delta = clock.getDelta();
	const elapsedTime = clock.getElapsedTime();

	uniforms.uTime.value = elapsedTime;

	// Update
	controls.update(delta);
	controls2.update();

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
