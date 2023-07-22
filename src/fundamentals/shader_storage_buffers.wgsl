
struct StaticBuffer { // static uniform values
    offset: vec2f,
    colors: array<vec4f,3>,
}

struct DynamicBuffer { // changes with every draw call
    scale: vec2f,
}

struct Vertex {
    pos: vec2f,
}

struct vsOUT {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@group(0) @binding(0) var<storage, read> staticBuffers: array<StaticBuffer>;
@group(0) @binding(1) var<storage, read> dynamicBuffers: array<DynamicBuffer>;
@group(0) @binding(2) var<storage, read> vertexBuffer: array<Vertex>;

@vertex
fn vs(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
) -> vsOUT {

    let staticBuffer = staticBuffers[instanceIndex];
    let dynamicBuffer = dynamicBuffers[instanceIndex]; 

    return vsOUT(vec4f(vertexBuffer[vertexIndex].pos * dynamicBuffer.scale + staticBuffer.offset, 0.0, 1.0), staticBuffers[instanceIndex].colors[vertexIndex%3]);
}

@fragment
fn fs(fsInput: vsOUT) -> @location(0) vec4f {
    return fsInput.color;
}