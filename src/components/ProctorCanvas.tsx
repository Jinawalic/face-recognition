'use client'
import * as faceapi from 'face-api.js'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'
import { useEffect, useMemo, useRef, useState } from 'react'

const PROHIBITED_OBJECTS = new Set(['cell phone', 'laptop', 'book'])

export interface DetectionStatus {
  faceDetected: boolean;
  multipleFaces: boolean;
  phoneDetected: boolean;
  bookDetected: boolean;
  laptopDetected: boolean;
  tabletDetected: boolean;
}

interface ProctorCanvasProps {
  enabled: boolean;
  apiBaseUrl?: string;
  matricNumber?: string;
  authToken?: string;
  violationCount: number;
  onStrike?: (payload: any) => Promise<void>;
  onWarning?: (message: string) => void;
  onStatusUpdate?: (status: DetectionStatus) => void;
}

function now() {
  return Date.now()
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function computeLookingAway(landmarks: faceapi.FaceLandmarks68) {
  try {
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    const nose = landmarks.getNose()
    if (!leftEye?.length || !rightEye?.length || !nose?.length) return false

    const avg = (pts: faceapi.Point[]) => {
      const s = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
      return { x: s.x / pts.length, y: s.y / pts.length }
    }

    const le = avg(leftEye)
    const re = avg(rightEye)
    const ne = avg(nose)
    const eyeCenterX = (le.x + re.x) / 2
    const eyeDist = Math.abs(re.x - le.x) || 1

    const noseOffset = (ne.x - eyeCenterX) / eyeDist
    return Math.abs(noseOffset) > 0.22
  } catch {
    return false
  }
}

export default function ProctorCanvas({
  enabled,
  apiBaseUrl,
  matricNumber,
  authToken,
  violationCount,
  onStrike,
  onWarning,
  onStatusUpdate
}: ProctorCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const faceModelLoadedRef = useRef(false)
  const objectModelRef = useRef<cocoSsd.ObjectDetection | null>(null)

  const lastStrikeAtRef = useRef(0)
  const visualViolationSinceRef = useRef<number | null>(null)
  const multiFaceSinceRef = useRef<number | null>(null)
  const prohibitedSinceRef = useRef<number | null>(null)
  const currentObjectsRef = useRef({
    phone: false,
    laptop: false,
    book: false,
    tablet: false
  })

  const [status, setStatus] = useState('Idle')
  const [modelsReady, setModelsReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)

  const strikeLimitReached = useMemo(() => violationCount >= 10, [violationCount])

  const strikeCooldownMs = 2500
  const lookingAwayMs = 7000
  const multiFaceMs = 1000
  const prohibitedMs = 900

  const issueStrike = async (payload: any) => {
    const t = now()
    if (t - lastStrikeAtRef.current < strikeCooldownMs) return
    lastStrikeAtRef.current = t
    onWarning?.(payload?.message || 'Warning: Irregularity Detected!')
    await onStrike?.(payload)
  }

  useEffect(() => {
    let cancelled = false

    async function loadModels() {
      try {
        console.log("Loading face detector...");
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
        faceModelLoadedRef.current = true;
        console.log("Face detector loaded.");
        
        // Face models are critical, so we set ready here
        if (!cancelled) setModelsReady(true);

        // Try load COCO-SSD in background
        try {
          console.log("Loading COCO-SSD (mobilenet_v2)...");
          const cocoPromise = cocoSsd.load({ base: 'mobilenet_v2' });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("COCO-SSD timeout")), 20000)
          );
          const coco = await Promise.race([cocoPromise, timeoutPromise]) as cocoSsd.ObjectDetection;
          objectModelRef.current = coco;
          console.log("COCO-SSD loaded.");
        } catch (objErr) {
          console.warn("COCO-SSD failed, using face detection only", objErr);
        }
      } catch (e) {
        console.error("Critical: Face models failed to load", e);
        faceModelLoadedRef.current = false;
        if (!cancelled) setStatus("Load Error: Face Models Missing");
      }
    }

    loadModels()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      setCameraReady(false)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }
        setCameraReady(true)
      } catch {
        setCameraReady(false)
      }
    }

    async function stopCamera() {
      const stream = streamRef.current
      streamRef.current = null
      if (stream) stream.getTracks().forEach((t) => t.stop())
      const video = videoRef.current
      if (video) video.srcObject = null
      setCameraReady(false)
    }

    if (enabled && !strikeLimitReached) startCamera()
    else stopCamera()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [enabled, strikeLimitReached])

  useEffect(() => {
    if (!enabled || !cameraReady || !modelsReady || strikeLimitReached) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setStatus(enabled && cameraReady ? 'Models not loaded' : 'Idle')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let lastObjectDetectAt = 0

    const faceOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.5,
    })

    const loop = async () => {
      const w = video.videoWidth || 0
      const h = video.videoHeight || 0
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h

      ctx.clearRect(0, 0, w, h)

      let faceResults: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>[] = []
      try {
        faceResults = await faceapi
          .detectAllFaces(video, faceOptions)
          .withFaceLandmarks(true)
      } catch {
        // ignore
      }

      const t = now()

      let lookingAway = false
      if (faceResults?.length === 1) {
        lookingAway = computeLookingAway(faceResults[0].landmarks)
      }

      if (lookingAway) {
        // removed
      }

      const isVisualViolating = (faceResults?.length || 0) === 0 || lookingAway
      if (isVisualViolating) {
        if (visualViolationSinceRef.current == null) visualViolationSinceRef.current = t
      } else {
        visualViolationSinceRef.current = null
      }

      if ((faceResults?.length || 0) > 1) {
        if (multiFaceSinceRef.current == null) multiFaceSinceRef.current = t
      } else {
        multiFaceSinceRef.current = null
      }

      let prohibited: cocoSsd.DetectedObject | null = null

      if (t - lastObjectDetectAt > 550) {
        lastObjectDetectAt = t
        const model = objectModelRef.current
        if (model) {
          try {
            const preds = await model.detect(video)
            // console.log('Proctor: detected objects', preds)
            
            // Reset for this check
            const newObjects = { phone: false, laptop: false, book: false, tablet: false }
            preds.forEach(p => {
              if (p.class === 'cell phone' && p.score >= 0.3) newObjects.phone = true
              if (p.class === 'laptop' && p.score >= 0.3) newObjects.laptop = true
              if (p.class === 'book' && p.score >= 0.3) newObjects.book = true
            })
            currentObjectsRef.current = newObjects
            
            prohibited = preds.find((p) => PROHIBITED_OBJECTS.has(p.class) && p.score >= 0.3) || null
          } catch {
            prohibited = null
          }
        }
      }

      if (prohibited) {
        if (prohibitedSinceRef.current == null) prohibitedSinceRef.current = t
      } else {
        prohibitedSinceRef.current = null
      }

      // Update status reporting
      onStatusUpdate?.({
        faceDetected: (faceResults?.length || 0) > 0,
        multipleFaces: (faceResults?.length || 0) > 1,
        phoneDetected: currentObjectsRef.current.phone,
        bookDetected: currentObjectsRef.current.book,
        laptopDetected: currentObjectsRef.current.laptop,
        tabletDetected: currentObjectsRef.current.tablet
      })

      let warning = ''
      let overlayAlpha = 0

      const multiFaceFor =
        multiFaceSinceRef.current != null ? t - multiFaceSinceRef.current : 0
      const prohibitedFor =
        prohibitedSinceRef.current != null ? t - prohibitedSinceRef.current : 0

      if (multiFaceSinceRef.current != null) {
        warning = 'Warning: Multiple Faces Detected!'
        overlayAlpha = 0.18
      } else if (prohibitedSinceRef.current != null) {
        warning = 'Warning: Prohibited Object Detected!'
        overlayAlpha = 0.18
      } else if (visualViolationSinceRef.current != null) {
        warning = 'Warning: No Face / Looking Away!'
        overlayAlpha = 0.12
      }

      if (warning) onWarning?.(warning)
      else onWarning?.('')

      if (overlayAlpha > 0) {
        ctx.fillStyle = `rgba(255,0,0,${clamp(overlayAlpha, 0, 0.28)})`
        ctx.fillRect(0, 0, w, h)
      }

      const visualViolationFor = visualViolationSinceRef.current != null ? t - visualViolationSinceRef.current : 0

      if (multiFaceFor >= multiFaceMs) {
        await issueStrike({ type: 'MULTIPLE_FACES', message: 'Warning: Multiple Faces Detected!' })
        multiFaceSinceRef.current = null
      } else if (prohibitedFor >= prohibitedMs) {
        await issueStrike({
          type: 'PROHIBITED_OBJECT',
          message: 'Warning: Prohibited Object Detected!',
          meta: { objects: Array.from(PROHIBITED_OBJECTS) },
        })
        prohibitedSinceRef.current = null
      } else if (visualViolationFor >= 7000) {
        await issueStrike({
          type: 'VISUAL_VIOLATION',
          message: 'Warning: No Face / Looking Away!',
        })
        visualViolationSinceRef.current = t // Reset to allow recurring strike every 7s
      }

      const faceState =
        (faceResults?.length || 0) === 0
          ? 'No face'
          : faceResults.length > 1
            ? 'Multiple faces'
            : lookingAway
              ? 'Looking away'
              : 'Face OK'

      setStatus(`Monitoring: ${faceState}`)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, cameraReady, modelsReady, strikeLimitReached, onStrike, onWarning, onStatusUpdate])

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/80">
        {status}
      </div>

      <video
        ref={videoRef}
        className="block w-full aspect-video bg-black"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {!enabled ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white/80">
          Monitoring paused
        </div>
      ) : null}

      {enabled && !cameraReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white/80">
          Waiting for camera permission...
        </div>
      ) : null}

      {enabled && cameraReady && !modelsReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white/80 p-6 text-center">
          {status.includes("Error") ? status : "Initializing detection models..."}
          {!status.includes("Error") && <div className="mt-2 text-[10px] text-white/40 block w-full">Please ensure public/models contains the required weights.</div>}
        </div>
      ) : null}
    </div>
  )
}
