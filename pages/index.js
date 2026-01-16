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
    // Alustetaan AI vain selaimessa
    const startLoader = async () => {
      try {
        const tf = await import('@tensorflow/tfjs');
        const speechCommands = await import('@tensorflow-models/speech-commands');
        await tf.ready();
        const r = speechCommands.create("BROWSER_FFT");
        await r.ensureModelLoaded();
        recognizerRef.current = r;
      } catch (e) {
        console.error("AI Error:", e);
      }
    };
    startLoader();
  }, []);

  const lerpVolume = (audioEl, target) => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    if (!audioEl) return;
    fadeInterval.current = setInterval(() => {
      const v = audioEl.volume;
      if (v < target - 0.05) audioEl.volume += 0.05;
      else if (v > target + 0.05) audioEl.volume -= 0.05;
      else {
        audioEl.volume = target;
        clearInterval(fadeInterval.current);
      }
    }, 50);
  };

  const handleAudioLogic = (result) => {
    const score = result.scores[1];
    setAiConfidence(Math.round(score * 100));

    if (score > 0.88 && mode === 'RADIO') {
      setMode('OMA_MUSIIKKI');
      radioRef.current.muted = true;
      localMusicRef.current.src = MY_SONG_URL;
      localMusicRef.current.play().catch(() => {});
      lerpVolume(localMusicRef.current, 1);
    } else if (score < 0.15 && mode === 'OMA_MUSIIKKI') {
      setMode('RADIO');
      lerpVolume(localMusicRef.current, 0);
      setTimeout(() => {
        localMusicRef.current.pause();
        radioRef.current.muted = false;
      }, 1000);
    }
  };

  const start = async () => {
    if (isPlaying) {
      // Stop logic
      radioRef.current.pause();
      localMusicRef.current.pause();
      if (recognizerRef.current) recognizerRef.current.stopListening();
      setIsPlaying(false);
      setMode('RADIO');
    } else {
      // Start logic
      try {
        await radioRef.current.play();
        setIsPlaying(true);
        if (recognizerRef.current) {
          recognizerRef.current.listen(handleAudioLogic, {
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
    <div className="bg">
      <Head><title>PurePOP AI</title></Head>
      <div className="ui">
        <h1>Pure<span>POP</span> AI</h1>
        <div className={`box ${mode !== 'RADIO' ? 'warn' : ''}`}>
          <div>{mode === 'RADIO' ? 'RADIO LIVE' : 'OMA BIISI'}</div>
          <small>{isPlaying ? 'AI Valvoo...' : 'Odottaa...'}</small>
        </div>
        <div className="meter"><div className="bar" style={{width: aiConfidence+'%'}}></div></div>
        <button onClick={start} className="btn">{isPlaying ? 'STOP' : 'START'}</button>
      </div>
      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />
      <style jsx>{`
        .bg { min-height:100vh; background:#000; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif; }
        .ui { background:#111; padding:40px; border-radius:30px; width:260px; text-align:center; border:1px solid #222; }
        h1 span { color:#00ff00; }
        .box { background:#1a1a1a; padding:20px; border-radius:20px; margin:20px 0; border:1px solid #333; }
        .warn { border-color:#ff0000; color:#ff0000; }
        .meter { height:4px; background:#222; margin-bottom:20px; border-radius:2px; overflow:hidden; }
        .bar { height:100%; background:#00ff00; transition:0.3s; }
        .btn { width:100%; padding:15px; border-radius:15px; border:none; font-weight:bold; cursor:pointer; background:#fff; }
      `}</style>
    </div>
  );
}
