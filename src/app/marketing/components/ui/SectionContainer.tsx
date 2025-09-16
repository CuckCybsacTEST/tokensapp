import { ReactNode } from 'react';

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

function SectionContainer({ children, className = '', id }: SectionContainerProps) {
  return (
    <section 
      id={id}
      className={`w-full max-w-6xl mx-auto ${className}`}
    >
      {children}
    </section>
  );
}

export default SectionContainer;
