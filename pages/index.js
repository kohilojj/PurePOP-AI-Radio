import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import * as tf from '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';

export default function PurePopAI() {
  // Tilat käyttöliittymää varten
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState('RADIO'); // 'RADIO' tai 'OMA_MUSIIKKI'
  const [aiConfidence, setAiConfidence] = useState(0);
  const [status, setStatus] = useState('Ladataan tekoälyä...');

  // Referenssit audio-elementteihin ja AI:hin
  const radioRef = useRef(null);
  const localMusicRef = useRef(null);
  const recognizerRef = useRef(null);
  const fadeInterval = useRef(null);

  // ASETUKSET
  const RADIO_URL = "https://stream.popfm.fi/popfm.mp3";
  const MY_PLAYLIST = [
    "/music/PurePop AI Radio – Mainoskatko.mp3" 
    // Voit lisätä tänne muita tiedostoja: "/music/biisi2.mp3"
  ];

  useEffect(() => {
    initAI();
    return () => {
      if (recognizerRef.current) recognizerRef.current.stopListening();
    };
  }, []);

  async function initAI() {
    try {
      const recognizer = speechCommands.create("BROWSER_FFT");
      await recognizer.ensureModelLoaded();
      recognizerRef.current = recognizer;
      setStatus('AI Valmiina. Paina Start.');
    } catch (e) {
      setStatus('AI Virhe: ' + e.message);
    }
  }

  // Pehmeä äänenvoimakkuuden säätö (Fade)
  const lerpVolume = (audioEl, targetVol, duration = 1000) => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    const step = 0.05;
    const intervalTime = duration * step;
    
    fadeInterval.current = setInterval(() => {
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

  const startEngine = async () => {
    if (!isPlaying) {
      try {
        await radioRef.current.play();
        radioRef.current.volume = 1;
        setIsPlaying(true);
        setStatus('AI Valvoo lähetystä...');

        // Käynnistetään kuuntelu
        recognizerRef.current.listen(result => {
          const speechProb = result.scores[1]; // Puheen todennäköisyys (index 1)
          setAiConfidence(Math.round(speechProb * 100));

          // TUNNISTUSLOGIIKKA
          if (speechProb > 0.85) {
            switchToLocal();
          } else if (speechProb < 0.20) {
            switchToRadio();
          }
        }, {
          includeSpectrogram: true,
          probabilityThreshold: 0.75,
          overlapFactor: 0.5
        });
      } catch (err) {
        setStatus('Käynnistys epäonnistui: ' + err.message);
      }
    } else {
      stopEngine();
    }
  };

  const switchToLocal = () => {
    if (mode === 'RADIO') {
      setMode('OMA_MUSIIKKI');
      // Häivytetään radio pois ja aloitetaan oma musiikki
      radioRef.current.muted = true;
      localMusicRef.current.src = MY_PLAYLIST[0];
      localMusicRef.current.volume = 0;
      localMusicRef.current.play();
      lerpVolume(localMusicRef.current, 1, 800);
      console.log("AI: Mainos havaittu -> Vaihdetaan omaan biisiin.");
    }
  };

  const switchToRadio = () => {
    if (mode === 'OMA_MUSIIKKI') {
      setMode('RADIO');
      // Häivytetään oma musiikki pois ja palautetaan radio
      lerpVolume(localMusicRef.current, 0, 800);
      setTimeout(() => {
        localMusicRef.current.pause();
        radioRef.current.muted = false;
        radioRef.current.volume = 1;
      }, 850);
      console.log("AI: Musiikki palasi -> Palataan radioon.");
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
    <div className="container">
      <Head>
        <title>PurePOP AI - Stealth Radio</title>
        <meta name="theme-color" content="#000000" />
      </Head>

      <div className="player-card">
        <div className="header">
          <div className="badge">STEALTH MODE</div>
          <h1>Pure<span>POP</span> AI</h1>
        </div>

        <div className={`display ${mode === 'OMA_MUSIIKKI' ? 'ad-alert' : ''}`}>
          <div className="pulse"></div>
          <h2>{mode === 'RADIO' ? 'LIVE: POP FM' : 'OMA MIXER'}</h2>
          <p>{status}</p>
        </div>

        <div className="ai-monitor">
          <div className="label">AI ANALYYSI: {aiConfidence}% PUHETTA</div>
          <div className="progress-bg">
            <div className="progress-fill" style={{ width: `${aiConfidence}%`, backgroundColor: aiConfidence > 80 ? '#ff3e3e' : '#00ff4c' }}></div>
          </div>
        </div>

        <button onClick={startEngine} className={isPlaying ? 'btn-stop' : 'btn-start'}>
          {isPlaying ? 'SULJE KANAVA' : 'KÄYNNISTÄ PUHDAS RADIO'}
        </button>

        <div className="legal">
          Ei re-striimausta. AI-pohjainen paikallinen mykistys käytössä.
        </div>
      </div>

      <audio ref={radioRef} src={RADIO_URL} crossOrigin="anonymous" />
      <audio ref={localMusicRef} loop />

      <style jsx>{`
        .container { min-height: 100vh; background: #080808; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .player-card { background: #121212; width: 340px; padding: 40px; border-radius: 40px; border: 1px solid #222; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.6); }
        h1 { margin: 0; font-size: 1.8rem; letter-spacing: -1px; }
        h1 span { color: #00ff4c; }
        .badge { font-size: 0.6rem; background: #333; color: #aaa; display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
        .display { background: #1a1a1a; margin: 30px 0; padding: 30px; border-radius: 25px; border: 1px solid #333; transition: 0.5s; position: relative; overflow: hidden; }
        .display.ad-alert { border-color: #ff3e3e; background: #2a1111; }
        .display h2 { margin: 0; font-size: 1.1rem; }
        .display p { font-size: 0.8rem; color: #666; margin-top: 10px; }
        .pulse { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px; background: #00ff4c; border-radius: 50%; box-shadow: 0 0 10px #00ff4c; animation: blink 1.5s infinite; }
        .ai-monitor { text-align: left; margin-bottom: 30px; }
        .label { font-size: 0.7rem; color: #555; margin-bottom: 8px; font-weight: bold; }
        .progress-bg { background: #222; height: 6px; border-radius: 3px; }
        .progress-fill { height: 100%; border-radius: 3px; transition: 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
        button { width: 100%; padding: 18px; border-radius: 20px; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
        .btn-start { background: #00ff4c; color: #000; }
        .btn-stop { background: #222; color: #fff; }
        button:hover { transform: scale(1.02); }
        .legal { font-size: 0.6rem; color: #444; margin-top: 20px; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}
