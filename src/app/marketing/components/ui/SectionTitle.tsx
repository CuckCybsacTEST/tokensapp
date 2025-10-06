import React from "react";
import { brand } from "../../styles/brand";

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
  subtitle?: React.ReactNode;
  compact?: boolean; // reduce default outer margins
  dense?: boolean; // extra reduction (used for tight mobile folds)
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  kicker,
  title,
  subtitle,
  compact,
  dense,
}) => {
  let outer: string;
  if (compact && dense) outer = "mb-6 mt-4";
  else if (compact) outer = "mb-10 mt-6";
  else if (dense) outer = "mb-12 mt-6";
  else outer = "mb-16 mt-12";
  return (
    <div className={`max-w-4xl mx-auto text-center ${outer} px-4`}>
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
          textShadow: `0 0 12px ${brand.primary}55, 0 0 24px ${brand.secondary}35`,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <div
          className="mt-3.5 text-base md:text-lg max-w-2xl mx-auto"
          style={{ color: "#FFFFFFBB" }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default SectionTitle;
