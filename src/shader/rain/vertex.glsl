


// https://stackoverflow.com/questions/55582846/how-do-i-implement-an-instanced-billboard-in-three-js
vec3 billboard(vec3 v,mat4 view){
    vec3 up=vec3(view[0][1],view[1][1],view[2][1]);
    vec3 right=vec3(view[0][0],view[1][0],view[2][0]);
    vec3 pos=right*v.x+up*v.y;
    return pos;
}

vec3 distort(vec3 p){
    float y=mod(aProgress-iTime*aSpeed*.25*uSpeed,1.)*uHeightRange-(uHeightRange*.5);
    p.y+=y;
    return p;
}

// https://github.com/Samsy/glsl-screenspace
vec2 screenspace(mat4 projectionmatrix,mat4 modelviewmatrix,vec3 position){
    vec4 temp=projectionmatrix*modelviewmatrix*vec4(position,1.);
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
    
    vUv = uv;
    
    vScreenspace = screenspace(projectionMatrix,modelViewMatrix,transformed);
}