import React from "react";
import { brand } from "../../styles/brand";

/**
 * Stars Component
 *
 * Displays a star rating with the specified value (1-5).
 * Used for testimonials and reviews.
 *
 * @param value - The rating value from 1 to 5, can include half stars
 */
interface StarsProps {
  value: number;
}

export const Stars: React.FC<StarsProps> = ({ value }) => {
  // Ensure value is between 0 and 5
  const rating = Math.min(Math.max(0, value), 5);

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < rating ? brand.accent : "none"}
          stroke={brand.accent}
          aria-hidden="true"
        >
          <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.402 8.168L12 18.896 4.664 23.166l1.402-8.168L.132 9.211l8.2-1.193z" />
        </svg>
      ))}
    </div>
  );
};

export default Stars;
