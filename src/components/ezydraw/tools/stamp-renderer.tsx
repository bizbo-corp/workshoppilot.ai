'use client';

import { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { StampElement } from '@/lib/drawing/types';

interface StampRendererProps {
  element: StampElement;
  commonProps: {
    id: string;
    listening: boolean;
    draggable: boolean;
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  };
}

/**
 * Renders a StampElement on the Konva canvas.
 * Loads an HTMLImageElement from the element's src (blob URL or data URL).
 */
export function StampRenderer({ element, commonProps }: StampRendererProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => {
      console.error('Failed to load stamp image:', element.assetId);
      setImage(null);
    };
    img.src = element.src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [element.src, element.assetId]);

  if (!image) return null;

  return (
    <KonvaImage
      {...commonProps}
      image={image}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      scaleX={element.scaleX}
      scaleY={element.scaleY}
      opacity={element.opacity}
    />
  );
}
