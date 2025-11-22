import React, { useState, useCallback } from 'react';
import WebcamController from './components/WebcamController';
import { compareFaces } from './services/geminiService';
import { SimilarityResult } from './types';

const App: React.FC = () => {
  const [faceCount, setFaceCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SimilarityResult | null>(null);

  const handleFacesDetected = useCallback((count: number) => {
    setFaceCount(count);
  }, []);

  const handleCapture = useCallback(async (base64: string) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setResult(null); // Clear previous
    
    try {
        const data = await compareFaces(base64);
        setResult(data);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white relative overflow-hidden font-sans">
      {/* Background Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,30,40,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(0,30,40,0.9)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      
      <header className="z-10 mb-6 text-center">
        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] font-tech">
          GEMINI FACE MATCH
        </h1>
        <p className="text-cyan-200/70 mt-2 font-mono text-sm">
          REAL-TIME BIOMETRIC SIMILARITY ANALYSIS
        </p>
      </header>

      <main className="z-10 w-full max-w-6xl flex flex-col lg:flex-row gap-8 p-4 items-stretch h-[70vh]">
        
        {/* Left Panel: Webcam Feed */}
        <div className="flex-1 relative flex flex-col">
            <div className="flex-grow relative rounded-2xl overflow-hidden ring-2 ring-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                <WebcamController 
                    isActive={true}
                    onFacesDetected={handleFacesDetected}
                    onCaptureFrame={handleCapture}
                />
                
                {/* Status Overlay */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <div className={`px-4 py-2 rounded-full border backdrop-blur-md font-bold font-mono text-sm transition-colors duration-300 ${
                        faceCount === 2 
                        ? 'bg-green-500/20 border-green-400 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)]' 
                        : 'bg-red-500/20 border-red-400 text-red-400'
                    }`}>
                        {faceCount === 0 && "NO SUBJECTS DETECTED"}
                        {faceCount === 1 && "WAITING FOR SECOND SUBJECT..."}
                        {faceCount === 2 && "READY FOR ANALYSIS"}
                        {faceCount > 2 && "TOO MANY SUBJECTS"}
                    </div>

                    {isAnalyzing && (
                        <div className="px-4 py-2 rounded-full bg-cyan-600/80 border border-cyan-300 text-white animate-pulse font-bold shadow-lg">
                            ANALYZING WITH GEMINI...
                        </div>
                    )}
                </div>
            </div>
            
            <div className="mt-4 text-center text-gray-400 text-sm font-mono">
                Bring two faces into the frame. Hold still for automatic analysis.
            </div>
        </div>

        {/* Right Panel: Results */}
        <div className="w-full lg:w-1/3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-500/10 blur-3xl"></div>

            <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2 font-tech">
                <span className="text-cyan-400">///</span> ANALYSIS REPORT
            </h2>

            {!result && !isAnalyzing && (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-500 opacity-50">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    <p className="font-mono">WAITING FOR DATA STREAM...</p>
                </div>
            )}
            
            {isAnalyzing && (
                <div className="flex-grow flex flex-col items-center justify-center">
                     <div className="relative w-32 h-32 mb-8">
                         <div className="absolute inset-0 border-4 border-cyan-900 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-t-cyan-400 rounded-full animate-spin"></div>
                         <div className="absolute inset-4 border-4 border-blue-900 rounded-full"></div>
                         <div className="absolute inset-4 border-4 border-l-blue-400 rounded-full animate-spin reverse"></div>
                     </div>
                     <div className="space-y-2 font-mono text-xs text-cyan-300">
                         <p className="animate-pulse">> UPLOADING FRAME...</p>
                         <p className="animate-pulse delay-75">> EXTRACTING EMBEDDINGS...</p>
                         <p className="animate-pulse delay-150">> QUERYING GEMINI MODEL...</p>
                     </div>
                </div>
            )}

            {result && !isAnalyzing && (
                <div className="animate-fadeIn flex flex-col h-full">
                    {/* Score Circle */}
                    <div className="flex justify-center mb-8">
                        <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="#1e293b" strokeWidth="10" fill="none" />
                                <circle 
                                    cx="80" cy="80" r="70" 
                                    stroke={result.score > 70 ? "#4ade80" : result.score > 40 ? "#fbbf24" : "#f87171"} 
                                    strokeWidth="10" 
                                    fill="none" 
                                    strokeDasharray="440"
                                    strokeDashoffset={440 - (440 * result.score) / 100}
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="flex flex-col items-center">
                                <span className="text-5xl font-black font-tech text-white">{result.score}%</span>
                                <span className="text-xs text-gray-400 font-mono">MATCH</span>
                            </div>
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6">
                        <p className="text-lg text-cyan-100 italic">"{result.comment}"</p>
                    </div>

                    {/* Features List */}
                    <div className="flex-grow">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 tracking-wider">Key Observations</h3>
                        <ul className="space-y-2">
                            {result.features.map((feat, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-gray-300 font-mono">
                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                                    {feat}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;