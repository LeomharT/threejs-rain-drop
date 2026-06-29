varying vec2 vUv;

void main() {
    #include <begin_vertex>
    #include <project_vertex>

    // Varying
    vUv = uv;
}