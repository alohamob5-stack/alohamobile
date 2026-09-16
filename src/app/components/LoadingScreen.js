'use client';

export default function LoadingScreen({ fullscreen = true }) {
  return (
    <div style={{
      minHeight: fullscreen ? '100vh' : '40vh',
      background: 'var(--black)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
          fontWeight: '900',
          letterSpacing: '-1px',
          animation: 'gsmPulse 1.4s ease-in-out infinite',
        }}>
          <span style={{ color: '#fff' }}>GSM</span>
          <span style={{ color: 'var(--red)' }}>MOB</span>
        </div>
        <div style={{
          marginTop: '1rem',
          width: '32px',
          height: '32px',
          margin: '1rem auto 0',
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: 'var(--red)',
          borderRadius: '50%',
          animation: 'gsmSpin 0.8s linear infinite',
        }} />
      </div>
      <style>{`
        @keyframes gsmPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes gsmSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
