import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

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
        setStatus('Virhe: Lataa sivu uudelleen.');
        console.error(e);
      }
    }
    loadAI();
  }, []);

  const lerpVolume = (audioEl, targetVol) => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    if (!audioEl) return;
    fadeInterval.current = setInterval(() => {
      const step = 0.05;
      if (audioEl.volume < targetVol - step) {
        audioEl.volume += step;
      } else if (audioEl.volume > targetVol + step) {
        audioEl.volume -= step;
      } else {
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
          // TÄMÄ ON SE KOHTA JOKA OLI RIKKI - NYT KORJATTU:
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
        setStatus('Salli audio.');
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
    setAiConfidence(0);
    setStatus('Pysäytetty.');
  };

  return (
    <div className="main">
      <Head><title>PurePOP AI</title></Head>
      <div className="card">
        <h1>Pure<span>POP</span> AI</h1>
        <div className={`screen ${mode !== 'RADIO' ? 'active' : ''}`}>
          <div className="mode">{mode === 'RADIO' ? '📻 RADIO' : '🎵 OMA BIISI'}</div>
          <div className="status">{status}</div>
        </div>
        <div className="meter">
          <div className="fill" style={{ width: aiConfidence + '%', background: aiConfidence > 80 ? '#ff0000' : '#00ff00' }}></div>
        </div>
        <button onClick={toggleEngine} className="btn">
          {isPlaying ? 'STOP' : 'START'}
        </button>
      </div>
      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />
      <style jsx>{`
        .main { min-height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-family: sans-serif; }
        .card { background: #111; padding: 40px; border-radius: 30px; width: 280px; text-align: center; border: 1px solid #222; }
        h1 span { color: #00ff00; }
        .screen { background: #1a1a1a; padding: 20px; border-radius: 20px; margin: 20px 0; border: 1px solid #333; }
        .active { border-color: #ff0000; }
        .mode { font-weight: bold; }
        .status { font-size: 12px; color: #666; margin-top: 5px; }
        .meter { height: 4px; background: #222; margin-bottom: 20px; border-radius: 2px; overflow: hidden; }
        .fill { height: 100%; transition: 0.3s; }
        .btn { width: 100%; padding: 15px; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; background: #fff; color: #000; }
      `}</style>
    </div>
  );
}
