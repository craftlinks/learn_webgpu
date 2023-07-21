import { loadFile } from '../utils.js'

async function main(): Promise<void> {
  // Initialize WebGPU
  const adapter = await navigator.gpu?.requestAdapter()
  const device = await adapter?.requestDevice()
  if (adapter == null || device == null) {
    throw new Error('WebGPU is not supported')
  }

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
  const shaderCode = await loadFile('../src/fundamentals/shader.wgsl')
  const shaderModule = device.createShaderModule({
    label: 'shader.wgsl',
    code: shaderCode
  })

  // Create a render pipeline
  const pipeline = device.createRenderPipeline({
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
    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipeline)
    passEncoder.draw(3, 1, 0, 0)
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  render()

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
