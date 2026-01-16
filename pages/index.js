import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

export default function PurePopAI() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState('RADIO');
  const [aiConfidence, setAiConfidence] = useState(0);
  const [status, setStatus] = useState('Alustetaan AI-moottoria...');

  const radioRef = useRef(null);
  const localMusicRef = useRef(null);
  const recognizerRef = useRef(null);
  const fadeInterval = useRef(null);

  const RADIO_URL = "https://stream.popfm.fi/popfm.mp3";
  const MY_SONG_URL = "/music/PurePop%20AI%20Radio%20%E2%80%93%20Mainoskatko.mp3";

  useEffect(() => {
    async function loadAI() {
      try {
        const tf = await import('@tensorflow/tfjs');
        const speechCommands = await import('@tensorflow-models/speech-commands');
        await tf.ready();
        const recognizer = speechCommands.create("BROWSER_FFT");
        await recognizer.ensureModelLoaded();
        recognizerRef.current = recognizer;
        setStatus('AI Valmiina.');
      } catch (e) {
        setStatus('AI Virhe: Lataa sivu uudelleen.');
      }
    }
    loadAI();
  }, []);

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
        setStatus('AI Valvoo...');
        
        if (recognizerRef.current) {
          recognizerRef.current.listen(result => {
            const speechProb = result.scores[1];
            setAiConfidence(Math.round(speechProb * 100));
            
            if (speechProb > 0.88) {
              if (mode === 'RADIO') {
                setMode('OMA_MUSIIKKI');
                radioRef.current.muted = true;
                localMusicRef.current.src = MY_SONG_URL;
                localMusicRef.current.play().catch(() => {});
                lerpVolume(localMusicRef.current, 1);
              }
            } else if (speechProb < 0.15) {
              if (mode === 'OMA_MUSIIKKI') {
                setMode('RADIO');
                lerpVolume(localMusicRef.current, 0);
                setTimeout(() => {
                  localMusicRef.current.pause();
                  radioRef.current.muted = false;
                }, 1000);
              }
            }
          }, { probabilityThreshold: 0.70, overlapFactor: 0.5 });
        }
      } catch (err) {
        setStatus('Virhe: Salli audio.');
      }
    } else {
      stopEngine();
    }
  };

  const stopEngine = () => {
    if (radioRef.current) radioRef.current.pause();
    if (localMusicRef.current) localMusicRef.current.pause();
    if (recognizerRef.current) {
      try { recognizerRef.current.stopListening(); } catch (e) {}
    }
    setIsPlaying(false);
    setMode('RADIO');
    setStatus('Pysäytetty.');
    setAiConfidence(0);
  };

  return (
    <div className="main">
      <Head><title>PurePOP AI</title></Head>
      <div className="card">
        <div className="brand"><h1>Pure<span>POP</span> AI</h1></div>
        <div className={`screen ${mode !== 'RADIO' ? 'active' : ''}`}>
          <div className="mode-text">{mode === 'RADIO' ? 'LIVE RADIO' : 'OMA BIISI'}</div>
          <div className="status-text">{status}</div>
        </div>
        <div className="meter">
          <div className="meter-label">AI Analyysi: {aiConfidence}%</div>
          <div className="meter-bar">
            <div className="fill" style={{ width: aiConfidence + '%', background: aiConfidence > 80 ? '#ff4b4b' : '#00ff73' }}></div>
          </div>
        </div>
        <button onClick={toggleEngine} className={isPlaying ? 'btn stop' : 'btn start'}>
          {isPlaying ? 'SULJE' : 'KÄYNNISTÄ'}
        </button>
      </div>
      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />
      <style jsx>{`
        .main { min-height: 100vh; background: #080808; display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif; }
        .card { background: #111; padding: 40px; border-radius: 40px; width: 300px; text-align: center; border: 1px solid #222; }
        h1 span { color: #00ff73; }
        .screen { background: #1a1a1a; padding: 25px; border-radius: 20px; margin: 25px 0; border: 1px solid #333; }
        .active { border-color: #ff4b4b; background: #251212; }
        .mode-text { font-weight: bold; }
        .status-text { font-size: 12px; color: #666; margin-top: 5px; }
        .meter { text-align: left; margin-bottom: 30px; }
        .meter-label { font-size: 10px; color: #444; margin-bottom: 5px; text-transform: uppercase; font-weight: bold; }
        .meter-bar { height: 4px; background: #222; border-radius: 2px; }
        .fill { height: 100%; transition: 0.3s; }
        .btn { width: 100%; padding: 18px; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .start { background: #fff; color: #000; }
        .stop { background: #222; color: #fff; }
      `}</style>
    </div>
  );
}
