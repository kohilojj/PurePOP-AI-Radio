import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import * as tf from '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';

export default function PurePopAI() {
  // --- TILANHALLINTA ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState('RADIO'); // 'RADIO' tai 'OMA_MUSIIKKI'
  const [aiConfidence, setAiConfidence] = useState(0);
  const [status, setStatus] = useState('Alustetaan AI-moottoria...');

  // --- REFERENSSIT ---
  const radioRef = useRef(null);
  const localMusicRef = useRef(null);
  const recognizerRef = useRef(null);
  const fadeInterval = useRef(null);

  // --- ASETUKSET (URL-koodattu tiedostonimi bänni-suojalla) ---
  const RADIO_URL = "https://stream.popfm.fi/popfm.mp3";
  const MY_SONG_URL = "/music/PurePop%20AI%20Radio%20%E2%80%93%20Mainoskatko.mp3";

  useEffect(() => {
    initAI();
    return () => {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stopListening();
        } catch (e) {
          console.log("Cleanup error", e);
        }
      }
    };
  }, []);

  // AI-mallin lataus
  async function initAI() {
    try {
      await tf.ready();
      const recognizer = speechCommands.create("BROWSER_FFT");
      await recognizer.ensureModelLoaded();
      recognizerRef.current = recognizer;
      setStatus('AI Valmiina. Paina Start.');
    } catch (e) {
      setStatus('AI Virhe: ' + e.message);
      console.error(e);
    }
  }

  // Pehmeä äänenvoimakkuuden siirtymä (Fade In/Out)
  const lerpVolume = (audioEl, targetVol, duration = 1200) => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    const step = 0.05;
    const intervalTime = (duration * step);
    
    fadeInterval.current = setInterval(() => {
      if (!audioEl) return;
      if (audioEl.volume < targetVol - step) {
        audioEl.volume += step;
      } else if (audioEl.volume > targetVol + step) {
        audioEl.volume -= step;
      } else {
        audioEl.volume = targetVol;
        clearInterval(fadeInterval.current);
      }
    }, intervalTime);
  };

  // Käynnistys ja pysäytys
  const toggleEngine = async () => {
    if (!isPlaying) {
      try {
        await radioRef.current.play();
        radioRef.current.volume = 1;
        setIsPlaying(true);
        setStatus('AI Valvoo lähetystä...');

        // Aloitetaan analyysi
        recognizerRef.current.listen(result => {
          const speechProb = result.scores[1]; // Puheen todennäköisyys
          const confValue = Math.round(speechProb * 100);
          setAiConfidence(confValue);

          // AI LOGIIKKA: Jos puhetta on yli 85%, vaihdetaan omaan biisiin
          if (speechProb > 0.85) {
            handleAdStart();
          } else if (speechProb < 0.20) {
            handleAdEnd();
          }
        }, {
          includeSpectrogram: true,
          probabilityThreshold: 0.75,
          overlapFactor: 0.5
        });
      } catch (err) {
        setStatus('Virhe: Salli audio selaimessa.');
        console.error(err);
      }
    } else {
      stopEngine();
    }
  };

  const handleAdStart = () => {
    if (mode === 'RADIO') {
      setMode('OMA_MUSIIKKI');
      if (radioRef.current) radioRef.current.muted = true;
      if (localMusicRef.current) {
        localMusicRef.current.src = MY_SONG_URL;
        localMusicRef.current.volume = 0;
        localMusicRef.current.play().catch(e => console.log("Play error", e));
        lerpVolume(localMusicRef.current, 1, 1000);
      }
    }
  };

  const handleAdEnd = () => {
    if (mode === 'OMA_MUSIIKKI') {
      setMode('RADIO');
      if (localMusicRef.current) {
        lerpVolume(localMusicRef.current, 0, 1000);
        setTimeout(() => {
          localMusicRef.current.pause();
          if (radioRef.current) {
            radioRef.current.muted = false;
            radioRef.current.volume = 1;
          }
        }, 1100);
      }
    }
  };

  const stopEngine = () => {
    if (radioRef.current) radioRef.current.pause();
    if (localMusicRef.current) localMusicRef.current.pause();
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stopListening();
      } catch (e) {
        console.log("Stop listening error", e);
      }
    }
    setIsPlaying(false);
    setMode('RADIO');
    setAiConfidence(0);
    setStatus('Pysäytetty.');
  };

  return (
    <div className="wrapper">
      <Head>
        <title>PurePOP AI - Mainosvapaa Radio</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="player-container">
        <div className="brand">
          <div className="ai-chip">AI ACTIVE</div>
          <h1>Pure<span>POP</span></h1>
        </div>

        <div className={`status-display ${mode === 'OMA_MUSIIKKI' ? 'ad-mode' : ''}`}>
          <div className="visualizer">
            <div className="dot" style={{ opacity: isPlaying ? 1 : 0.2 }}></div>
          </div>
          <h2>{mode === 'RADIO' ? 'SUORA: POP FM' : 'OMA BIISI SOI'}</h2>
          <p className="sub-status">{status}</p>
        </div>

        <div className="ai-stats">
          <div className="stat-header">
            <span>AI Puhetunnistus</span>
            <span>{aiConfidence}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-inner" 
              style={{ 
                width: `${aiConfidence}%`, 
                backgroundColor: aiConfidence > 80 ? '#ff4b4b' : '#00ff73' 
              }}
            ></div>
          </div>
        </div>

        <button onClick={toggleEngine} className={isPlaying ? 'btn-stop' : 'btn-start'}>
          {isPlaying ? 'SULJE SOITIN' : 'KÄYNNISTÄ PUHDAS RADIO'}
        </button>

        <div className="info-footer">
          Vercel Stealth Deployment v2.0<br/>
          Ei mainoksia, vain musiikkia.
        </div>
      </div>

      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />

      <style jsx>{`
        .wrapper { min-height: 100vh; background: #050505; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: white; }
        .player-container { background: #0f0f0f; width: 100%; max-width: 360px; padding: 40px; border-radius: 50px; border: 1px solid #222; box-shadow: 0 40px 100px rgba(0,0,0,0.8); text-align: center; }
        .brand { margin-bottom: 30px; }
        .ai-chip { font-size: 0.6rem; background: #00ff73; color: black; display: inline-block; padding: 3px 10px; border-radius: 20px; font-weight: 900; letter-spacing: 1px; margin-bottom: 10px; }
        h1 { margin: 0; font-size: 2.2rem; font-weight: 800; letter-spacing: -1.5px; }
        h1 span { color: #00ff73; }
        .status-display { background: #161616; padding: 30px; border-radius: 35px; border: 1px solid #282828; margin-bottom: 30px; transition: 0.4s; }
        .status-display.ad-mode { border-color: #ff4b4b; background: #251212; }
        .visualizer { display: flex; justify-content: center; margin-bottom: 15px; }
        .dot { width: 10px; height: 10px; background: #00ff73; border-radius: 50%; box-shadow: 0 0 15px #00ff73; }
        h2 { margin: 0; font-size: 1.1rem; letter-spacing: -0.5px; }
        .sub-status { font-size: 0.8rem; color: #666; margin-top: 8px; }
        .ai-stats { text-align: left; margin-bottom: 35px; padding: 0 10px; }
        .stat-header { display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; color: #444; margin-bottom: 10px; text-transform: uppercase; }
        .progress-bar { width: 100%; height: 6px; background: #222; border-radius: 10px; overflow: hidden; }
        .progress-inner { height: 100%; transition: 0.3s cubic-bezier(0.1, 0.7, 0.1, 1); }
        button { width: 100%; padding: 20px; border-radius: 25px; border: none; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
        .btn-start { background: #f0f0f0; color: black; }
        .btn-stop { background: #222; color: white; }
        button:active { transform: scale(0.96); }
        .info-footer { font-size: 0.65rem; color: #333; margin-top: 25px; line-height: 1.5; }
      `}</style>
    </div>
  );
}
