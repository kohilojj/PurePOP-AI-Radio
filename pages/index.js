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

  // --- ASETUKSET (URL-koodattu tiedostonimi) ---
  const RADIO_URL = "https://stream.popfm.fi/popfm.mp3";
  const MY_SONG_URL = "/music/PurePop%20AI%20Radio%20%E2%80%93%20Mainoskatko.mp3";

  useEffect(() => {
    initAI();
    return () => {
      if (recognizerRef.current) recognizerRef.current.stopListening();
    };
  }, []);

  // AI-mallin lataus
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

  // Pehmeä äänenvoimakkuuden siirtymä (Fade In/Out)
  const lerpVolume = (audioEl, targetVol, duration = 1200) => {
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

  // Käynnistys ja pysäytys
  const toggleEngine = async () => {
    if (!isPlaying) {
      try {
        await radioRef.current.play();
        radioRef.current.volume = 1;
        setIsPlaying(true);
        setStatus('AI Valvoo lähetystä...');

        // Aloitetaan analyysi
        recognizerRef.current.
