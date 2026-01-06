import React from 'react';
import styles from './background.module.css';

const RouletteBackground: React.FC = () => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, overflow: 'hidden' }}>
      {/* Spotlights dinámicos */}
      <div className={`${styles.spotlight} ${styles.spotlight1}`} />
      <div className={`${styles.spotlight} ${styles.spotlight2}`} />
      <div className={`${styles.spotlight} ${styles.spotlight3}`} />
      <div className={`${styles.spotlight} ${styles.spotlight4}`} />
      
      {/* Capas base */}
      <div className={styles.lightRays}></div>
      <div className={styles.centerGlow}></div>
    </div>
  );
};

export default RouletteBackground;
