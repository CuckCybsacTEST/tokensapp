import React from "react";
import { styleUtils } from "../../styles/brand";

/**
 * ScrollX Component
 *
 * Creates a horizontally scrollable container with snap points and masked edges.
 * Used for displaying cards, testimonials, and other content in horizontal carousels.
 *
 * @param children - The content to be rendered inside the scrollable area
 * @param className - Optional additional CSS classes
 */
interface ScrollXProps {
  children: React.ReactNode;
  className?: string;
}

export const ScrollX: React.FC<ScrollXProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-5 md:overflow-visible scrollbar-hide scroll-smooth ${className}`}
      style={styleUtils.scrollableArea}
    >
      {children}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ScrollX;
