import type { SVGProps } from 'react'
import type { Shape as ShapeData } from '@/lib/partsmap/zones'

/** Renders one zone/bay shape (path, circle or rect) from the geometry data. */
export function Shape({ shape, ...props }: { shape: ShapeData } & SVGProps<SVGPathElement & SVGCircleElement & SVGRectElement>) {
  if ('d' in shape) return <path d={shape.d} {...props} />
  if ('r' in shape) return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...props} />
  return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} {...props} />
}
