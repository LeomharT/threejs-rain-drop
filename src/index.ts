import {
	ACESFilmicToneMapping,
	Clock,
	Color,
	IcosahedronGeometry,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	Spherical,
	SRGBColorSpace,
	TextureLoader,
	Uniform,
	Vector3,
	WebGLRenderer,
} from 'three';
import { OrbitControls, TrackballControls } from 'three/examples/jsm/Addons.js';
import { Pane } from 'tweakpane';
import earthFragmentShader from './shader/earth/fragment.glsl?raw';
import earthVertexShader from './shader/earth/vertex.glsl?raw';
import './style.css';

const el = document.querySelector('#root') as HTMLDivElement;

const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
	pixelratio: Math.min(2, window.devicePixelRatio),
};

/**
 * Loader
 */

const textureLoader = new TextureLoader();
textureLoader.setPath('/src/assets/textures');

/**
 * Textures
 */

const earthDayMapTexture = textureLoader.load('/2k_earth_daymap.jpg');
earthDayMapTexture.colorSpace = SRGBColorSpace;
earthDayMapTexture.anisotropy = 8;

const earthNightMapTexture = textureLoader.load('/2k_earth_nightmap.jpg');
earthNightMapTexture.colorSpace = SRGBColorSpace;
earthNightMapTexture.anisotropy = 8;

const specularCloudTexture = textureLoader.load('/specularClouds.jpg');

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

/**
 * Uniforms
 */

const uniforms = {
	uSunDirection: new Uniform(new Vector3()),

	// Color
	uAtmosphereDayColor: new Uniform(new Color('#00aaff')),
	uAtmosphereTwilightColor: new Uniform(new Color('#ff6600')),

	// Texutre
	uEarthDayMapTexture: new Uniform(earthDayMapTexture),
	uEarthNightMapTexture: new Uniform(earthNightMapTexture),
	uSpacularCloudTexture: new Uniform(specularCloudTexture),
};

/**
 * World
 */

const sunSpherical = new Spherical(1, Math.PI / 2, 0.5);
const sunDirection = new Vector3();

const sunGeometry = new IcosahedronGeometry(0.1, 3);
const sunMaterial = new MeshBasicMaterial({
	color: 'yellow',
});
const sun = new Mesh(sunGeometry, sunMaterial);
scene.add(sun);

function updateSun() {
	// Vector
	sunDirection.setFromSpherical(sunSpherical);

	// Uniform
	uniforms.uSunDirection.value.copy(sunDirection.clone());

	// Position
	sun.position.copy(sunDirection.clone()).multiplyScalar(5.0);
}
updateSun();

const earthGeometry = new SphereGeometry(2, 128, 128);
const earthMateiral = new ShaderMaterial({
	uniforms,
	vertexShader: earthVertexShader,
	fragmentShader: earthFragmentShader,
});
const earth = new Mesh(earthGeometry, earthMateiral);
scene.add(earth);

/**
 * Pane
 */

const pane = new Pane({ title: 'Debug' });
pane.element.parentElement!.style.width = '380px';
{
	const folder = pane.addFolder({ title: 'Sun' });
	folder
		.addBinding(sunSpherical, 'phi', {
			step: 0.001,
			min: 0,
			max: Math.PI,
		})
		.on('change', updateSun);
	folder
		.addBinding(sunSpherical, 'theta', {
			step: 0.001,
			min: -Math.PI,
			max: Math.PI,
		})
		.on('change', updateSun);
}

/**
 * Event
 */

function render() {
	// Render
	renderer.render(scene, camera);

	const delta = clock.getDelta();

	// Update
	controls.update(delta);
	controls2.update();

	earth.rotation.y += delta * 0.1;

	// Animation
	requestAnimationFrame(render);
}
render();

function resize() {
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	sizes.pixelratio = Math.min(2, window.devicePixelRatio);

	renderer.setSize(sizes.width, sizes.height);

	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
