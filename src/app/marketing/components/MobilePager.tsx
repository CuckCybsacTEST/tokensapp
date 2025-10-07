"use client";
import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { PagerApi } from './PagerContext';

type Props = {
  children: React.ReactNode[];
  className?: string;
  onApi?: (api: PagerApi) => void;
  onSelect?: (index: number) => void;
};

export function MobilePager({ children, className, onApi, onSelect }: Props){
  const [selected, setSelected] = React.useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false,
    dragFree: false,
    align: 'start',
    skipSnaps: false,
    containScroll: 'trimSnaps'
  }, []);

  React.useEffect(()=>{
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect as any); };
  }, [emblaApi]);

  const api = React.useMemo(()=>({
    scrollTo: (i:number)=> emblaApi?.scrollTo(i),
    selected,
    setSelected,
  }), [emblaApi, selected]);
  React.useEffect(()=>{ if (onApi) onApi(api); }, [api, onApi]);
  React.useEffect(()=>{ if (onSelect) onSelect(selected); }, [selected, onSelect]);

  return (
    <>
      <div className={className ?? ''}>
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {React.Children.map(children, (child, idx)=> (
              <div className="embla__slide" key={idx}>{child}</div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .embla { height: 100svh; overflow: hidden; }
        .embla__container { display: flex; flex-direction: column; height: 100%; }
        .embla__slide { flex: 0 0 100%; min-height: 100%; }
        @supports not (height: 100svh){ .embla { height: 100vh; } }
      `}</style>
    </>
  );
}

export default MobilePager;
