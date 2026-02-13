'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type DrawingImageNodeData = {
  imageUrl: string;      // Vercel Blob CDN URL for the PNG
  drawingId: string;     // ID in stepArtifacts.drawings array (for re-edit lookup)
  width: number;         // Drawing width in pixels
  height: number;        // Drawing height in pixels
};

export type DrawingImageNode = Node<DrawingImageNodeData, 'drawingImage'>;

export const DrawingImageNode = memo(({ data, selected, id }: NodeProps<DrawingImageNode>) => {
  // Cap display width at 400px, scale height proportionally
  const displayWidth = Math.min(data.width, 400);
  const displayHeight = displayWidth * (data.height / data.width);

  return (
    <div
      className="group relative bg-white dark:bg-zinc-800 rounded-lg shadow-md hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition-all duration-150 cursor-pointer"
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundImage: `url(${data.imageUrl})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        ...(selected ? {
          boxShadow: '0 0 0 2px rgb(59 130 246)',
          outline: '1px solid transparent',
        } : {}),
      }}
    >
      {/* Hidden handles for future edge connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0"
      />

      {/* Pencil icon - visible on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-600 dark:text-gray-400"
        >
          <path
            d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064l6.286-6.286Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-0 !h-0"
      />
    </div>
  );
});

DrawingImageNode.displayName = 'DrawingImageNode';
