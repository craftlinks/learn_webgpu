// Fundamnetals, showing how to use Uniforms and Compute shaders.
// Note: Shows that Uisng Uniforms with many draw calls is not a good idea for large number of objects (Better use storage buffers).

import { loadFile, rand } from '../utils.js'

const byteSizes = {
  f32: 4,
  vec2f: 8,
  vec3f: 12,
  vec4f: 16
}

const numObjects = 50000
const objectInfos: Array<{ scale: number }> = []

function createCircleVertices ({
  radius = 1,
  numSubdivisions = 48,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2
} = {}): { vertexData: Float32Array, numVertices: number } {
  // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
  const numVertices = numSubdivisions * 3 * 2
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2)

  let offset = 0
  const addVertex = (x: number, y: number): void => {
    vertexData[offset++] = x
    vertexData[offset++] = y
  }

  // 2 vertices per subdivision
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions
    const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions

    const c1 = Math.cos(angle1)
    const s1 = Math.sin(angle1)
    const c2 = Math.cos(angle2)
    const s2 = Math.sin(angle2)

    // first triangle
    addVertex(c1 * radius, s1 * radius)
    addVertex(c2 * radius, s2 * radius)
    addVertex(c1 * innerRadius, s1 * innerRadius)

    // second triangle
    addVertex(c1 * innerRadius, s1 * innerRadius)
    addVertex(c2 * radius, s2 * radius)
    addVertex(c2 * innerRadius, s2 * innerRadius)
  }

  return {
    vertexData,
    numVertices
  }
}

