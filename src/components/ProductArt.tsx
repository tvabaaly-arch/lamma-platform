import { memo, useId, useState } from 'react'
import type { Art } from '../data/catalog'

/*
 * LAMMA product illustration system — original, brand-coloured "still life" renders.
 * Every product is drawn from primitives (roses, tiers, balloons, boxes…) on a soft studio set.
 */

type Pal = { bg1: string; bg2: string; main: string; dark: string; accent: string; soft: string; set: string }
export const PALS: Pal[] = [
  { bg1: '#F3E9E1', bg2: '#E6D7C9', main: '#0F3D32', dark: '#0A2B23', accent: '#D4A373', soft: '#F6EDE7', set: '#E9DCCF' },
  { bg1: '#FBEAE7', bg2: '#F3D3CF', main: '#E89B9A', dark: '#C9706F', accent: '#0F3D32', soft: '#FFF7F4', set: '#F1D9D3' },
  { bg1: '#F8F1EA', bg2: '#ECDCCB', main: '#FBF6F1', dark: '#E2CDB8', accent: '#D4A373', soft: '#FFFFFF', set: '#EADBCC' },
  { bg1: '#F7ECE6', bg2: '#EBD6CC', main: '#F2C3C2', dark: '#DA9C9B', accent: '#8C5E3C', soft: '#FFF5F2', set: '#EED9CF' },
  { bg1: '#F1E5DA', bg2: '#DFC8B4', main: '#8C5E3C', dark: '#6E4528', accent: '#D4A373', soft: '#F6EDE7', set: '#E3D0BE' },
]

const G = '#0F3D32', GOLD = '#D4A373', BLUSH = '#E89B9A', CREAM = '#F6EDE7', COCOA = '#8C5E3C'

function Rose({ x, y, r, c, d }: { x: number; y: number; r: number; c: string; d: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={c} />
      <path d={`M${-r * 0.75} ${r * 0.1} Q 0 ${r * 1.1} ${r * 0.75} ${r * 0.1}`} fill="none" stroke={d} strokeWidth={r * 0.12} strokeLinecap="round" opacity=".55" />
      <path d={`M${-r * 0.5} ${-r * 0.15} Q 0 ${r * 0.6} ${r * 0.5} ${-r * 0.15}`} fill="none" stroke={d} strokeWidth={r * 0.11} strokeLinecap="round" opacity=".6" />
      <path d={`M${-r * 0.32} ${-r * 0.05} Q ${-r * 0.1} ${-r * 0.55} ${r * 0.3} ${-r * 0.3} Q ${r * 0.1} ${r * 0.15} ${-r * 0.2} ${r * 0.08}`} fill="none" stroke={d} strokeWidth={r * 0.1} strokeLinecap="round" opacity=".7" />
      <circle cx={-r * 0.35} cy={-r * 0.4} r={r * 0.22} fill="#fff" opacity=".18" />
    </g>
  )
}
function Leaf({ x, y, a, s = 1, c = '#2A6B5A' }: { x: number; y: number; a: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M0 0 C 14 -10 34 -10 48 0 C 34 10 14 10 0 0Z" fill={c} />
      <path d="M2 0 L 44 0" stroke="#fff" strokeOpacity=".25" strokeWidth="1.2" />
    </g>
  )
}
function Star4({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -10 C 1.5 -3 3 -1.5 10 0 C 3 1.5 1.5 3 0 10 C -1.5 3 -3 1.5 -10 0 C -3 -1.5 -1.5 -3 0 -10Z" fill={c} />
}
function Balloon({ x, y, r, c, sx = 150, sy = 420, id }: { x: number; y: number; r: number; c: string; sx?: number; sy?: number; id: string }) {
  return (
    <g>
      <path d={`M${x} ${y + r * 1.15} Q ${(x + sx) / 2 + (x > sx ? 18 : -18)} ${(y + sy) / 2} ${sx} ${sy}`} stroke="#8C7A6B" strokeWidth="1.2" fill="none" opacity=".7" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill={c} />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill={`url(#${id}-gloss)`} />
      <path d={`M${x - 5} ${y + r * 1.15 + 6} L ${x} ${y + r * 1.12} L ${x + 5} ${y + r * 1.15 + 6}Z`} fill={c} />
      <ellipse cx={x - r * 0.38} cy={y - r * 0.45} rx={r * 0.16} ry={r * 0.28} fill="#fff" opacity=".45" transform={`rotate(-25 ${x - r * 0.38} ${y - r * 0.45})`} />
    </g>
  )
}
function Macaron({ x, y, w, c }: { x: number; y: number; w: number; c: string }) {
  const h = w * 0.22
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy={h * 1.6} rx={w / 2} ry={h} fill={c} />
      <ellipse cy={h * 1.6} rx={w / 2} ry={h} fill="#000" opacity=".08" />
      <rect x={-w / 2 + 3} y={h * 0.6} width={w - 6} height={h * 0.9} rx={h * 0.4} fill={CREAM} />
      <ellipse cy={0} rx={w / 2} ry={h * 1.05} fill={c} />
      <ellipse cx={-w * 0.15} cy={-h * 0.35} rx={w * 0.2} ry={h * 0.3} fill="#fff" opacity=".3" />
    </g>
  )
}

