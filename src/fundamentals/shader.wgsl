
struct vsOUT {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

struct StaticUniforms { // static uniform values
    offset: vec2f,
}

struct DynamicUniforms { // changes with every draw call
    scale: vec2f,
}

@group(0) @binding(0) var<uniform> staticUniforms: StaticUniforms;
@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) ->vsOUT {
    let pos = array(
        vec2f(0.0, 0.5),  // top center
        vec2f(-0.5, -0.5),  // bottom left
        vec2f(0.5, -0.5)   // bottom right
    );

    var color = array<vec4f, 3>(
        vec4f(1.0, 0.0, 0.0, 1.0), // R
        vec4f(0.0, 1.0, 0.0, 1.0), // G
        vec4f(0.0, 0.0, 1.0, 1.0)  // B
    );

    return vsOUT(vec4f(pos[vertexIndex] * dynamicUniforms.scale + staticUniforms.offset, 0.0, 1.0), color[vertexIndex]);
}

@fragment
fn fs(fsInput: vsOUT) -> @location(0) vec4f {
    return fsInput.color;
}