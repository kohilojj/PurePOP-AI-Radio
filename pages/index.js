import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

export default function PurePopAI() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState('RADIO');
  const [aiConfidence, setAiConfidence] = useState(0);
  const [status, setStatus] = useState('Alustetaan AI-järjestelmää...');

  const radioRef = useRef(null);
  const localMusicRef = useRef(null);
  const recognizerRef = useRef(null);
  const fadeInterval = useRef(null);

  const RADIO_URL = "https://stream.popfm.fi/popfm.mp3";
  // Käytetään tiedostoasi: PurePop AI Radio – Mainoskatko.mp3
  const MY_SONG_URL = "/music/PurePop%20AI%20Radio%20%E2%80%93%20Mainoskatko.mp3";

  useEffect(() => {
    async function initAI() {
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
        console.error("AI Error:", e);
      }
    }
    initAI();
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
        setStatus('AI Valvoo lähetystä...');
        
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
        setStatus('Salli audio selaimessa.');
      }
    } else {
      stopEngine();
    }
  };

  const stopEngine = () => {
    if (radioRef.current) radioRef.current.pause();
    if (localMusicRef.current) localMusicRef.current.pause();
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stopListening();
      } catch (e) {}
    }
    setIsPlaying(false);
    setMode('RADIO');
    setStatus('Pysäytetty.');
    setAiConfidence(0);
  };

  return (
    <div className="main-bg">
      <Head>
        <title>PurePOP AI - Mainosvapaa</title>
      </Head>
      
      <div className="radio-card">
        <div className="header-info">
          <div className="status-dot"></div>
          <h1>Pure<span>POP</span> AI</h1>
        </div>

        <div className={`screen-box ${mode !== 'RADIO' ? 'ad-alert' : ''}`}>
          <div className="current-mode">
            {mode === 'RADIO' ? 'LIVE RADIO' : 'OMA BIISI SOI'}
          </div>
          <div className="ai-status-text">{status}</div>
        </div>

        <div className="ai-meter">
          <div className="meter-info">AI Puhetunnistus: {aiConfidence}%</div>
          <div className="meter-bg">
            <div 
              className="meter-fill" 
              style={{ 
                width: aiConfidence + '%', 
                backgroundColor: aiConfidence > 80 ? '#ff4b4b' : '#00ff73' 
              }}
            ></div>
          </div>
        </div>

        <button onClick={toggleEngine} className={isPlaying ? 'btn btn-stop' : 'btn btn-start'}>
          {isPlaying ? 'STOP' : 'KÄYNNISTÄ'}
        </button>
      </div>

      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />

      <style jsx>{`
        .main-bg { min-height: 100vh; background: #080808; display: flex; align-items: center; justify-content: center; color: white; font-family: -apple-system, sans-serif; }
        .radio-card { background: #111; padding: 40px; border-radius: 40px; width: 300px; text-align: center; border: 1px solid #222; box-shadow: 0 40px 100px rgba(0,0,0,0.8); }
        h1 { margin: 0; font-size: 1.8rem; letter-spacing: -1.5px; }
        h1 span { color: #00ff73; }
        .status-dot { width: 8px; height: 8px; background: #00ff73; border-radius: 50%; display: inline-block; box-shadow: 0 0 10px #00ff73; margin-bottom: 5px; }
        .screen-box { background: #1a1a1a; padding: 20px; border-radius: 20px; margin: 25px 0; border: 1px solid #333; transition: 0.3s; }
        .ad-alert { border-color: #ff4b4b; background: #251212; }
        .current-mode { font-weight: bold; font-size: 1rem; }
        .ai-status-text { font-size: 0.75rem; color: #666; margin-top: 5px; }
        .ai-meter { text-align: left; margin-bottom: 30px; }
        .meter-info { font-size: 10px; font-weight: bold; color: #444; text-transform: uppercase; margin-bottom: 8px; }
        .meter-bg { height: 4px; background: #222; border-radius: 2px; }
        .meter-fill { height: 100%; transition: 0.4s; }
        .btn { width: 100%; padding: 18px; border-radius: 20px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 1rem; }
        .btn-start { background: #fff; color: #000; }
        .btn-stop { background: #222; color: #fff; }
        .btn:active { transform: scale(0.96); }
      `}</style>
    </div>
  );
}
