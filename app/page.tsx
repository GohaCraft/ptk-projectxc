"use client";

import dynamic from 'next/dynamic'

const BuildingModelViewer = dynamic(() => import('./components/ui/BuildingModelViewer'), { 
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#0d0f14] text-[#EFEFED]">
      <div className="w-12 h-12 border-2 border-[#005C9E] border-t-transparent rounded-full animate-spin mb-4" />
      <span className="font-mono text-xs text-slate-400">LOADING DIGITAL TWIN...</span>
    </div>
  )
})

export default function Home() {
  return (
    <main className="fixed inset-0 w-full h-full overflow-hidden bg-[#0d0f14]">
      <BuildingModelViewer />
    </main>
  )
}
