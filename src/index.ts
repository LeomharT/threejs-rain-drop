import {
	Clock,
	Color,
	Mesh,
	PerspectiveCamera,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	WebGLRenderer,
} from 'three';
import { OrbitControls, TrackballControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
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
 * Basic
 */

// Renderer
const renderer = new WebGLRenderer({
	alpha: true,
	antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

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

const earthGeometry = new SphereGeometry(2, 32, 32);
const earthMaterial = new ShaderMaterial({
	wireframe: true,
	vertexShader: earthVertexShader,
	fragmentShader: earthFragmentShader,
});

const earth = new Mesh(earthGeometry, earthMaterial);
scene.add(earth);

/**
 * Pane
 */

const pane = new Pane({ title: 'Debug Params' });
pane.element.parentElement!.style.width = '380px';

// Earth Pane
{
	const folder = pane.addFolder({ title: '🌎 Earth' });
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
