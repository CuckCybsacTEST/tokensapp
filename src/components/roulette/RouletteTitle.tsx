import React from 'react';
import styles from './roulette.module.css';

interface RouletteTitleProps {
  text?: string;
}

const RouletteTitle: React.FC<RouletteTitleProps> = ({ text = "¡Gira la ruleta y gana!" }) => {
  return (
    <div className={styles.rouletteTitle}>
      <h1>{text}</h1>
    </div>
  );
};

export default RouletteTitle;