function Body({ a, P, id }: { a: Art; P: Pal; id: string }) {
  const rc = [P.main === '#FBF6F1' ? '#F7EFE6' : P.main, BLUSH, CREAM, GOLD]
  switch (a.k) {
    case 'bouquet': {
      if (a.n === '1')
        return (
          <g>
            <path d="M200 395 C 198 330 205 250 200 175" stroke="#2A6B5A" strokeWidth="5" fill="none" />
            <Leaf x={200} y={300} a={-35} s={0.9} />
            <Leaf x={200} y={265} a={200} s={0.8} />
            <Rose x={200} y={160} r={34} c="#C9545A" d="#8E2F36" />
            <path d="M160 300 L240 300 L222 410 L178 410Z" fill="#fff" opacity=".35" />
            <path d="M180 352 q 20 10 40 0" stroke={GOLD} strokeWidth="5" fill="none" />
          </g>
        )
      const wrap = a.c === 0 ? G : a.c === 4 ? '#C9A27E' : a.c === 2 ? '#EADBC8' : '#F7E9DF'
      const roses = a.c === 0 ? [CREAM, '#fff', CREAM, GOLD] : a.c === 4 ? ['#E9A47C', GOLD, '#F2C29B', BLUSH] : a.c === 2 ? ['#fff', CREAM, '#F4E7D8', GOLD] : a.c === 3 ? ['#C9545A', BLUSH, '#E07A7E', '#F2C3C2'] : [BLUSH, '#F2C3C2', CREAM, '#D9807F']
      const pts: [number, number, number][] = [[200, 150, 30], [158, 172, 27], [242, 170, 28], [180, 205, 29], [224, 208, 30], [140, 214, 23], [262, 214, 24], [200, 238, 26], [170, 128, 20], [232, 126, 21]]
      return (
        <g>
          {[[-130, 150, 230], [-60, 135, 165], [-110, 262, 228], [-30, 268, 160], [-80, 200, 128]].map(([ang, x, y], i) => <Leaf key={i} x={x} y={y} a={ang} s={1.05} />)}
          <circle cx={130} cy={150} r={6} fill={CREAM} /><circle cx={272} cy={140} r={5} fill={CREAM} /><circle cx={118} cy={186} r={4} fill={GOLD} />
          {pts.map(([x, y, r], i) => <Rose key={i} x={x} y={y} r={r} c={roses[i % roses.length]} d={i % 4 === 3 ? COCOA : '#00000055'} />)}
          <path d="M112 232 L288 232 L232 412 L168 412Z" fill={wrap} />
          <path d="M112 232 L200 258 L168 412Z" fill="#000" opacity=".08" />
          <path d="M288 232 L210 262 L232 412Z" fill="#fff" opacity=".1" />
          <path d="M112 232 Q 200 268 288 232" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
          <path d="M176 342 Q 200 352 224 342 L 222 356 Q 200 364 178 356Z" fill={a.c === 0 ? GOLD : G} />
          <path d="M200 350 C 170 330 160 360 196 354 M200 350 C 230 330 240 360 204 354" stroke={a.c === 0 ? GOLD : G} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M196 356 L 184 392 M204 356 L 218 390" stroke={a.c === 0 ? GOLD : G} strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    }
    case 'rosebox': {
      const box = a.c === 0 ? G : a.c === 1 ? '#F3E3DC' : P.main
      const roses = a.c === 0 ? ['#fff', CREAM, GOLD, '#F7F0E8'] : [BLUSH, '#D9807F', '#F2C3C2', '#E07A7E']
      const pts: [number, number][] = []
      for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - row; i++) pts.push([200 - (5 - row) * 22 + i * 44 + (row % 2) * 0, 240 - row * 28])
      return (
        <g>
          <path d="M90 250 L90 380 Q 200 420 310 380 L310 250Z" fill={box} />
          <path d="M90 250 L90 380 Q 140 398 160 400 L160 266Z" fill="#000" opacity=".08" />
          <path d="M90 318 Q 200 352 310 318 L310 338 Q 200 372 90 338Z" fill={a.c === 0 ? GOLD : G} opacity=".95" />
          <ellipse cx="200" cy="250" rx="110" ry="30" fill={box} />
          <ellipse cx="200" cy="250" rx="104" ry="26" fill="#000" opacity=".18" />
          {pts.map(([x, y], i) => <Rose key={i} x={x} y={y} r={25} c={roses[i % 4]} d="#00000050" />)}
          <text x="200" y="378" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="13" letterSpacing="3" fill={a.c === 0 ? GOLD : CREAM} opacity=".9">L A M M A</text>
        </g>
      )
    }
    case 'vase': {
      const flowers = a.c === 1 ? [BLUSH, '#F2C3C2', CREAM, '#D9807F', '#fff'] : [CREAM, '#fff', GOLD, BLUSH, '#F2C3C2']
      return (
        <g>
          {[[-150, 160, 230], [-30, 240, 235], [-100, 180, 170], [-70, 240, 160], [-120, 140, 200]].map(([ang, x, y], i) => <Leaf key={i} x={x} y={y} a={ang} s={1.1} />)}
          {[[150, 165, 34], [250, 160, 30], [200, 130, 38], [120, 215, 26], [280, 210, 27], [175, 200, 30], [228, 205, 32]].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={flowers[i % 5]} />
              {[0, 72, 144, 216, 288].map((ang) => <circle key={ang} cx={x + Math.cos((ang * Math.PI) / 180) * r * 0.45} cy={y + Math.sin((ang * Math.PI) / 180) * r * 0.45} r={r * 0.42} fill="#fff" opacity=".18" />)}
              <circle cx={x} cy={y} r={r * 0.25} fill={GOLD} opacity=".7" />
            </g>
          ))}
          <path d="M160 250 C 140 300 150 380 175 405 L225 405 C 250 380 260 300 240 250Z" fill={a.c === 2 ? G : P.main === '#FBF6F1' ? '#E9DDD0' : '#F6EDE7'} />
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M${172 + i * 18} 255 C ${165 + i * 18} 320 ${170 + i * 18} 370 ${180 + i * 14} 404`} stroke="#000" strokeOpacity=".07" strokeWidth="3" fill="none" />)}
          <ellipse cx="200" cy="250" rx="40" ry="8" fill="#000" opacity=".12" />
        </g>
      )
    }
    case 'cake':
    case 'drip': {
      if (a.n === 't')
        return (
          <g>
            <ellipse cx="200" cy="330" rx="130" ry="36" fill="#E2C49C" />
            <path d="M70 300 L70 330 A130 36 0 0 0 330 330 L330 300Z" fill="#D4A373" />
            <ellipse cx="200" cy="300" rx="130" ry="36" fill="#E9CFA9" />
            <ellipse cx="200" cy="298" rx="112" ry="28" fill="#F8E9C8" />
            {Array.from({ length: 14 }).map((_, i) => {
              const ang = (i / 14) * Math.PI * 2
              return <circle key={i} cx={200 + Math.cos(ang) * 82} cy={298 + Math.sin(ang) * 18} r={11} fill={['#C9545A', '#F2A65A', '#5B8C5A', '#7A4B8C'][i % 4]} />
            })}
            {[[-20, -4], [20, 4], [0, -10]].map(([dx, dy], i) => <circle key={i} cx={200 + dx} cy={298 + dy} r={12} fill={['#C9545A', '#F2A65A', '#5B8C5A'][i]} />)}
          </g>
        )
      const tiers = a.k === 'drip' ? 1 : a.n === '3' ? 3 : a.n === '2' ? 2 : 1
      const col = a.c === 0 ? '#F7EFE6' : a.c === 4 ? '#5A3A26' : a.c === 3 ? '#B33A45' : a.c === 2 ? '#DDE6D6' : '#F6D9D6'
      const drip = a.c === 4 ? '#3B2418' : a.c === 0 ? G : a.c === 3 ? '#F6EDE7' : a.c === 2 ? '#8DAF7C' : BLUSH
      const els = []
      let y = 390
      for (let i = 0; i < tiers; i++) {
        const w = (a.k === 'drip' ? 200 : 220) - i * 60
        const h = a.k === 'drip' ? 130 : 78
        const x = 200 - w / 2
        y -= h
        els.push(
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={col} />
            <rect x={x} y={y} width={w * 0.18} height={h} fill="#000" opacity=".06" />
            <ellipse cx="200" cy={y + h} rx={w / 2} ry={12} fill={col} />
            <path d={`M${x} ${y} ${Array.from({ length: 8 }).map((_, k) => `Q ${x + (w / 8) * (k + 0.5)} ${y + (k % 2 ? 34 : 22) + (k % 3) * 6} ${x + (w / 8) * (k + 1)} ${y}`).join(' ')} Z`} fill={drip} />
            <ellipse cx="200" cy={y} rx={w / 2} ry={12} fill={drip} />
            {a.c === 0 && <path d={`M${x} ${y + h - 14} L ${x + w} ${y + h - 14}`} stroke={GOLD} strokeWidth="5" />}
          </g>,
        )
      }
      const topY = y
      return (
        <g>
          <ellipse cx="200" cy="398" rx="140" ry="18" fill="#fff" opacity=".9" />
          <path d="M80 398 L80 406 A120 18 0 0 0 320 406 L320 398Z" fill="#E8DCD0" />
          {els}
          {a.k === 'drip' ? (
            <g>
              {[[150, -14, BLUSH], [180, -22, CREAM], [215, -20, GOLD], [248, -12, BLUSH]].map(([x, dy, c], i) => <Macaron key={i} x={x as number} y={topY + (dy as number)} w={34} c={c as string} />)}
              {[[165, -4], [232, -4], [198, -6]].map(([x, dy], i) => <circle key={i} cx={x} cy={topY + dy} r={7} fill="#B3263A" />)}
            </g>
          ) : a.n === '2' && a.c === 0 ? (
            <g transform={`translate(200 ${topY - 10})`}>
              <path d="M-36 0 L0 -14 L36 0 L0 14Z" fill={G} />
              <rect x="-16" y="0" width="32" height="12" fill={G} />
              <path d="M30 2 L 36 26" stroke={GOLD} strokeWidth="3" /><circle cx="36" cy="28" r="4" fill={GOLD} />
            </g>
          ) : a.n === '1' && a.c === 3 ? (
            <g>{[[-18, 0], [18, 0]].map(([dx], i) => <ellipse key={i} cx={200 + dx} cy={topY - 2} rx="9" ry="14" fill="#fff" opacity=".9" />)}</g>
          ) : (
            <g>
              {[170, 200, 230].map((x, i) => (
                <g key={i}>
                  <rect x={x - 3} y={topY - 40} width="6" height="36" rx="2" fill={i === 1 ? GOLD : CREAM} stroke="#0002" />
                  <path d={`M${x} ${topY - 56} q 7 9 0 14 q -7 -5 0 -14`} fill="#F2A65A" />
                </g>
              ))}
              {tiers > 1 && [[-40, 6], [40, 6]].map(([dx, dy], i) => <Rose key={i} x={200 + dx} y={topY + dy} r={13} c={BLUSH} d="#0003" />)}
            </g>
          )}
        </g>
      )
    }
    case 'cupcakes': {
      const tops = a.c === 4 ? ['#5A3A26', '#F6EDE7', '#D4A373', '#E89B9A', '#5A3A26'] : [BLUSH, CREAM, '#F2C3C2', GOLD, BLUSH]
      const pos: [number, number][] = [[150, 270], [250, 270], [100, 330], [200, 335], [300, 330]]
      return (
        <g>
          {pos.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M-36 0 L36 0 L28 56 L-28 56Z" fill={a.c === 4 ? GOLD : i % 2 ? G : '#F7EFE6'} />
              {[-24, -12, 0, 12, 24].map((dx) => <path key={dx} d={`M${dx} 0 L ${dx * 0.78} 56`} stroke="#0001" strokeWidth="3" />)}
              <ellipse cy="-4" rx="42" ry="16" fill={tops[i]} />
              <ellipse cy="-20" rx="32" ry="14" fill={tops[i]} />
              <ellipse cy="-34" rx="20" ry="11" fill={tops[i]} />
              <ellipse cx="-10" cy="-24" rx="10" ry="5" fill="#fff" opacity=".35" />
              <circle cy="-46" r="7" fill="#B3263A" />
            </g>
          ))}
        </g>
      )
    }
    case 'pralines': {
      const box = a.c === 0 ? G : a.c === 1 ? BLUSH : a.c === 2 ? '#EADBC8' : a.c === 3 ? '#E7CBB9' : '#5A3A26'
      const cols = ['#3B2418', '#6E4528', '#F3E3CF', '#C98F5E', BLUSH, '#2A1810']
      return (
        <g>
          <path d="M95 120 L305 120 L322 230 L78 230Z" fill={box} />
          <path d="M95 120 L305 120 L322 230 L78 230Z" fill="#fff" opacity=".1" />
          {a.c !== 1 && <Star4 x={200} y={170} s={2.2} c={GOLD} />}
          {a.c === 1 && <path d="M200 205 C 160 175 170 140 200 160 C 230 140 240 175 200 205Z" fill="#fff" opacity=".7" />}
          <rect x="70" y="230" width="260" height="170" rx="10" fill={box} />
          <rect x="82" y="242" width="236" height="146" rx="6" fill="#000" opacity=".25" />
          {Array.from({ length: 12 }).map((_, i) => {
            const cx = 112 + (i % 4) * 58, cy = 272 + Math.floor(i / 4) * 44
            const c = cols[(i * 5) % 6]
            return (
              <g key={i}>
                <circle cx={cx} cy={cy + 3} r="19" fill="#000" opacity=".25" />
                {i % 3 === 1 ? <rect x={cx - 18} y={cy - 18} width="36" height="36" rx="8" fill={c} /> : <circle cx={cx} cy={cy} r="19" fill={c} />}
                {i % 2 === 0 ? <path d={`M${cx - 12} ${cy - 4} q 6 -6 12 0 t 12 0`} stroke={GOLD} strokeWidth="2.5" fill="none" /> : <circle cx={cx + 5} cy={cy - 6} r="4" fill={GOLD} />}
                <circle cx={cx - 7} cy={cy - 8} r="4" fill="#fff" opacity=".22" />
              </g>
            )
          })}
        </g>
      )
    }
    case 'bar':
      return (
        <g>
          {[0, 1, 2].map((i) => {
            const y = 330 - i * 58, x = 95 + i * 10
            const wrap = [G, BLUSH, GOLD][i]
            return (
              <g key={i} transform={`rotate(${-4 + i * 3} 200 ${y})`}>
                <rect x={x} y={y} width={210} height={52} rx="6" fill="#4A2C1C" />
                {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={x + 8 + k * 40} y={y + 7} width="34" height="38" rx="3" fill="#5C3A26" />)}
                <rect x={x + 60} y={y - 2} width={150} height={56} rx="4" fill={wrap} />
                <text x={x + 135} y={y + 33} textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="15" fill={i === 0 ? GOLD : G} letterSpacing="1">{a.n && i === 2 ? a.n : ['٧٠٪', 'فستق', 'ورد'][i]}</text>
                {Array.from({ length: 6 }).map((_, k) => <Star4 key={k} x={x + 72 + k * 25} y={y + 8} s={0.35} c={i === 0 ? GOLD : '#fff'} />)}
              </g>
            )
          })}
        </g>
      )
    case 'dates':
      return (
        <g>
          <ellipse cx="200" cy="320" rx="160" ry="62" fill={a.c === 2 ? '#B98A5E' : '#7A5235'} />
          <ellipse cx="200" cy="310" rx="160" ry="62" fill={a.c === 2 ? '#D4A373' : '#9C6B47'} />
          <ellipse cx="200" cy="306" rx="140" ry="50" fill={a.c === 2 ? '#E2BC92' : '#B38058'} />
          {Array.from({ length: 13 }).map((_, i) => {
            const ang = (i / 13) * Math.PI * 2, rr = i < 9 ? 95 : 40
            const cx = 200 + Math.cos(ang * (i < 9 ? 1 : 2.2)) * rr, cy = 304 + Math.sin(ang * (i < 9 ? 1 : 2.2)) * rr * 0.36
            return (
              <g key={i} transform={`rotate(${i * 27} ${cx} ${cy})`}>
                <ellipse cx={cx} cy={cy} rx="24" ry="13" fill={i % 3 === 0 ? '#2A1810' : '#5B3216'} />
                {i % 3 === 0 && <path d={`M${cx - 14} ${cy - 3} q 7 6 14 0 t 14 0`} stroke={GOLD} strokeWidth="2" fill="none" />}
                {i % 3 === 1 && <ellipse cx={cx} cy={cy - 6} rx="10" ry="4" fill="#E9D7B8" />}
                <ellipse cx={cx - 8} cy={cy - 5} rx="7" ry="3" fill="#fff" opacity=".2" />
              </g>
            )
          })}
        </g>
      )
    case 'cluster': {
      const cols = a.n === 'n' ? [G, '#fff', G, '#2A6B5A', '#fff', G, '#F7F2EA'] : a.c === 0 ? [G, GOLD, CREAM, '#1A5546', GOLD, G, '#fff'] : a.c === 3 ? ['#F2C3C2', '#CFE0D8', CREAM, '#F7D9B5', '#F2C3C2', '#E4D4F0', '#fff'] : [BLUSH, GOLD, CREAM, '#F2C3C2', '#D9807F', GOLD, '#fff']
      const pts: [number, number, number][] = [[200, 120, 44], [140, 150, 40], [262, 148, 42], [168, 205, 40], [236, 208, 41], [110, 220, 34], [292, 222, 34]]
      return (
        <g>
          {pts.map(([x, y, r], i) => <Balloon key={i} id={id} x={x} y={y} r={r} c={cols[i]} sx={200} sy={395} />)}
          <path d="M184 395 L216 395 L210 420 L190 420Z" fill={a.c === 0 || a.n === 'n' ? GOLD : G} />
          <ellipse cx="200" cy="395" rx="16" ry="4" fill={a.c === 0 || a.n === 'n' ? '#E6C6A4' : '#1A5546'} />
        </g>
      )
    }
    case 'number': {
      const n = a.n ?? '1'
      const fill = a.c === 2 ? `url(#${id}-gold)` : `url(#${id}-silver)`
      return (
        <g>
          <Balloon id={id} x={95} y={150} r={26} c={a.c === 2 ? BLUSH : CREAM} sx={140} sy={410} />
          <Balloon id={id} x={315} y={170} r={24} c={a.c === 2 ? CREAM : GOLD} sx={260} sy={410} />
          <text x="200" y="345" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontWeight="700" fontSize={n.length > 1 ? 210 : 260} fill={fill} stroke={a.c === 2 ? '#B07E4F' : '#BBA894'} strokeWidth="3" letterSpacing="-12">{n}</text>
          <text x="200" y="345" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontWeight="700" fontSize={n.length > 1 ? 210 : 260} fill="#fff" opacity=".18" letterSpacing="-12" transform="translate(-6 -6)">{n}</text>
        </g>
      )
    }
    case 'heart':
      return (
        <g>
          <path d="M200 260 Q 190 330 205 410" stroke="#8C7A6B" strokeWidth="1.5" fill="none" />
          <path d="M200 270 C 80 200 90 90 160 90 C 185 90 198 108 200 122 C 202 108 215 90 240 90 C 310 90 320 200 200 270Z" fill={`url(#${id}-heart)`} />
          <path d="M140 120 C 125 130 120 150 126 168" stroke="#fff" strokeOpacity=".5" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M190 405 L220 405 L214 428 L196 428Z" fill={G} />
        </g>
      )
    case 'arch': {
      const cols = a.c === 2 ? [CREAM, GOLD, '#fff', '#E6C6A4'] : a.c === 3 ? ['#F2C3C2', CREAM, '#CFE0D8', '#fff'] : [BLUSH, CREAM, GOLD, '#F2C3C2']
      const balls = []
      for (let i = 0; i < 26; i++) {
        const t = Math.PI - (i / 25) * Math.PI
        const r = 14 + ((i * 7) % 4) * 5
        balls.push(<g key={i}><circle cx={200 + Math.cos(t) * 128} cy={330 - Math.sin(t) * 170} r={r} fill={cols[i % 4]} /><circle cx={200 + Math.cos(t) * 128 - r * 0.35} cy={330 - Math.sin(t) * 170 - r * 0.35} r={r * 0.25} fill="#fff" opacity=".4" /></g>)
      }
      return (
        <g>
          <path d="M100 400 L100 230 A100 100 0 0 1 300 230 L300 400Z" fill={a.c === 2 ? G : '#F7EFE6'} />
          <path d="M120 400 L120 236 A80 80 0 0 1 280 236 L280 400Z" fill="#fff" opacity=".12" />
          <text x="200" y="290" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="26" fill={a.c === 2 ? GOLD : G}>{a.c === 2 ? 'أهلاً' : 'فرحة'}</text>
          <text x="200" y="316" textAnchor="middle" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="18" fill={a.c === 2 ? CREAM : COCOA}>celebrate</text>
          {balls}
          {[[80, 300], [100, 200], [300, 205], [322, 300]].map(([x, y], i) => <g key={i}><Leaf x={x} y={y} a={i * 60} /><Rose x={x} y={y} r={14} c={i % 2 ? CREAM : BLUSH} d="#0003" /></g>)}
          <rect x="150" y="360" width="100" height="40" rx="4" fill={GOLD} />
        </g>
      )
    }
    case 'lantern':
      return (
        <g>
          {[[130, 150, 0.85], [200, 110, 1.1], [272, 160, 0.8]].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <line x1="0" y1="-120" x2="0" y2="-60" stroke={COCOA} strokeWidth="2" />
              <circle cx="0" cy="40" r="80" fill={`url(#${id}-glow)`} />
              <path d="M-14 -60 L14 -60 L22 -40 L-22 -40Z" fill={a.c === 0 ? G : GOLD} />
              <path d="M-30 -40 L30 -40 L38 60 L-38 60Z" fill="#F8D9A0" />
              <path d="M-30 -40 L30 -40 L38 60 L-38 60Z" fill={a.c === 0 ? G : '#B07E4F'} opacity=".25" />
              {[-20, 0, 20].map((dx) => <path key={dx} d={`M${dx} -40 L ${dx * 1.25} 60`} stroke={a.c === 0 ? G : '#8C5E3C'} strokeWidth="3" />)}
              <Star4 x={0} y={10} s={1.4} c="#fff" />
              <path d="M-40 60 L40 60 L28 80 L-28 80Z" fill={a.c === 0 ? G : GOLD} />
              <path d="M0 80 L0 100" stroke={GOLD} strokeWidth="3" /><circle cx="0" cy="104" r="5" fill={GOLD} />
            </g>
          ))}
          {a.c === 0 && <path d="M60 330 L340 330" stroke={G} strokeWidth="0" />}
          <rect x="60" y="360" width="280" height="40" rx="4" fill={a.c === 0 ? G : COCOA} opacity=".9" />
          {Array.from({ length: 9 }).map((_, i) => <Star4 key={i} x={80 + i * 30} y={380} s={0.6} c={GOLD} />)}
        </g>
      )
    case 'table':
      return (
        <g>
          <path d="M80 360 L80 150 A120 120 0 0 1 320 150 L320 360Z" fill={a.c === 0 ? G : '#F7EFE6'} />
          <text x="200" y="170" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="22" fill={a.c === 0 ? GOLD : G}>{a.c === 0 ? 'مبروك التخرج' : 'نورة ♡ فيصل'}</text>
          <path d="M60 300 L340 300 L350 400 L50 400Z" fill={a.c === 0 ? '#F6EDE7' : '#fff'} />
          <path d="M60 300 L340 300 L340 312 L60 312Z" fill={GOLD} />
          {[[110, 300], [290, 300]].map(([x, y], i) => (
            <g key={i}>
              <rect x={x - 5} y={y - 60} width="10" height="60" fill={CREAM} stroke="#0002" />
              <path d={`M${x} ${y - 78} q 7 9 0 14 q -7 -5 0 -14`} fill="#F2A65A" />
              <circle cx={x} cy={y - 70} r="18" fill="#F8D9A0" opacity=".35" />
            </g>
          ))}
          <path d="M180 300 L220 300 L212 270 L188 270Z" fill={GOLD} />
          <ellipse cx="200" cy="268" rx="40" ry="6" fill={GOLD} />
          <rect x="168" y="214" width="64" height="52" fill={a.c === 0 ? '#F7EFE6' : '#F6D9D6'} />
          <ellipse cx="200" cy="214" rx="32" ry="7" fill={a.c === 0 ? G : BLUSH} />
          {[[145, 280], [255, 280]].map(([x, y], i) => <g key={i}><Leaf x={x} y={y} a={200 + i * 140} s={0.8} /><Rose x={x} y={y} r={16} c={i ? BLUSH : CREAM} d="#0003" /></g>)}
        </g>
      )
    case 'giftbox': {
      const box = a.c === 0 ? G : a.c === 1 ? BLUSH : a.c === 2 ? '#DDB68C' : a.c === 3 ? '#EFB3B2' : '#6E4528'
      const rib = a.c === 0 || a.c === 4 ? GOLD : a.c === 2 ? G : '#fff'
      return (
        <g>
          {a.n === 'b' && [[150, 110, BLUSH], [205, 80, GOLD], [255, 115, CREAM]].map(([x, y, c], i) => <Balloon key={i} id={id} x={x as number} y={y as number} r={30} c={c as string} sx={200} sy={230} />)}
          {a.n === 'e' && <g transform="rotate(-10 150 200)"><rect x="110" y="170" width="90" height="60" rx="4" fill={GOLD} /><path d="M110 170 L155 205 L200 170" stroke={COCOA} strokeWidth="2" fill="none" /></g>}
          <rect x="105" y="250" width="190" height="150" rx="6" fill={box} />
          <rect x="105" y="250" width="40" height="150" fill="#000" opacity=".06" />
          <rect x="94" y="222" width="212" height="44" rx="6" fill={box} />
          <rect x="94" y="252" width="212" height="14" fill="#000" opacity=".1" />
          <rect x="188" y="222" width="24" height="178" fill={rib} />
          <path d="M200 222 C 150 170 130 220 196 224 M200 222 C 250 170 270 220 204 224" stroke={rib} strokeWidth="14" fill="none" strokeLinecap="round" />
          <circle cx="200" cy="222" r="11" fill={rib} />
          {a.c === 0 && Array.from({ length: 5 }).map((_, i) => <Star4 key={i} x={130 + i * 35} y={330} s={0.5} c={GOLD} />)}
          {a.n === 'm' && <path d="M290 300 q 40 20 30 100 l -40 0Z" fill={CREAM} />}
        </g>
      )
    }
    case 'perfume': {
      const liquid = a.c === 1 ? '#F2B7B3' : a.c === 0 ? '#C9A27E' : '#EAD7BE'
      return (
        <g>
          <rect x="230" y="180" width="110" height="220" rx="6" fill={a.c === 0 ? G : a.c === 1 ? '#F6E1DC' : '#F7EFE6'} />
          <text x="285" y="300" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="13" letterSpacing="3" fill={a.c === 0 ? GOLD : G}>LAMMA</text>
          <rect x="166" y="170" width="68" height="40" rx="6" fill={GOLD} />
          <rect x="182" y="150" width="36" height="26" rx="4" fill="#B07E4F" />
          <path d="M120 214 L280 214 L292 380 Q 200 410 108 380Z" fill={liquid} opacity=".85" />
          <path d="M120 214 L280 214 L292 380 Q 200 410 108 380Z" fill={`url(#${id}-glass)`} />
          <path d="M132 230 L148 370" stroke="#fff" strokeOpacity=".6" strokeWidth="8" strokeLinecap="round" />
          <rect x="150" y="270" width="100" height="56" rx="3" fill="#fff" opacity=".85" />
          <text x="200" y="296" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="15" fill={G}>{a.c === 1 ? 'ورد الطائف' : a.c === 0 ? 'ليالي نجد' : 'باسمك'}</text>
          <text x="200" y="315" textAnchor="middle" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="12" fill={COCOA}>eau de parfum</text>
        </g>
      )
    }
    case 'candle':
      return (
        <g>
          <circle cx="200" cy="200" r="90" fill={`url(#${id}-glow)`} />
          <path d="M200 170 q 16 22 0 38 q -16 -16 0 -38" fill="#F2A65A" />
          <path d="M200 186 q 7 10 0 18 q -7 -8 0 -18" fill="#FCE3A8" />
          <line x1="200" y1="206" x2="200" y2="226" stroke="#3B2418" strokeWidth="3" />
          <ellipse cx="200" cy="230" rx="88" ry="20" fill={a.c === 4 ? '#3B2418' : '#EFE3D3'} />
          <path d="M112 230 L118 380 Q 200 405 282 380 L288 230 Q 200 252 112 230Z" fill={a.c === 4 ? '#5A3A26' : '#D9CFC4'} />
          <path d="M112 230 L118 380 Q 140 390 160 394 L156 248Z" fill="#000" opacity=".08" />
          <rect x="140" y="290" width="120" height="44" rx="2" fill={a.c === 4 ? GOLD : G} />
          <text x="200" y="318" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="15" fill={a.c === 4 ? '#3B2418' : CREAM}>{a.c === 4 ? 'بخور' : 'ياسمين وعود'}</text>
        </g>
      )
    case 'macarons': {
      const cols = a.c === 3 ? [BLUSH, '#F2C3C2', CREAM, '#D9807F'] : [BLUSH, '#B9D3A8', GOLD, CREAM, '#C9A0DC', '#F2C3C2']
      return (
        <g>
          <ellipse cx="200" cy="395" rx="130" ry="16" fill="#fff" />
          {a.c === 3
            ? Array.from({ length: 6 }).map((_, row) => Array.from({ length: 6 - row }).map((__, i) => <Macaron key={`${row}-${i}`} x={200 - ((5 - row) * 44) / 2 + i * 44} y={360 - row * 44} w={42} c={cols[(i + row) % 4]} />))
            : Array.from({ length: 12 }).map((_, i) => <Macaron key={i} x={110 + (i % 4) * 60 + (Math.floor(i / 4) % 2) * 30} y={350 - Math.floor(i / 4) * 52} w={56} c={cols[i % 6]} />)}
        </g>
      )
    }
    case 'kunafa':
      return (
        <g>
          <ellipse cx="200" cy="320" rx="150" ry="58" fill={a.c === 2 ? '#C0C4C0' : '#B9B4AE'} />
          <ellipse cx="200" cy="310" rx="150" ry="58" fill="#E3E0DB" />
          <ellipse cx="200" cy="306" rx="132" ry="48" fill={a.c === 2 ? '#E9C88F' : '#E07B2A'} />
          {a.c !== 2 && Array.from({ length: 40 }).map((_, i) => <path key={i} d={`M${100 + (i * 37) % 200} ${280 + (i * 13) % 50} q 6 -4 12 0`} stroke="#B95A16" strokeWidth="2" fill="none" />)}
          {a.c === 2 && Array.from({ length: 4 }).map((_, i) => <path key={i} d={`M${120 + i * 50} 270 L ${100 + i * 55} 340`} stroke="#C9A06A" strokeWidth="2" />)}
          {Array.from({ length: 30 }).map((_, i) => <circle key={i} cx={130 + (i * 53) % 140} cy={285 + (i * 29) % 42} r="3.5" fill="#7FA65A" />)}
          <path d="M200 306 L332 306 A132 48 0 0 1 300 338Z" fill="#fff" opacity=".85" />
          <path d="M310 250 L330 240" stroke="#D4A373" strokeWidth="0" />
        </g>
      )
    case 'cookies':
      return (
        <g>
          <rect x="80" y="250" width="240" height="150" rx="10" fill={a.c === 4 ? G : '#F7EFE6'} />
          <rect x="92" y="262" width="216" height="126" rx="6" fill="#000" opacity=".12" />
          {Array.from({ length: 9 }).map((_, i) => {
            const cx = 125 + (i % 3) * 75, cy = 292 + Math.floor(i / 3) * 0 + (i > 2 ? 40 * Math.floor(i / 3) : 0)
            return (
              <g key={i}>
                <circle cx={cx} cy={cy - (i > 5 ? 0 : 0)} r="28" fill={a.c === 4 ? (i % 2 ? '#E9C88F' : '#F1D9A8') : ['#C98F5E', '#E2B57E', '#5A3A26'][i % 3]} />
                {a.c === 4 ? <Star4 x={cx} y={cy} s={1.3} c="#B07E4F" /> : [0, 1, 2, 3].map((k) => <circle key={k} cx={cx - 12 + ((k * 17) % 24)} cy={cy - 10 + ((k * 11) % 20)} r="3.5" fill={i % 3 === 2 ? '#F6EDE7' : '#3B2418'} />)}
              </g>
            )
          })}
          <path d="M80 250 L320 250 L300 200 L100 200Z" fill={a.c === 4 ? '#1A5546' : BLUSH} opacity=".9" />
        </g>
      )
    case 'mug':
      return (
        <g>
          <path d="M290 250 C 350 250 350 340 285 340" stroke={a.c === 0 ? G : '#F6D9D6'} strokeWidth="20" fill="none" />
          <path d="M120 200 L290 200 L280 390 Q 205 410 130 390Z" fill={a.c === 0 ? G : '#F6D9D6'} />
          <ellipse cx="205" cy="200" rx="85" ry="16" fill={a.c === 0 ? '#1A5546' : '#EBC2C0'} />
          <ellipse cx="205" cy="202" rx="74" ry="11" fill="#5A3A26" />
          <path d="M130 210 L140 380" stroke="#fff" strokeOpacity=".15" strokeWidth="12" />
          <text x="205" y="310" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize={a.c === 3 ? 32 : 40} fill={a.c === 0 ? GOLD : G}>{a.c === 3 ? 'ليان' : 'سارة'}</text>
          <Star4 x={205} y={345} s={0.9} c={a.c === 0 ? GOLD : BLUSH} />
          {[0, 1, 2].map((i) => <path key={i} d={`M${180 + i * 22} 180 q 10 -20 0 -40 q -10 -20 0 -40`} stroke="#fff" strokeWidth="4" fill="none" opacity=".6" />)}
        </g>
      )
    case 'frame':
      return (
        <g>
          <rect x="95" y="110" width="210" height="270" rx="4" fill={a.c === 0 ? G : '#9C6B47'} />
          <rect x="112" y="127" width="176" height="236" fill="#F8F1EA" />
          {a.c === 0 ? (
            <g>
              <text x="200" y="230" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="38" fill={G}>بيت العز</text>
              <path d="M140 255 Q 200 275 260 255" stroke={GOLD} strokeWidth="2" fill="none" />
              <Star4 x={200} y={290} s={1.4} c={GOLD} />
            </g>
          ) : (
            <g>
              <path d="M124 350 L124 230 A76 76 0 0 1 276 230 L276 350Z" fill="#EADBCC" />
              <circle cx="235" cy="205" r="18" fill={GOLD} />
              <path d="M124 350 L170 280 L205 320 L235 290 L276 340 L276 350Z" fill={G} opacity=".8" />
              <text x="200" y="345" textAnchor="middle" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="14" fill={CREAM}>2026 · ♡</text>
            </g>
          )}
          <path d="M200 380 L200 400" stroke="#0002" />
        </g>
      )
    case 'engraved':
      return a.c === 0 ? (
        <g>
          <rect x="105" y="200" width="190" height="140" rx="16" fill="#3B2418" />
          <rect x="105" y="200" width="190" height="70" rx="16" fill="#4A2C1C" />
          <path d="M105 270 L295 270" stroke="#2A1810" strokeWidth="3" />
          <path d="M120 215 L280 215 L280 325 L120 325Z" fill="none" stroke="#6E4528" strokeDasharray="4 4" strokeWidth="2" />
          <text x="200" y="305" textAnchor="middle" fontFamily="Cormorant Garamond" fontSize="30" fill={GOLD} letterSpacing="4">A·M</text>
        </g>
      ) : (
        <g>
          <path d="M90 220 L310 220 L310 390 L90 390Z" fill={a.c === 3 ? '#E9D3C3' : '#8A5A38'} />
          <path d="M90 220 L310 220 L310 390 L90 390Z" fill={`url(#${id}-wood)`} />
          <path d="M80 180 L320 180 L320 230 L80 230Z" fill={a.c === 3 ? '#F1E1D5' : '#9C6B47'} />
          <path d="M80 222 L320 222 L320 232 L80 232Z" fill="#000" opacity=".15" />
          <g opacity=".8">
            <Star4 x={200} y={290} s={2.4} c={a.c === 3 ? COCOA : '#5A3A26'} />
            <text x="200" y="352" textAnchor="middle" fontFamily="Readex Pro, sans-serif" fontSize="20" fill={a.c === 3 ? COCOA : '#4A2C1C'}>نورة وفيصل</text>
            <text x="200" y="374" textAnchor="middle" fontFamily="Cormorant Garamond" fontSize="13" fill={a.c === 3 ? COCOA : '#4A2C1C'} letterSpacing="3">14 · 02 · 2026</text>
          </g>
          <rect x="190" y="225" width="20" height="14" rx="2" fill={GOLD} />
        </g>
      )
  }
}

