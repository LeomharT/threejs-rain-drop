import {
	Color,
	IcosahedronGeometry,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	Spherical,
	Uniform,
	Vector3,
	WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import earthFragmentShader from './shader/earth/fragment.glsl?raw';
import earthVertexShader from './shader/earth/vertex.glsl?raw';
import './style.css';

const main = document.querySelector('#app') as HTMLDivElement;

const size = {
	width: window.innerWidth,
	height: window.innerHeight,
	pixelRatio: Math.min(2, window.devicePixelRatio),
};

/**
 * Basic
 */

const renderer = new WebGLRenderer({
	alpha: true,
	antialias: true,
});
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(size.pixelRatio);
main.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color('#1e1e1e');

const camera = new PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
camera.position.set(3, 3, 3);
camera.lookAt(scene.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const stats = new Stats();
main.append(stats.dom);

/**
 * Scene
 */

// Uniforms
const uniforms = {
	uSunDirection: new Uniform(new Vector3()),
};

const sunSpherical = new Spherical(1, Math.PI / 2, 0.5);
const sunDirection = new Vector3();

// Sun
const sunGeometrt = new IcosahedronGeometry(0.1, 5);
const sunMaterial = new MeshBasicMaterial({ color: 'yellow' });
const sun = new Mesh(sunGeometrt, sunMaterial);

scene.add(sun);

function updateSun() {
	// Direction
	sunDirection.setFromSpherical(sunSpherical);

	// Sun Position
	sun.position.copy(sunDirection).multiplyScalar(5.0);

	// Uniforms
	uniforms.uSunDirection.value.copy(sunDirection);
}
updateSun();

// Earth
const earthGeometry = new SphereGeometry(2, 32, 32);
const earthMaterial = new ShaderMaterial({
	uniforms,
	vertexShader: earthVertexShader,
	fragmentShader: earthFragmentShader,
	transparent: true,
});
const earth = new Mesh(earthGeometry, earthMaterial);

scene.add(earth);

/**
 * Events
 */

function render(time: number = 0) {
	requestAnimationFrame(render);

	stats.update();
	controls.update(time);

	renderer.render(scene, camera);
}
render();

function resize() {
	size.width = window.innerWidth;
	size.height = window.innerHeight;
	size.pixelRatio = Math.min(2, window.devicePixelRatio);

	renderer.setSize(size.width, size.height);

	camera.aspect = size.width / size.height;
	camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
