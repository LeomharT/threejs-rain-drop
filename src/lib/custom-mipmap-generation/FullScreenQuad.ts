import { Mesh, OrthographicCamera, PlaneGeometry, ShaderMaterial, WebGLRenderer } from 'three';

export class FullScreenQuad {
  private _camera: OrthographicCamera;

  private _mesh: Mesh;

  get camera() {
    return this._camera;
  }

  get material() {
    return this._mesh.material;
  }

  set material(value) {
    this._mesh.material = value;
  }

  constructor(material?: ShaderMaterial) {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new PlaneGeometry(2, 2);

    this._mesh = new Mesh(geometry, material);
    this._camera = camera;
  }

  dispose() {
    this._mesh.geometry.dispose();
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this._mesh, this._camera);
  }
}
