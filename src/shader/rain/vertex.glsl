precision mediump float;

attribute float aProgress;
attribute float aSpeed;

uniform float uTime;
uniform float uSpeed;
uniform float uHeightRange;


varying vec2 vUv;
varying vec2 vScreenspace;

// https://stackoverflow.com/questions/55582846/how-do-i-implement-an-instanced-billboard-in-three-js
vec3 billboard(vec3 v,mat4 view){
    vec3 up=vec3(view[0][1],view[1][1],view[2][1]);
    vec3 right=vec3(view[0][0],view[1][0],view[2][0]);
    vec3 pos=right*v.x+up*v.y;
    return pos;
}

vec3 distort(vec3 p){
    float y=mod(aProgress-uTime*aSpeed*0.25*uSpeed,1.0)*uHeightRange-(uHeightRange*0.5);
    p.y+=y;
    return p;
}

// https://github.com/Samsy/glsl-screenspace
vec2 screenspace(mat4 projectionmatrix, mat4 modelviewmatrix, vec3 position){
    vec4 temp=projectionmatrix*modelviewmatrix*vec4(position,1.0);
    temp.xyz/=temp.w;
    temp.xy=(.5)+(temp.xy)*.5;
    return temp.xy;
}


void main() {
    #include <begin_vertex>
    
    vec3 billboardPos = billboard(transformed, modelViewMatrix);

    transformed = billboardPos;
    transformed = distort(transformed);
    
    #include <project_vertex>
    

    // Varying
    vUv          = uv;
    vScreenspace = screenspace(projectionMatrix, modelViewMatrix, transformed);
}