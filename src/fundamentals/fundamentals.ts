import { loadFile } from '../utils.js'

async function main (): Promise<void> {
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
  const module = device.createShaderModule({
    label: 'shader.wgsl',
    code: shaderCode
  })

  // Create a render pipeline
  const pipeline = device.createRenderPipeline({
    label: 'render pipeline',
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs'
    },
    fragment: {
      module,
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
}

void main()
