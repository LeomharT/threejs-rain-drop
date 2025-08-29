import {
	ACESFilmicToneMapping,
	Clock,
	Color,
	EquirectangularReflectionMapping,
	Mesh,
	MeshStandardMaterial,
	PerspectiveCamera,
	Scene,
	ShaderChunk,
	TextureLoader,
	Uniform,
	WebGLRenderer,
} from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import {
	GLTFLoader,
	OrbitControls,
	RGBELoader,
	TrackballControls,
} from 'three/examples/jsm/Addons.js';
import { Pane } from 'tweakpane';
import fragmentShader from './shader/dissolution/fragment.glsl?raw';
import vertexShader from './shader/dissolution/vertex.glsl?raw';
import random2D from './shader/include/random2D.glsl?raw';
import simplex3DNoise from './shader/include/simplex3DNoise.glsl?raw';
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
	uProcess: new Uniform(-1.0),
	uFrequency: new Uniform(0.85),
	uEdgeColor: new Uniform(new Color(0x4d9bff)),
	uStrength: new Uniform(1.0),
	uEdge: new Uniform(0.03),
};

/**
 * World
 */

gltfLoader.load('suzanne.glb', (data) => {
	const suzanne = data.scene;

	if (suzanne.children[0] instanceof Mesh) {
		suzanne.children[0].material = new CustomShaderMaterial({
			baseMaterial: MeshStandardMaterial,
			uniforms,
			vertexShader,
			fragmentShader,
			transparent: true,
			roughness: 0.0,
			metalness: 1.0,
		});
	}

	scene.add(suzanne);
});

/**
 * Lights
 */

/**
 * Pane
 */

const pane = new Pane({ title: 'Debug' });
pane.element.parentElement!.style.width = '380px';
pane.addBinding(uniforms.uProcess, 'value', {
	label: 'Process',
	min: -1.0,
	max: 1.0,
	step: 0.001,
});
pane.addBinding(uniforms.uFrequency, 'value', {
	label: 'Frequency',
	min: 0,
	max: 10.0,
	step: 0.001,
});
pane.addBinding(uniforms.uStrength, 'value', {
	label: 'Strength',
	min: -1,
	max: 1,
	step: 1.0,
});
pane
	.addBinding(uniforms.uEdgeColor, 'value', {
		label: 'Edge Color',
		color: {
			type: 'float',
		},
	})
	.on('change', (val) => uniforms.uEdgeColor.value.set(new Color(val.value)));

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
