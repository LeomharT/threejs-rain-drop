varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

void main(){
    // Variables
    vec3 color = vec3(0.0);
    vec2 uv = vUv;
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vPosition - cameraPosition);


    // Fresnel
    float fresnel = dot(viewDirection, normal);

    color = vec3(fresnel);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}