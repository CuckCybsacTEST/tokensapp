import React from 'react';
import { brand } from '../../styles/brand';

/**
 * SectionTitle Component
 * 
 * Displays a consistent section header with optional kicker text, main title and subtitle.
 * Used across the landing page to maintain visual hierarchy and consistency.
 * 
 * @param kicker - Optional small text displayed above the title
 * @param title - Main title of the section
 * @param subtitle - Optional descriptive text displayed below the title
 */
interface SectionTitleProps {
  kicker?: string;
  title: string;
  subtitle?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ kicker, title, subtitle }) => {
  return (
    <div className="max-w-4xl mx-auto text-center mb-16 mt-12 px-4">
      {kicker && (
        <p 
          className="uppercase tracking-[0.32em] text-[11px] font-medium mb-3.5" 
          style={{ color: `${brand.accent}DD` }}
        >
          {kicker}
        </p>
      )}
      <h2 
        className="text-3xl md:text-[40px] font-black mb-4 leading-[1.15] tracking-tight" 
        style={{ 
          color: "#fff", 
          textShadow: `0 0 12px ${brand.primary}55, 0 0 24px ${brand.secondary}35` 
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p 
          className="mt-3.5 text-base md:text-lg max-w-2xl mx-auto" 
          style={{ color: "#FFFFFFBB" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionTitle;