/**
 * view: 0 hero shot · 1 close-up · 2 flat-lay pattern set · 3 lifestyle shelf
 */
/** Real product photograph. view: 0 hero · 1 close detail · 2 full product on cream · 3 alternate framing */
function Photo({ art, view, className, label, sizes, eager }: { art: Art; view: number; className: string; label?: string; sizes?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  const packshot = art.fit === 'contain'
  const contain = packshot || view === 2
  const style: React.CSSProperties =
    view === 1 ? { transform: 'scale(1.55)', transformOrigin: art.pos ?? '50% 45%', objectPosition: art.pos } : view === 3 ? { objectPosition: art.pos ?? '50% 30%', transform: 'scale(1.18)' } : { objectPosition: art.pos }
  if (failed) return <div className={`relative grid place-items-center overflow-hidden bg-cream text-xs text-ink/40 ${className}`} role="img" aria-label={label}>LAMMA</div>
  return (
    <div className={`relative overflow-hidden ${packshot || view === 2 ? 'bg-[#F4EDE6]' : 'bg-cream'} ${className}`}>
      <img
        src={`products/${art.img}.webp`}
        srcSet={`products/${art.img}-sm.webp 600w, products/${art.img}.webp 1200w`}
        sizes={sizes ?? '(max-width: 768px) 50vw, 25vw'}
        alt={label ?? ''}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        className={`absolute inset-0 h-full w-full ${contain ? `object-contain ${packshot ? 'p-[9%] mix-blend-multiply' : 'p-[6%]'}` : 'object-cover'}`}
        style={style}
      />
    </div>
  )
}

export const ProductArt = memo(function ProductArt({ art, view = 0, className = '', label, sizes, eager }: { art: Art; view?: number; className?: string; label?: string; sizes?: string; eager?: boolean }) {
  if (art.img) return <Photo art={art} view={view} className={className} label={label} sizes={sizes} eager={eager} />
  return <Illustration art={art} view={view} className={className} label={label} />
})

function Illustration({ art, view = 0, className = '', label }: { art: Art; view?: number; className?: string; label?: string }) {
  const raw = useId().replace(/:/g, '')
  const id = `a${raw}`
  const P = PALS[art.c] ?? PALS[0]
  const zoom = view === 1 ? 'translate(200 260) scale(1.45) translate(-200 -260)' : view === 3 ? 'translate(200 300) scale(.78) translate(-200 -300)' : ''
  return (
    <svg viewBox="0 0 400 480" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor={view === 2 ? P.bg2 : P.bg1} />
          <stop offset="1" stopColor={view === 2 ? P.bg1 : P.bg2} />
        </radialGradient>
        <radialGradient id={`${id}-gloss`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#FCE3A8" stopOpacity=".9" />
          <stop offset="1" stopColor="#FCE3A8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3D9B1" /><stop offset=".5" stopColor="#D4A373" /><stop offset="1" stopColor="#B07E4F" />
        </linearGradient>
        <linearGradient id={`${id}-silver`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset=".5" stopColor="#EADFD3" /><stop offset="1" stopColor="#CDBDAD" />
        </linearGradient>
        <linearGradient id={`${id}-heart`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2B7B3" /><stop offset="1" stopColor="#C9706F" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".1" /><stop offset=".3" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".05" />
        </linearGradient>
        <pattern id={`${id}-pat`} width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M28 20 C 29 25 31 27 36 28 C 31 29 29 31 28 36 C 27 31 25 29 20 28 C 25 27 27 25 28 20Z" fill={P.accent} opacity=".16" />
          <circle cx="0" cy="0" r="2" fill={P.accent} opacity=".2" /><circle cx="56" cy="0" r="2" fill={P.accent} opacity=".2" />
          <circle cx="0" cy="56" r="2" fill={P.accent} opacity=".2" /><circle cx="56" cy="56" r="2" fill={P.accent} opacity=".2" />
        </pattern>
      </defs>
      <rect width="400" height="480" fill={`url(#${id}-bg)`} />
      {view === 2 && <rect width="400" height="480" fill={`url(#${id}-pat)`} />}
      {view !== 2 && <path d="M70 480 L70 170 A130 130 0 0 1 330 170 L330 480Z" fill="#fff" opacity={view === 3 ? 0.18 : 0.32} />}
      {view === 3 && (
        <g>
          <rect x="0" y="390" width="400" height="90" fill={P.set} />
          <rect x="0" y="388" width="400" height="4" fill="#fff" opacity=".6" />
          <g transform="translate(330 330)"><rect x="-14" y="0" width="28" height="60" rx="4" fill="#fff" opacity=".7" /><Leaf x={0} y={0} a={-80} s={0.8} /><Leaf x={0} y={4} a={-110} s={0.7} /></g>
        </g>
      )}
      <ellipse cx="200" cy="412" rx="150" ry="18" fill="#3B2418" opacity=".12" />
      <g transform={zoom}>
        <Body a={art} P={P} id={id} />
      </g>
    </svg>
  )
}
