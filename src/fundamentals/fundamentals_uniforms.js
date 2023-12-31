// Fundamnetals, showing how to use Uniforms and Compute shaders.
// Note: Shows that Uisng Uniforms with many draw calls is not a good idea for large number of objects (Better use storage buffers).
import { loadFile, rand } from '../utils.js';
const sizes = {
    vec2f: 8,
    vec3f: 12,
    vec4f: 16
};
const numObjects = 5000;
const objectInfos = [];
async function main() {
    // Initialize WebGPU
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (adapter == null || device == null) {
        throw new Error('WebGPU is not supported');
    }
    // Handle device lost
    void device.lost.then((info) => {
        console.error('WebGPU device lost: ', info.message);
        if (info.reason !== 'destroyed') {
            // Try again
            void main();
        }
    });
    // Create and configure the canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 600;
    document.body.appendChild(canvas);
    const context = canvas.getContext('webgpu');
    if (context == null) {
        throw new Error('WebGPU is not supported');
    }
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: canvasFormat
    });
    // Load and compile the shader code into a shader module
    const shaderCode = await loadFile('../src/fundamentals/shader_uniforms.wgsl');
    const shaderModule = device.createShaderModule({
        label: 'shader.wgsl',
        code: shaderCode
    });
    // Create a render pipeline
    const renderPipeline = device.createRenderPipeline({
        label: 'render pipeline',
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs'
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs',
            targets: [{ format: canvasFormat }]
        }
    });
    // Create a renderpass descriptor
    const renderPassDescriptor = {
        label: 'canvas renderpass',
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0.1, g: 0.2, b: 0.3, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }
        ]
    };
    for (let i = 0; i < numObjects; i++) {
        // Uniforms
        const staticUniformsBuffer = device.createBuffer({
            label: `static uniforms buffer for object ${i}`,
            size: sizes.vec2f,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const dynamicUniformsBuffer = device.createBuffer({
            label: `dynamic uniforms buffer for object ${i}`,
            size: sizes.vec2f,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const staticUniformValues = new Float32Array(2);
        staticUniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], 0); // offset value
        device.queue.writeBuffer(staticUniformsBuffer, 0, staticUniformValues.buffer);
        const dynamicUniformValues = new Float32Array(2);
        const uniformsBindGroup = device.createBindGroup({
            label: `uniforms bind group for object ${i}`,
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: staticUniformsBuffer } },
                { binding: 1, resource: { buffer: dynamicUniformsBuffer } }
            ]
        });
        objectInfos.push({
            scale: rand(0.01, 0.1),
            dynamicUniformsBuffer,
            dynamicUniformValues,
            uniformsBindGroup
        });
    }
    // Render the triangle
    const render = () => {
        renderPassDescriptor.colorAttachments[Symbol.iterator]().next().value.view = context.getCurrentTexture().createView(); // For Canvas resize
        const aspect = Math.abs(canvas.width / canvas.height);
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        for (const objectInfo of objectInfos) {
            const { scale, dynamicUniformsBuffer, dynamicUniformValues, uniformsBindGroup } = objectInfo;
            dynamicUniformValues.set([scale / aspect, scale], 0); // scale value
            device.queue.writeBuffer(dynamicUniformsBuffer, 0, dynamicUniformValues.buffer);
            passEncoder.setBindGroup(0, uniformsBindGroup);
            passEncoder.draw(3, 1, 0, 0);
        }
        passEncoder.end();
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
    };
    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const canvas = entry.target;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
            render();
        }
    });
    resizeObserver.observe(canvas);
    // Load and compile the compute shader code into a shader module
    const computeCode = await loadFile('../src/fundamentals/compute.wgsl');
    const computeModule = device.createShaderModule({
        label: 'compute.wgsl',
        code: computeCode
    });
    // Create a compute pipeline
    const computePipeline = device.createComputePipeline({
        label: 'compute pipeline',
        layout: 'auto',
        compute: { module: computeModule, entryPoint: 'computeSomething' }
    });
    // Some data for compute input
    const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    // Create a buffer to store the input data
    const computeBuffer = device.createBuffer({
        label: 'compute buffer',
        size: input.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    // Copy our input data to that buffer
    device.queue.writeBuffer(computeBuffer, 0, input);
    // Create a buffer to store the output data
    const outputBuffer = device.createBuffer({
        label: 'output buffer',
        size: input.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    // Create compute bind group
    const computeBindGroup = device.createBindGroup({
        label: 'compute bind group',
        layout: computePipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: computeBuffer } }]
    });
    // Create compute encoder and pass
    const computeEncoder = device.createCommandEncoder({ label: 'compute encoder' });
    const computePass = computeEncoder.beginComputePass({
        label: 'compute pass'
    });
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(input.length);
    computePass.end();
    computeEncoder.copyBufferToBuffer(computeBuffer, 0, outputBuffer, 0, outputBuffer.size);
    const commandBuffer = computeEncoder.finish();
    device.queue.submit([commandBuffer]);
    // Read the output data
    await outputBuffer.mapAsync(GPUMapMode.READ);
    const output = new Float32Array(outputBuffer.getMappedRange());
    console.log('Input', input);
    console.log('Output', output);
    // Cleanup
    outputBuffer.unmap();
}
void main();
