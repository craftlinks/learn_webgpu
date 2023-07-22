struct vsOUT {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

struct StaticBuffer { // static uniform values
    offset: vec2f,
    colors: array<vec4f, 3>,
}

struct DynamicBuffer { // changes with every draw call
    scale: vec2f,
}

@group(0) @binding(0) var<storage, read> staticBuffers: array<StaticBuffer>;
@group(0) @binding(1) var<storage, read> dynamicBuffers: array<DynamicBuffer>;

@vertex
fn vs(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
) -> vsOUT {
    let pos = array(
        vec2f(0.0, 0.5),  // top center
        vec2f(-0.5, -0.5),  // bottom left
        vec2f(0.5, -0.5)   // bottom right
    );

    let staticBuffer = staticBuffers[instanceIndex];
    let dynamicBuffer = dynamicBuffers[instanceIndex]; 

    return vsOUT(vec4f(pos[vertexIndex] * dynamicBuffer.scale + staticBuffer.offset, 0.0, 1.0), staticBuffers[instanceIndex].colors[vertexIndex]);
}

@fragment
fn fs(fsInput: vsOUT) -> @location(0) vec4f {
    return fsInput.color;
}