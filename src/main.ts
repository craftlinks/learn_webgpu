const checkWebGPUSupport = navigator.gpu !== undefined
  ? 'Great, your current browser supports WebGPU!'
  : `Your current browser does not support WebGPU! Make sure you are on a system 
    with WebGPU enabled.`

const getGPUInfo = async (): Promise<void> => {
  const body = document.querySelector('body') as HTMLBodyElement

  try {
    if (navigator.gpu == null) {
      body.style.lineHeight = '150%'
      body.innerHTML = checkWebGPUSupport
      throw new Error(checkWebGPUSupport)
    }
    let ss = `<p>${checkWebGPUSupport}</p>`
    const adapter = await navigator.gpu.requestAdapter()
    if (adapter == null) {
      body.style.lineHeight = '150%'
      body.innerHTML += '<p>Failed to get GPU Adapter.</p>'
      throw new Error('Failed to get GPU Adapter.')
    }
    const info = await adapter.requestAdapterInfo()

    ss += `<br/><h3>Adapter Info:</h3>
               <p>Vendor: ${info.vendor}</p>
               <p>Architecture: ${info.architecture}</p>`

    ss += '<br/><h3>GPU Supported Limits:</h3>'
    let i: keyof GPUSupportedLimits
    for (i in adapter.limits) {
      ss += `<p>${i}: ${adapter.limits[i]}</p>`
    }

    ss += '<br/><h3>GPU Supported Features:</h3>'
    adapter.features.forEach((x) => {
      ss += `<p>${x}</p>`
    })

    body.innerHTML += ss
  } catch (error: any) {
    throw new Error(error)
  }
}
getGPUInfo().then(() => {}).catch((e) => { console.error(e) })
