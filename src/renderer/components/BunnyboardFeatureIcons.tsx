import type { JSX } from 'react'

const MARK = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** A conversation being watched, shared by the rail and the page seal. */
export function MeanwhileIcon(): JSX.Element {
  return <svg {...MARK}>
    <path d="M13 14H7l-4 3V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M9 17v1a2 2 0 0 0 2 2h6l4 2V11a2 2 0 0 0-2-2h-2"/>
    <path d="m10 6 3 2-3 2Z"/>
  </svg>
}

/** A masked hare and separate quill, shared by the column's tab and seal. */
export function WhisperIcon(): JSX.Element {
  return <svg {...MARK} viewBox="0 0 64 64" strokeWidth={2.7}>
    <path d="M16 27C12 19 10 8 14 6C18 4 21 16 23 25C24 15 27 4 31 6C36 8 32 20 30 27C36 30 39 35 39 41C39 49 33 55 24 55C15 55 9 49 9 41C9 35 11 30 16 27Z"/>
    <path d="M14 36C18 33 21 34 24 36C27 34 31 33 34 36L33 41C31 44 28 44 24 41C20 44 17 44 15 41Z"/>
    <path d="m18 37 2 1m8 0 2-1M20 48c3 2 8 1 10-2"/>
    <path d="M45 47C43 33 50 21 59 17C60 31 54 41 45 47ZM40 60l15-36m-7 15 7-4"/>
  </svg>
}
