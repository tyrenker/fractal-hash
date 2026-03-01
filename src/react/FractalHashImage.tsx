import React, { useEffect, useState } from 'react';
import { fractalHash } from '../index.js';
import { FractalHashOptions } from '../core/types.js';
import { normalize } from '../core/normalizer.js';
import { extractParameters } from '../core/parameter-extractor.js';
import { describeFractal } from '../accessibility/describe.js';

interface FractalHashImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  hash: string;
  size?: number;
  background?: 'dark' | 'light' | 'transparent';
}

export function FractalHashImage({
  hash,
  size = 128,
  background = 'dark',
  ...props
}: FractalHashImageProps) {
  const [src, setSrc] = useState<string>('');
  const [altText, setAltText] = useState<string>(`Fractal hash of ${hash}`);

  useEffect(() => {
    let cancelled = false;
    const opts: FractalHashOptions = { size, format: 'png', background };

    // Generate image and accessible description in parallel
    Promise.all([
      fractalHash(hash, opts),
      normalize(hash).then(bytes => describeFractal(extractParameters(bytes))),
    ]).then(([dataUrl, description]) => {
      if (!cancelled) {
        setSrc(dataUrl);
        setAltText(description);
      }
    });

    return () => { cancelled = true; };
  }, [hash, size, background]);

  if (!src) {
    return <div style={{ width: size, height: size, background: '#1a1a1a' }} />;
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={altText}
      aria-label={altText}
      {...props}
    />
  );
}
