import type { Outline } from './types'

// Second-generation 3000GT (1994–96): long low nose, fixed projector
// headlights, side scoop ahead of the rear wheel, rear wing on two posts.
// Flat shapes only; no badges.
// TODO(reference): refine against design/reference/3000gt-gen2.png once it is in the repo.

const TOP =
  'M18 112 C14 106 15 97 21 92 C27 86 37 82 50 80 L150 68 L164 66 ' + // nose, hood, cowl
  'L204 40 C209 36 216 34 226 34 L254 35 C264 36 272 39 280 43 ' + // windshield, roof
  'L344 63 L374 65 C381 66 385 70 385 76 L384 102 C384 112 380 118 370 119 ' // fastback, deck, tail

export const gen2: Outline = {
  body: TOP + 'L323 119 A25 29 0 0 0 273 119 L131 119 A25 29 0 0 0 81 119 L26 119 C20 119 18 116 18 112 Z',
  shell: TOP + 'L26 119 C20 119 18 116 18 112 Z',
  wells: 'M323 119 A25 29 0 0 0 273 119 Z M131 119 A25 29 0 0 0 81 119 Z',
  glass:
    // door glass, then rear quarter glass
    'M172 64 L206 42 C210 39 215 38 222 38 L246 38 L246 62 Z ' +
    'M250 38 L253 38 C262 39 269 42 276 46 L300 58 L250 62 Z',
  lines:
    'M168 68 L170 118 ' + // front door cut
    'M258 63 L262 118 ' + // rear door cut
    'M170 92 L258 90 ' + // body side crease
    'M20 100 L60 99 ' + // front bumper seam
    'M346 63 L348 70 ' + // hatch shut line
    'M384 94 L360 96', // rear bumper seam
  dark:
    'M266 84 L282 80 L283 93 L268 94 Z ' + // side scoop ahead of rear wheel
    'M22 105 L52 104 L50 110 L24 111 Z', // front lower intake
  lights: 'M26 90 C32 86 41 84 54 83 L53 87 C43 88 34 90 27 93 Z',
  tails: 'M380 72 L385 73 L385 86 L381 86 Z',
  extras:
    // wing plank and posts
    'M334 51 L384 53 L384 57 L336 56 Z M346 56 L349 56 L350 64 L347 64 Z M372 57 L375 57 L375 66 L372 66 Z',
}
