import React from 'react';
import styles from './background.module.css';

const RouletteBackground: React.FC = () => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
      <div className={styles.lightRays}></div>
      <div className={styles.centerGlow}></div>
    </div>
  );
};

export default RouletteBackground;
