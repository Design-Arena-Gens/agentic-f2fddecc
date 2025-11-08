'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Generator = dynamic(() => import('../components/Generator'), { ssr: false })

export default function Page() {
  const defaultPrompt = useMemo(() => (
    [
      'Photorealistic, cinematic 8K render, early morning rural Rajasthani village courtyard.',
      'Small mud hut with dusty courtyard, hanging clotheslines, clay pots scattered.',
      'Soft golden sunlight with subtle god rays, HDR tones, warm color grading.',
      'A humanoid monkey with realistic skin and fur textures lies asleep on a traditional khat (cot).',
      'A beautiful Rajasthani village girl in traditional attire enters carrying a heavy gas cylinder.',
      'She mischievously drops the cylinder onto the monkey\'s chest to wake him.',
      'The monkey wakes up, shocked expression; the girl smirks.',
      'Include a cow peacefully grazing in the background near the hut.',
      'Dialogue on-screen (stylish caption): ??? ?? ????? ???? ?? ??? ?? ???? ??? ??? ?? ???? ?? ???',
      'Monkey replies (stylish caption): ???? ????????, ???? ?????',
      'Ultra-detailed textures, realistic skin and fur, volumetric light shafts, cinematic depth of field, film grain.',
      'High dynamic range lighting, sharp focus on characters, warm and humorous mood.'
    ].join(' ')
  ), [])

  const [prompt, setPrompt] = useState<string>(defaultPrompt)

  return (
    <main style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Rajasthani Village ? Cinematic 8K Render</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Client-side generation using Stable Diffusion Turbo (WebGPU/CPU fallback), HDR-style tonemapping, and 8K upscale.
      </p>

      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Prompt</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 16 }}
      />

      <Generator prompt={prompt} />
    </main>
  )
}
