import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

// Huom: Dynaaminen import varmistaa, ettei build kaadu palvelinpuolella (SSR)
const tf = typeof window !== 'undefined' ? require('@tensorflow/tfjs') : null;
const speechCommands = typeof window !== 'undefined' ? require('@tensorflow-models/speech-commands') : null;

export default function PurePopAI() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState('RADIO');
  const [aiConfidence, setAiConfidence] = useState(0);
  const [status, setStatus] = useState('Alustetaan...');

  const radioRef = useRef(null);
  const localMusicRef = useRef(null);
  const recognizerRef = useRef(null);
  const fadeInterval = useRef(null);

  const RADIO_URL = "https://stream.popfm.fi/popfm.mp3";
  const MY_SONG_URL = "/music/PurePop%20AI%20Radio%20%E2%80%93%20Mainoskatko.mp3";

  useEffect(() => {
    if (typeof window !== 'undefined') {
      initAI();
    }
    return () => {
      if (recognizerRef.current) {
        try { recognizerRef.current.stopListening(); } catch (e) {}
      }
    };
  }, []);

  async function initAI() {
    try {
      if (!speechCommands) return;
      await tf.ready();
      const recognizer = speechCommands.create("BROWSER_FFT");
      await recognizer.ensureModelLoaded();
      recognizerRef.current = recognizer;
      setStatus('AI Valmiina.');
    } catch (e) {
      setStatus('AI Virhe: ' + e.message);
    }
  }

  const lerpVolume = (audioEl, targetVol) => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    if (!audioEl) return;
    fadeInterval.current = setInterval(() => {
      const step = 0.05;
      if (audioEl.volume < targetVol - step) audioEl.volume += step;
      else if (audioEl.volume > targetVol + step) audioEl.volume -= step;
      else {
        audioEl.volume = targetVol;
        clearInterval(fadeInterval.current);
      }
    }, 50);
  };

  const toggleEngine = async () => {
    if (!isPlaying) {
      try {
        await radioRef.current.play();
        setIsPlaying(true);
        setStatus('Valvotaan...');
        
        if (recognizerRef.current) {
          recognizerRef.current.listen(result => {
            const speechProb = result.scores[1];
            setAiConfidence(Math.round(speechProb * 100));
            if (speechProb > 0.85) {
              if (mode === 'RADIO') {
                setMode('OMA_MUSIIKKI');
                radioRef.current.muted = true;
                localMusicRef.current.src = MY_SONG_URL;
                localMusicRef.current.play().catch(() => {});
                lerpVolume(localMusicRef.current, 1);
              }
            } else if (speechProb < 0.20) {
              if (mode === 'OMA_MUSIIKKI') {
                setMode('RADIO');
                lerpVolume(localMusicRef.current, 0);
                setTimeout(() => {
                  localMusicRef.current.pause();
                  radioRef.current.muted = false;
                }, 1000);
              }
            }
          }, { probabilityThreshold: 0.75, overlapFactor: 0.5 });
        }
      } catch (err) {
        setStatus('Salli audio.');
      }
    } else {
      stopEngine();
    }
  };

  const stopEngine = () => {
    radioRef.current.pause();
    localMusicRef.current.pause();
    if (recognizerRef.current) recognizerRef.current.stopListening();
    setIsPlaying(false);
    setMode('RADIO');
    setStatus('Pysäytetty.');
  };

  return (
    <div className="main-wrap">
      <Head><title>PurePOP AI</title></Head>
      <div className="box">
        <div className="badge">AI SYSTEM ACTIVE</div>
        <h1>Pure<span>POP</span> AI</h1>
        <div className={`screen ${mode !== 'RADIO' ? 'alert' : ''}`}>
          <div className="status-text">{mode === 'RADIO' ? 'LIVE RADIO' : 'OMA BIISI'}</div>
          <div className="small">{status}</div>
        </div>
        <div className="ai-bar-wrap">
          <div className="ai-bar-fill" style={{ width: aiConfidence + '%', background: aiConfidence > 80 ? '#ff0000' : '#00ff00' }}></div>
        </div>
        <button onClick={toggleEngine} className="btn">
          {isPlaying ? 'STOP' : 'START AI RADIO'}
        </button>
      </div>
      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />
      <style jsx>{`
        .main-wrap { min-height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-family: sans-serif; }
        .box { background: #111; padding: 40px; border-radius: 30px; width: 300px; text-align: center; border: 1px solid #222; }
        h1 span { color: #00ff00; }
        .badge { font-size: 10px; color: #00ff00; margin-bottom: 10px; font-weight: bold; }
        .screen { background: #1a1a1a; padding: 20px; border-radius: 20px; margin: 20px 0; border: 1px solid #333; }
        .alert { border-color: #ff0000; color: #ff0000; }
        .status-text { font-weight: bold; }
        .small { font-size: 12px; color: #666; margin-top: 5px; }
        .ai-bar-wrap { height: 4px; background: #222; margin-bottom: 20px; border-radius: 2px; overflow: hidden; }
        .ai-bar-fill { height: 100%; transition: 0.3s; }
        .btn { width: 100%; padding: 15px; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; background: #fff; }
      `}</style>
    </div>
  );
}
