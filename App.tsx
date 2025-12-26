
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameStatus, NoteData } from './types';
import { useMediaPipe } from './hooks/useMediaPipe';
import GameScene from './components/GameScene';
import WebcamPreview from './components/WebcamPreview';
import { Play, RefreshCw, Music, Pause, LogOut, Flame, Sparkles } from 'lucide-react';
import { generateDemoChart } from './constants';
import { GoogleGenAI } from "@google/genai";

const GAME_TIME_LIMIT = 90;

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LOADING);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(100);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_LIMIT);
  const [chart, setChart] = useState<NoteData[]>(generateDemoChart());

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { isCameraReady, handPositionsRef, lastResultsRef, error: mpError } = useMediaPipe(videoRef);

  const generateAIBackgroundWithRetry = async (fileName: string, retries = 2) => {
    setIsGeneratingBg(true);
    // Initialize GoogleGenAI right before making the API call as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A beautiful, cute, and minimalist traditional Chinese ink painting background for a music game. 
    Theme: "${fileName.replace(/\.[^/.]+$/, "")}". 
    Style: "Cute Diffuse" with soft gradients. Colors: Zhu Red, Stone Cyan, Ink. 
    High quality, artistic composition.`;

    for (let i = 0; i <= retries; i++) {
      try {
        // Call generateContent for text-to-image with gemini-2.5-flash-image.
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
        });

        // Iterate through all parts to extract the generated image.
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            setBackgroundUrl(imageUrl);
            setIsGeneratingBg(false);
            return;
          }
        }
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed for AI Background:`, error);
        if (i === retries) {
           console.error("Max retries reached for background generation.");
        } else {
           await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential delay
        }
      }
    }
    setIsGeneratingBg(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      audioRef.current.src = url;
      generateAIBackgroundWithRetry(file.name);
    }
  };

  const startGame = () => {
    if (!audioUrl || !isCameraReady) return;
    setScore(0);
    setCombo(0);
    setHealth(100);
    setTimeLeft(GAME_TIME_LIMIT);
    setChart(generateDemoChart());
    setGameStatus(GameStatus.PLAYING);
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(console.error);
  };

  const togglePause = () => {
    if (gameStatus === GameStatus.PLAYING) {
      setGameStatus(GameStatus.PAUSED);
      audioRef.current.pause();
    } else if (gameStatus === GameStatus.PAUSED) {
      setGameStatus(GameStatus.PLAYING);
      audioRef.current.play().catch(console.error);
    }
  };

  const resetGame = () => {
    setGameStatus(GameStatus.IDLE);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  const handleNoteHit = useCallback(() => {
    setScore(s => s + 100);
    setCombo(c => c + 1);
    setHealth(h => Math.min(100, h + 1.5));
  }, []);

  const handleNoteMiss = useCallback(() => {
    setCombo(0);
    setHealth(h => {
      const newHealth = h - 10;
      if (newHealth <= 0) {
        setGameStatus(GameStatus.GAME_OVER);
        audioRef.current.pause();
        return 0;
      }
      return newHealth;
    });
  }, []);

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameStatus(GameStatus.VICTORY);
            audioRef.current.pause();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameStatus]);

  useEffect(() => {
    if (isCameraReady && gameStatus === GameStatus.LOADING) setGameStatus(GameStatus.IDLE);
  }, [isCameraReady, gameStatus]);

  return (
    <div className="relative w-full h-full bg-[#f4f1e8] overflow-hidden font-serif">
      <video ref={videoRef} className="absolute opacity-0 pointer-events-none" playsInline muted autoPlay />
      
      <div className="absolute inset-0 z-0">
          <Canvas 
            shadows 
            dpr={[1, 2]}
            style={{ width: '100%', height: '100%' }}
            gl={{ alpha: false, antialias: true }}
          >
              <GameScene 
                gameStatus={gameStatus} 
                audioRef={audioRef} 
                handPositionsRef={handPositionsRef}
                chart={chart}
                backgroundUrl={backgroundUrl}
                onNoteHit={handleNoteHit}
                onNoteMiss={handleNoteMiss}
                onSongEnd={() => setGameStatus(GameStatus.VICTORY)}
              />
          </Canvas>
      </div>

      <WebcamPreview videoRef={videoRef} resultsRef={lastResultsRef} isCameraReady={isCameraReady} />

      {/* UI Overlay */}
      {(gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.PAUSED) && (
        <div className="absolute inset-0 pointer-events-none p-4 z-10 flex flex-col justify-between">
          <div className="flex justify-between items-start w-full">
            <div className="w-56 pointer-events-auto bg-white/70 backdrop-blur-xl p-3 rounded-2xl border-2 border-[#1a1a1a]/10 shadow-2xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Flame className={`w-5 h-5 ${health < 30 ? 'animate-pulse text-[#c02c38]' : 'text-[#2e5e6e]'}`} fill="currentColor" />
                  <span className="ink-text text-xl font-bold tracking-[0.1em] text-[#1a1a1a]">精气神</span>
                </div>
                <span className="font-bold text-xs text-[#1a1a1a]">{Math.ceil(health)}%</span>
              </div>
              <div className="h-3 bg-[#1a1a1a]/5 rounded-full border border-[#1a1a1a]/20 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${health > 60 ? 'bg-[#2e5e6e]' : health > 30 ? 'bg-orange-500' : 'bg-[#c02c38]'}`}
                  style={{ width: `${health}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between items-center text-xs font-bold">
                <span className="px-1.5 py-0.5 bg-[#1a1a1a] text-[#f4f1e8] rounded">倒计时</span>
                <span className="text-lg tracking-widest text-[#1a1a1a]">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>

            <div className="text-center drop-shadow-[0_2px_10px_rgba(255,255,255,0.9)]">
              <div className="text-5xl font-black ink-text text-[#1a1a1a]">{score.toLocaleString()}</div>
              <div className={`text-2xl font-bold ink-text transition-all duration-300 ${combo > 0 ? 'scale-110 text-[#c02c38]' : 'opacity-0'}`}>
                {combo}连击
              </div>
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <button onClick={togglePause} className="p-3 bg-white border-2 border-[#1a1a1a] rounded-full hover:bg-gray-100 shadow-xl transition-all active:scale-90">
                {gameStatus === GameStatus.PAUSED ? <Play size={24} color="#1a1a1a" /> : <Pause size={24} color="#1a1a1a" />}
              </button>
              <button onClick={resetGame} className="p-3 bg-[#c02c38] text-white border-2 border-[#1a1a1a] rounded-full hover:brightness-110 shadow-xl transition-all active:scale-90">
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Landing Screen */}
      {(gameStatus === GameStatus.IDLE || gameStatus === GameStatus.LOADING) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f4f1e8]/98 z-20">
          <div className="bg-white p-8 md:p-10 border-4 border-[#1a1a1a] text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-lg w-full rounded-[2.5rem] transform scale-[0.85] transition-transform flex flex-col items-center">
            <h1 className="text-[6rem] leading-none ink-text mb-4 text-[#1a1a1a]">京韵<span className="text-[#c02c38]">鼓神</span></h1>
            
            {mpError ? (
               <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl mb-6">
                  <p className="font-bold">加载失败：</p>
                  <p className="text-sm">{mpError}</p>
                  <button onClick={() => window.location.reload()} className="mt-2 text-xs underline">点此重试刷新</button>
               </div>
            ) : gameStatus === GameStatus.LOADING ? (
               <div className="flex flex-col items-center mb-6">
                  <RefreshCw className="w-12 h-12 text-[#2e5e6e] animate-spin mb-4" />
                  <p className="ink-text text-lg">梨园班子正在入场...</p>
               </div>
            ) : (
              <div className="w-full mb-6 p-6 border-4 border-dashed border-[#2e5e6e]/20 rounded-[1.5rem] bg-[#2e5e6e]/5 flex flex-col items-center">
                <label className="flex flex-col items-center cursor-pointer group">
                  {isGeneratingBg ? (
                     <Sparkles className="mb-3 text-[#c02c38] animate-spin" size={48} />
                  ) : (
                     <Music className="mb-3 text-[#2e5e6e] group-hover:scale-110 transition-transform duration-300" size={48} />
                  )}
                  <span className="ink-text text-xl mb-3 font-bold text-[#1a1a1a]">
                    {isGeneratingBg ? "AI 画师正在作画..." : audioUrl ? "曲谱与景致已备齐" : "请上传背景音律"}
                  </span>
                  <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  <div className="bg-[#1a1a1a] text-[#f4f1e8] px-6 py-2 rounded-full ink-text text-lg hover:bg-[#333] transition-colors shadow-lg">选择曲目 (MP3)</div>
                </label>
              </div>
            )}

            <button 
              disabled={!audioUrl || isGeneratingBg || !isCameraReady}
              onClick={startGame}
              className={`w-full py-4 text-3xl font-bold border-4 border-[#1a1a1a] transition-all ink-text flex items-center justify-center gap-4 rounded-[1.2rem]
                ${(!audioUrl || isGeneratingBg || !isCameraReady) ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300' : 'bg-[#c02c38] text-white hover:shadow-[0_10px_30px_rgba(192,44,56,0.3)] active:scale-95'}`}
            >
              <Play fill="white" size={32} /> 开 场
            </button>
          </div>
        </div>
      )}

      {/* Result Screens */}
      {(gameStatus === GameStatus.GAME_OVER || gameStatus === GameStatus.VICTORY) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-md z-30 p-4">
          <div className="bg-[#f4f1e8] p-10 border-4 border-[#1a1a1a] text-center shadow-2xl max-w-sm rounded-[2rem] transform scale-[0.9]">
            <h2 className={`text-[5rem] leading-none ink-text mb-6 ${gameStatus === GameStatus.VICTORY ? 'text-[#2e5e6e]' : 'text-[#c02c38]'}`}>
              {gameStatus === GameStatus.VICTORY ? "曲终奏雅" : "气数已尽"}
            </h2>
            <div className="space-y-2 mb-8">
                <p className="text-xl font-serif font-black text-[#1a1a1a] opacity-60">得分</p>
                <p className="text-6xl font-black ink-text text-[#1a1a1a]">{score.toLocaleString()}</p>
            </div>
            <button onClick={resetGame} className="bg-[#1a1a1a] text-[#f4f1e8] px-8 py-3 text-2xl ink-text flex items-center gap-3 mx-auto rounded-full hover:brightness-125 transition-all shadow-xl active:scale-95">
              <RefreshCw size={24} /> 重返梨园
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