async function main (): Promise<void> {
  // Initialize WebGPU
  const adapter = await navigator.gpu?.requestAdapter()
  const device = await adapter?.requestDevice()
  if (adapter == null || device == null) {
    throw new Error('WebGPU is not supported')
  }

  // Handle device lost
  void device.lost.then((info) => {
    console.error('WebGPU device lost: ', info.message)
    if (info.reason !== 'destroyed') {
      // Try again
      void main()
    }
  })

  // Create and configure the canvas
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 600
  document.body.appendChild(canvas)
  const context = canvas.getContext('webgpu')
  if (context == null) {
    throw new Error('WebGPU is not supported')
  }
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
  context.configure({
    device,
    format: canvasFormat
  })

  // Load and compile the shader code into a shader module
  const shaderCode = await loadFile('../src/fundamentals/shader_storage_buffers.wgsl')
  const shaderModule = device.createShaderModule({
    label: 'shader.wgsl',
    code: shaderCode
  })

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
  })

  const staticUnitSizeInBytes =
    byteSizes.vec2f + // offset
    byteSizes.vec2f + // padding, 16 byte alignment!
    byteSizes.vec4f * 3 // colors, 1 for each vertex

  const dynamicUnitSizeInBytes = byteSizes.vec2f // scale

  const staticStorageBuffer = device.createBuffer({
    label: 'static storage buffer for objects',
    size: staticUnitSizeInBytes * numObjects,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })

  const dynamicStorageBuffer = device.createBuffer({
    label: 'dynamic storage buffer for objects',
    size: dynamicUnitSizeInBytes * numObjects,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })

  const staticStorageValues = new Float32Array(staticStorageBuffer.size / byteSizes.f32)
  const offsetOffset = 0
  const colorOffset = 4

  for (let i = 0; i < numObjects; i++) {
    const staticStorageBufferOffset = (staticUnitSizeInBytes / byteSizes.f32) * i
    staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticStorageBufferOffset + offsetOffset) // offset value
    staticStorageValues.set([rand(), rand(), rand(), 1.0], staticStorageBufferOffset + colorOffset) // v1 color value
    staticStorageValues.set([rand(), rand(), rand(), 1.0], staticStorageBufferOffset + colorOffset + colorOffset) // v1 color value
    staticStorageValues.set([rand(), rand(), rand(), 1.0], staticStorageBufferOffset + colorOffset + colorOffset + colorOffset) // v1 color value
    objectInfos.push({
      scale: rand(0.05, 0.1)
    })
  }
  device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues.buffer)

  const dynamicStorageBufferValues = new Float32Array(dynamicStorageBuffer.size / byteSizes.f32)

  // setup a storage buffer with vertex data
  const { vertexData, numVertices } = createCircleVertices({ radius: 0.1, innerRadius: 0, numSubdivisions: 12 })
  const vertexStorageBuffer = device.createBuffer({
    label: 'storage buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData)

  const storageBuffersBindGroup = device.createBindGroup({
    label: 'Storage buffer bind group for objects',
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: staticStorageBuffer } },
      { binding: 1, resource: { buffer: dynamicStorageBuffer } },
      { binding: 2, resource: { buffer: vertexStorageBuffer } }

    ]
  })

  // Create a renderpass descriptor
  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: 'canvas renderpass',
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.1, g: 0.2, b: 0.3, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  }

  // Render the triangle
  const render = (): void => {
    renderPassDescriptor.colorAttachments[Symbol.iterator]().next().value.view = context.getCurrentTexture().createView() // For Canvas resize
    const aspect = Math.abs(canvas.width / canvas.height)
    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(renderPipeline)
    objectInfos.forEach((objectInfo, i) => {
      const offset = (dynamicUnitSizeInBytes / byteSizes.f32) * i
      const { scale } = objectInfo
      dynamicStorageBufferValues.set([scale / aspect, scale], offset) // scale value
    })
    // Update the dynamic storage buffer once
    device.queue.writeBuffer(dynamicStorageBuffer, 0, dynamicStorageBufferValues.buffer)
    passEncoder.setBindGroup(0, storageBuffersBindGroup)
    passEncoder.draw(numVertices, numObjects, 0, 0) // 3 vertices, numObjects instances
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement
      const width = entry.contentBoxSize[0].inlineSize
      const height = entry.contentBoxSize[0].blockSize
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D))
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D))
      render()
    }
  })

  resizeObserver.observe(canvas)

  // Load and compile the compute shader code into a shader module
  const computeCode = await loadFile('../src/fundamentals/compute.wgsl')
  const computeModule = device.createShaderModule({
    label: 'compute.wgsl',
    code: computeCode
  })

  // Create a compute pipeline
  const computePipeline = device.createComputePipeline({
    label: 'compute pipeline',
    layout: 'auto',
    compute: { module: computeModule, entryPoint: 'computeSomething' }
  })

  // Some data for compute input
  const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8])

  // Create a buffer to store the input data
  const computeBuffer = device.createBuffer({
    label: 'compute buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  })
  // Copy our input data to that buffer
  device.queue.writeBuffer(computeBuffer, 0, input)

  // Create a buffer to store the output data
  const outputBuffer = device.createBuffer({
    label: 'output buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  })

  // Create compute bind group
  const computeBindGroup = device.createBindGroup({
    label: 'compute bind group',
    layout: computePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: computeBuffer } }]
  })

  // Create compute encoder and pass
  const computeEncoder = device.createCommandEncoder({ label: 'compute encoder' })
  const computePass = computeEncoder.beginComputePass({
    label: 'compute pass'
  })
  computePass.setPipeline(computePipeline)
  computePass.setBindGroup(0, computeBindGroup)
  computePass.dispatchWorkgroups(input.length)
  computePass.end()

  computeEncoder.copyBufferToBuffer(computeBuffer, 0, outputBuffer, 0, outputBuffer.size)
  const commandBuffer = computeEncoder.finish()
  device.queue.submit([commandBuffer])

  // Read the output data
  await outputBuffer.mapAsync(GPUMapMode.READ)
  const output = new Float32Array(outputBuffer.getMappedRange())

  console.log('Input', input)
  console.log('Output', output)

  // Cleanup
  outputBuffer.unmap()
}

void main()
