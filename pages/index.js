import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

export default function PurePopAI() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState('RADIO');
  const [aiConfidence, setAiConfidence] = useState(0);
  const [status, setStatus] = useState('Valmis.');

  const radioRef = useRef(null);
  const localMusicRef = useRef(null);
  const recognizerRef = useRef(null);
  const fadeInterval = useRef(null);

  const RADIO_URL = "https://stream.popfm.fi/popfm.mp3";
  const MY_SONG_URL = "/music/PurePop%20AI%20Radio%20%E2%80%93%20Mainoskatko.mp3";

  useEffect(() => {
    async function init() {
      if (typeof window !== 'undefined') {
        try {
          const tf = await import('@tensorflow/tfjs');
          const speechCommands = await import('@tensorflow-models/speech-commands');
          await tf.ready();
          const model = speechCommands.create("BROWSER_FFT");
          await model.ensureModelLoaded();
          recognizerRef.current = model;
        } catch (err) {
          console.error("AI load error", err);
        }
      }
    }
    init();
  }, []);

  const changeVolume = (audio, target) => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    if (!audio) return;
    fadeInterval.current = setInterval(() => {
      const v = audio.volume;
      if (v < target - 0.05) audio.volume += 0.05;
      else if (v > target + 0.05) audio.volume -= 0.05;
      else {
        audio.volume = target;
        clearInterval(fadeInterval.current);
      }
    }, 50);
  };

  const onResult = (result) => {
    const score = result.scores[1];
    setAiConfidence(Math.round(score * 100));

    if (score > 0.88 && mode === 'RADIO') {
      setMode('OMA_MUSIIKKI');
      radioRef.current.muted = true;
      localMusicRef.current.src = MY_SONG_URL;
      localMusicRef.current.play().catch(() => {});
      changeVolume(localMusicRef.current, 1);
    } else if (score < 0.15 && mode === 'OMA_MUSIIKKI') {
      setMode('RADIO');
      changeVolume(localMusicRef.current, 0);
      setTimeout(() => {
        localMusicRef.current.pause();
        radioRef.current.muted = false;
      }, 1000);
    }
  };

  const toggle = async () => {
    if (isPlaying) {
      radioRef.current.pause();
      localMusicRef.current.pause();
      if (recognizerRef.current) {
        recognizerRef.current.stopListening();
      }
      setIsPlaying(false);
      setMode('RADIO');
    } else {
      try {
        await radioRef.current.play();
        setIsPlaying(true);
        if (recognizerRef.current) {
          recognizerRef.current.listen(onResult, {
            probabilityThreshold: 0.70,
            overlapFactor: 0.5
          });
        }
      } catch (e) {
        setStatus('Salli audio.');
      }
    }
  };

  return (
    <div className="container">
      <Head><title>PurePOP AI</title></Head>
      <div className="card">
        <h1>Pure<span>POP</span> AI</h1>
        <div className={`status-box ${mode !== 'RADIO' ? 'active' : ''}`}>
          <div className="mode-label">{mode === 'RADIO' ? 'RADIO' : 'MAINOSKATKO'}</div>
          <div className="status-sub">{isPlaying ? 'AI VALVOO' : 'VALMIS'}</div>
        </div>
        <div className="meter-container">
          <div className="meter-bar" style={{ width: aiConfidence + '%' }}></div>
        </div>
        <button onClick={toggle} className="main-btn">
          {isPlaying ? 'STOP' : 'START'}
        </button>
      </div>
      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />
      <style jsx>{`
        .container { min-height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-family: sans-serif; }
        .card { background: #111; padding: 3rem; border-radius: 2rem; width: 300px; text-align: center; border: 1px solid #222; }
        h1 span { color: #00ff00; }
        .status-box { background: #1a1a1a; padding: 1.5rem; border-radius: 1rem; margin: 2rem 0; border: 1px solid #333; }
        .active { border-color: #ff0000; color: #ff0000; }
        .mode-label { font-weight: bold; font-size: 1.2rem; }
        .status-sub { font-size: 0.8rem; color: #555; margin-top: 0.5rem; }
        .meter-container { height: 4px; background: #222; margin-bottom: 2rem; border-radius: 2px; overflow: hidden; }
        .meter-bar { height: 100%; background: #00ff00; transition: 0.3s; }
        .main-btn { width: 100%; padding: 1rem; border-radius: 1rem; border: none; font-weight: bold; cursor: pointer; background: #fff; }
      `}</style>
    </div>
  );
}
