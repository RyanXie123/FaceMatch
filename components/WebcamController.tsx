import React, { useRef, useEffect, useState } from 'react';
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

interface WebcamControllerProps {
  onFacesDetected: (count: number) => void;
  onCaptureFrame: (base64: string) => void;
  isActive: boolean;
}

const WebcamController: React.FC<WebcamControllerProps> = ({ onFacesDetected, onCaptureFrame, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for model to avoid re-initialization
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>();
  
  // Logic for capturing
  const lastCaptureTime = useRef<number>(0);
  const stableFrameCount = useRef<number>(0);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 2,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        setModelLoaded(true);
        console.log("Face Landmarker loaded");
      } catch (err) {
        console.error("Failed to load face landmarker:", err);
        setError("Failed to load AI model. Please reload.");
      }
    };

    initModel();

    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  // Camera Setup
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setPermissionGranted(true);
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera access denied. Please enable camera permissions.");
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isActive]);

  // Detection Loop
  useEffect(() => {
    const detect = async () => {
      if (!isActive || !permissionGranted || !modelLoaded || !videoRef.current || !canvasRef.current || !faceLandmarkerRef.current) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState !== 4 || !ctx) {
         requestRef.current = requestAnimationFrame(detect);
         return;
      }

      // Set canvas dimensions to match video
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      // Detect faces
      const startTimeMs = performance.now();
      const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Notify parent about face count
      const faceCount = results.faceLandmarks ? results.faceLandmarks.length : 0;
      onFacesDetected(faceCount);

      // Logic to auto-trigger capture
      if (faceCount === 2) {
          stableFrameCount.current++;
          // If we have had 2 faces for ~30 frames (0.5s) and haven't captured recently
          if (stableFrameCount.current > 30 && Date.now() - lastCaptureTime.current > 5000) {
              // Capture frame
              // Draw the current video frame to a temp canvas to get cleaner image without overlay
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = video.videoWidth;
              tempCanvas.height = video.videoHeight;
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                  // Flip horizontally for consistency
                  tempCtx.scale(-1, 1);
                  tempCtx.translate(-tempCanvas.width, 0);
                  tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                  const base64 = tempCanvas.toDataURL('image/png');
                  onCaptureFrame(base64);
                  lastCaptureTime.current = Date.now();
                  stableFrameCount.current = 0; // Reset to prevent double triggers
              }
          }
      } else {
          stableFrameCount.current = 0;
      }

      // Draw Face Mesh
      if (results.faceLandmarks) {
        for (const landmarks of results.faceLandmarks) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; // Cyan dots
            
            for (let i = 0; i < landmarks.length; i++) {
                // Draw only a subset of points for performance and aesthetics (e.g. every 5th point)
                if (i % 3 !== 0) continue; 
                
                const x = landmarks[i].x * canvas.width;
                const y = landmarks[i].y * canvas.height;
                
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // Draw bounding box corners
            let minX = 1, minY = 1, maxX = 0, maxY = 0;
            for(const lm of landmarks) {
                if(lm.x < minX) minX = lm.x;
                if(lm.x > maxX) maxX = lm.x;
                if(lm.y < minY) minY = lm.y;
                if(lm.y > maxY) maxY = lm.y;
            }
            
            const pad = 20;
            const bx = minX * canvas.width - pad;
            const by = minY * canvas.height - pad;
            const bw = (maxX - minX) * canvas.width + pad*2;
            const bh = (maxY - minY) * canvas.height + pad*2;

            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);
        }
      }

      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, permissionGranted, modelLoaded, onFacesDetected, onCaptureFrame]);

  if (error) {
    return <div className="text-red-500 text-xl fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black p-4 z-50">{error}</div>;
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-black shadow-2xl shadow-cyan-500/20 border border-cyan-900/50">
      {/* Video - Flipped */}
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover transform scale-x-[-1]" 
        playsInline 
        muted 
      />
      {/* Canvas Overlay - Flipped */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]" 
      />
      
      {/* Loading Status */}
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
        {!modelLoaded && !error && (
             <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-cyan-500 font-tech">INITIALIZING AI VISION...</span>
             </div>
        )}
      </div>
    </div>
  );
};

export default WebcamController;