import {
	ACESFilmicToneMapping,
	BackSide,
	ClampToEdgeWrapping,
	Clock,
	Color,
	DoubleSide,
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
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
import atmosphereFragmentShader from './shader/atmosphere/fragment.glsl?raw';
import atmosphereVertexShader from './shader/atmosphere/vertex.glsl?raw';
import earthFragmentShader from './shader/earth/fragment.glsl?raw';
import earthVertexShader from './shader/earth/vertex.glsl?raw';

import './style.css';

const el = document.querySelector('#root') as HTMLDivElement;

const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
	pixelRatio: Math.min(2, window.devicePixelRatio),
};

/**
 * Loaders
 */
const textureLoader = new TextureLoader();
textureLoader.setPath('/src/assets/textures');

/**
 * Textures
 */

const earthDayMapTexture = textureLoader.load('/2k_earth_daymap.jpg');
earthDayMapTexture.colorSpace = SRGBColorSpace;
earthDayMapTexture.wrapS = ClampToEdgeWrapping;
earthDayMapTexture.wrapT = ClampToEdgeWrapping;
earthDayMapTexture.anisotropy = 16;

const earthNightMapTexture = textureLoader.load('/2k_earth_nightmap.jpg');
earthNightMapTexture.colorSpace = SRGBColorSpace;
earthNightMapTexture.wrapS = ClampToEdgeWrapping;
earthNightMapTexture.wrapT = ClampToEdgeWrapping;
earthNightMapTexture.anisotropy = 16;

const specularCloudsTexture = textureLoader.load('/specularClouds.jpg');

/**
 * Basic
 */

// Renderer
const renderer = new WebGLRenderer({
	alpha: true,
	antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

el.append(renderer.domElement);

// Scene
const scene = new Scene();
scene.background = new Color('#1e1e1e');

// Camera
const camera = new PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(6, 6, 6);
camera.lookAt(scene.position);

// Controler
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableDamping = true;
controls.enableZoom = false;

const controls2 = new TrackballControls(camera, renderer.domElement);
controls2.noPan = true;
controls2.noRotate = true;
controls2.noZoom = false;

// Monitor
const stats = new Stats();
el.append(stats.dom);

/**
 * Worlds
 */

const uniforms = {
	// Vector
	uSunDirection: new Uniform(new Vector3()),
	// Textures
	uEarthDayMapTexture: new Uniform(earthDayMapTexture),
	uEarthNightMapTexture: new Uniform(earthNightMapTexture),
	uSpecularCloudsTexture: new Uniform(specularCloudsTexture),
	// Colors
	uAtmosphereDayColor: new Uniform(new Color('#00aaff')),
	uAtmosphereTwilightColor: new Uniform(new Color('#ff6600')),
};

const sunDirection = new Vector3();
const sunSpherical = new Spherical(1, Math.PI / 2, 0.5);

const sunGeometry = new IcosahedronGeometry(0.1, 3);
const sunMaterial = new MeshBasicMaterial({
	color: 'yellow',
});
const sun = new Mesh(sunGeometry, sunMaterial);
scene.add(sun);

function updateSun() {
	// Direction
	sunDirection.setFromSpherical(sunSpherical);

	// Position
	sun.position.copy(sunDirection).multiplyScalar(5.0);

	// Uniform
	uniforms.uSunDirection.value.copy(sunDirection);
}

updateSun();

const earthGeometry = new SphereGeometry(2, 128, 128);
const earthMaterial = new ShaderMaterial({
	vertexShader: earthVertexShader,
	fragmentShader: earthFragmentShader,
	uniforms,
	transparent: true,
	side: DoubleSide,
});

const earth = new Mesh(earthGeometry, earthMaterial);
scene.add(earth);

const atmosphereGeometry = earthGeometry.clone();
const atmosphereMaterial = new ShaderMaterial({
	fragmentShader: atmosphereFragmentShader,
	vertexShader: atmosphereVertexShader,
	uniforms,
	transparent: true,
	side: BackSide,
});

const atmosphere = new Mesh(atmosphereGeometry, atmosphereMaterial);
atmosphere.scale.setScalar(1.04);
scene.add(atmosphere);

/**
 * Pane
 */

const pane = new Pane({ title: 'Debug Params' });
pane.element.parentElement!.style.width = '380px';

// Earth Pane
{
	const folder = pane.addFolder({ title: '🌎 Earth' });
	folder.addBinding(uniforms.uAtmosphereTwilightColor, 'value', {
		color: {
			type: 'float',
		},
	});
	folder.addBinding(uniforms.uAtmosphereDayColor, 'value', {
		color: {
			type: 'float',
		},
	});
}
// Sun Pane
{
	const folder = pane.addFolder({ title: '☀️ Sun' });
	folder
		.addBinding(sunSpherical, 'phi', {
			label: 'Sun Spherical Phi',
			min: 0,
			max: Math.PI,
			step: 0.01,
		})
		.on('change', updateSun);
	folder
		.addBinding(sunSpherical, 'theta', {
			label: 'Sun Spherical Theta',
			min: 0,
			max: Math.PI * 2,
			step: 0.01,
		})
		.on('change', updateSun);
}

/**
 * Events
 */

const clock = new Clock();

function render() {
	// Delta Time
	const delta = clock.getDelta();

	// Animation
	requestAnimationFrame(render);

	// Render
	renderer.render(scene, camera);

	// Updates
	controls.update(delta);
	controls2.update();
	stats.update();

	earth.rotation.y += delta * 0.1;
}

render();

function resize() {
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	sizes.pixelRatio = Math.min(2, window.devicePixelRatio);

	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);

	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
