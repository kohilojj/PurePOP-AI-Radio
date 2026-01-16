import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

export default function App() {
  const [play, setPlay] = useState(false);
  const [ad, setAd] = useState(false);
  const rRef = useRef(null);
  const mRef = useRef(null);
  const aiRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (typeof window !== 'undefined') {
        const tf = await import('@tensorflow/tfjs');
        const sc = await import('@tensorflow-models/speech-commands');
        await tf.ready();
        const m = sc.create("BROWSER_FFT");
        await m.ensureModelLoaded();
        aiRef.current = m;
      }
    };
    load();
  }, []);

  const onResult = (res) => {
    const s = res.scores[1];
    if (s > 0.85 && !ad) {
      setAd(true);
      rRef.current.muted = true;
      mRef.current.play().catch(() => {});
    } else if (s < 0.2 && ad) {
      setAd(false);
      mRef.current.pause();
      rRef.current.muted = false;
    }
  };

  const start = async () => {
    if (!play) {
      await rRef.current.play();
      setPlay(true);
      if (aiRef.current) aiRef.current.listen(onResult, { probabilityThreshold: 0.7 });
    } else {
      window.location.reload();
    }
  };

  return (
    <div style={{background:'#000',color:'#fff',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Head><title>PurePOP AI</title></Head>
      <div style={{textAlign:'center',border:'1px solid #222',padding:'50px',borderRadius:'30px'}}>
        <h1>Pure<span style={{color:'#0f0'}}>POP</span> AI</h1>
        <p>{ad ? 'MAINOSKATKO' : 'RADIO LIVE'}</p>
        <button onClick={start} style={{padding:'15px 30px',cursor:'pointer'}}>{play ? 'STOP' : 'START'}</button>
      </div>
      <audio ref={rRef} src="https://stream.popfm.fi/popfm.mp3" crossOrigin="anonymous" />
      <audio ref={mRef} src="/music/PurePop%20AI%20Radio%20%E2%80%93%20Mainoskatko.mp3" loop />
    </div>
  );
}
