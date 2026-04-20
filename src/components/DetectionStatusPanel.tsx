'use client'
import { DetectionStatus } from './ProctorCanvas'
import {
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface StatusItemProps {
  label: string;
  value: boolean;
}

const StatusItem = ({ label, value }: StatusItemProps) => {
  return (
    <div className={`flex items-center justify-between p-2 rounded-sm bg-white/5 border transition-all duration-300 ${value ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 hover:bg-white/10'}`}>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold tracking-tight ${value ? 'text-white' : 'text-white/50'}`}>{label}</span>
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase transition-all duration-300 ${value
        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
        : 'bg-white/5 text-white/20'
        }`}>
        {value ? <><CheckCircle2 className="w-2.5 h-2.5" /> YES</> : <><XCircle className="w-2.5 h-2.5" /> NO</>}
      </div>
    </div>
  );
}

export default function DetectionStatusPanel({ status }: { status: DetectionStatus }) {
  const items = [
    { label: 'Face Detected', value: status.faceDetected },
    { label: 'Multiple Faces', value: status.multipleFaces },
    { label: 'Smartphone', value: status.phoneDetected },
    { label: 'Library/Book', value: status.bookDetected },
    { label: 'Laptop Unit', value: status.laptopDetected },
    { label: 'Tablet Unit', value: status.tabletDetected },
  ]

  return (
    <div className="w-full bg-white/2 border border-white/5 rounded-xl p-3 mt-8 shadow-inner animate-fade-in relative overflow-hidden group">
      <div className="flex items-center justify-center mb-4 gap-2 relative z-10">
        <div className="w-1.5 h-1.5 bg-[#44A194] rounded-full animate-ping" />
        <h3 className="text-sm font-bold tracking-[0.15em] text-white capitalize flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#44A194]" />
          Sensory Intelligence
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-1 relative z-10">
        {items.map((item, idx) => (
          <StatusItem key={idx} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  )
}
