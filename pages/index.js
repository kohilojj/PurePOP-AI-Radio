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
    // Ladataan kirjastot dynaamisesti vain selaimessa
    const init = async () => {
      try {
        const tf = await import('@tensorflow/tfjs');
        const speechCommands = await import('@tensorflow-models/speech-commands');
        
        await tf.ready();
        const recognizer = speechCommands.create("BROWSER_FFT");
        await recognizer.ensureModelLoaded();
        recognizerRef.current = recognizer;
        setStatus('AI Valmiina.');
      } catch (e) {
        setStatus('Latausvirhe.');
        console.error(e);
      }
    };
    init();

    return () => {
      if (recognizerRef.current) {
        try { recognizerRef.current.stopListening(); } catch (e) {}
      }
    };
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
            const speechProb = result.scores[1]; // Puhe-indeksi
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
        setStatus('Salli äänet selaimessa.');
      }
    } else {
      stopEngine();
    }
  };

  const stopEngine = () => {
    radioRef.current?.pause();
    localMusicRef.current?.pause();
    if (recognizerRef.current) {
      try { recognizerRef.current.stopListening(); } catch (e) {}
    }
    setIsPlaying(false);
    setMode('RADIO');
    setStatus('Pysäytetty.');
  };

  return (
    <div className="main">
      <Head>
        <title>PurePOP AI - Mainosvapaa</title>
      </Head>
      
      <div className="card">
        <div className="header">
          <div className="dot"></div>
          <h1>Pure<span>POP</span> AI</h1>
        </div>

        <div className={`screen ${mode !== 'RADIO' ? 'alert' : ''}`}>
          <div className="label">{mode === 'RADIO' ? '📻 LIVE RADIO' : '🎵 OMA BIISI SOI'}</div>
          <div className="status">{status}</div>
        </div>

        <div className="monitor">
          <div className="monitor-text">AI Tarkkuus: {aiConfidence}%</div>
          <div className="bar-bg">
            <div className="bar-fill" style={{ width: aiConfidence + '%', background: aiConfidence > 80 ? '#ff4b4b' : '#00ff73' }}></div>
          </div>
        </div>

        <button onClick={toggleEngine} className={isPlaying ? 'btn stop' : 'btn start'}>
          {isPlaying ? 'SULJE RADIO' : 'KÄYNNISTÄ AI RADIO'}
        </button>
      </div>

      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />

      <style jsx>{`
        .main { min-height: 100vh; background: #0a0a0a; display: flex; align-items: center; justify-content: center; color: white; font-family: -apple-system, system-ui, sans-serif; }
        .card { background: #141414; padding: 40px; border-radius: 45px; width: 320px; text-align: center; border: 1px solid #222; box-shadow: 0 40px 100px rgba(0,0,0,0.7); }
        .header { margin-bottom: 25px; }
        .dot { width: 8px; height: 8px; background: #00ff73; border-radius: 50%; display: inline-block; box-shadow: 0 0 10px #00ff73; margin-bottom: 10px; }
        h1 { margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -1px; }
        h1 span { color: #00ff73; }
        .screen { background: #1d1d1d; padding: 25px; border-radius: 25px; margin: 25px 0; border: 1px solid #333; transition: 0.3s; }
        .alert { border-color: #ff4b4b; background: #2a1515; }
        .label { font-weight: 800; font-size: 0.9rem; }
        .status { font-size: 0.75rem; color: #666; margin-top: 5px; }
        .monitor { text-align: left; margin-bottom: 30px; }
        .monitor-text { font-size: 10px; font-weight: bold; color: #444; text-transform: uppercase; margin-bottom: 8px; }
        .bar-bg { height: 4px; background: #222; border-radius: 2px; }
        .bar-fill { height: 100%; transition: 0.3s cubic-bezier(0.1, 0.7, 0.1, 1); }
        .btn { width: 100%; padding: 18px; border-radius: 20px; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
        .start { background: #fff; color: #000; }
        .stop { background: #222; color: #fff; }
        .btn:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}
