import { describe, expect, it } from 'vitest'
import type { Finding } from '../api/types'
import { bboxToPercent, groupFindings, segmentText, sourceKind } from './findings'

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'finding-1',
    type: 'OTHER',
    source: ['regex'],
    text: 'x',
    display: 'x',
    risk: 'LOW',
    reason: '',
    confidence: null,
    visually_hidden: false,
    page: 1,
    bbox: [0, 0, 1, 1],
    locations: [{ page: 1, bbox: [0, 0, 1, 1], visually_hidden: false }],
    ...overrides,
  }
}

describe('bboxToPercent', () => {
  it('maps PDF points to percentages of the page', () => {
    expect(bboxToPercent([61.2, 79.2, 306, 158.4], 612, 792)).toEqual({
      left: '10%',
      top: '10%',
      width: '40%',
      height: '10%',
    })
  })

  it('clamps padding to the page edges', () => {
    const style = bboxToPercent([0, 0, 612, 792], 612, 792, 4)
    expect(style).toEqual({ left: '0%', top: '0%', width: '100%', height: '100%' })
  })
})

describe('segmentText', () => {
  const account = finding({ id: 'a', text: '987654321012' })
  const email = finding({ id: 'e', text: 'jo@example.com' })

  it('marks every occurrence of each value', () => {
    const segments = segmentText('Acct 987654321012\nMail jo@example.com\nAgain 987654321012', [account, email])
    expect(segments.map((s) => [s.text, s.finding?.id])).toEqual([
      ['Acct ', undefined],
      ['987654321012', 'a'],
      ['\nMail ', undefined],
      ['jo@example.com', 'e'],
      ['\nAgain ', undefined],
      ['987654321012', 'a'],
    ])
  })

  it('prefers the longer value when matches overlap', () => {
    const short = finding({ id: 's', text: '4321' })
    const segments = segmentText('No. 987654321012', [short, account])
    expect(segments.map((s) => s.finding?.id)).toEqual([undefined, 'a'])
  })

  it('returns plain text when nothing matches', () => {
    expect(segmentText('nothing here', [account])).toEqual([{ text: 'nothing here' }])
  })
})

describe('groupFindings', () => {
  it('orders groups by highest risk and keeps backend order inside a group', () => {
    const groups = groupFindings([
      finding({ id: '1', type: 'EMAIL', risk: 'MEDIUM' }),
      finding({ id: '2', type: 'ACCOUNT_NUMBER', risk: 'HIGH' }),
      finding({ id: '3', type: 'EMAIL', risk: 'MEDIUM' }),
    ])
    expect(groups.map((g) => [g.type, g.findings.map((f) => f.id)])).toEqual([
      ['ACCOUNT_NUMBER', ['2']],
      ['EMAIL', ['1', '3']],
    ])
  })
})

describe('sourceKind', () => {
  it('classifies detection sources', () => {
    expect(sourceKind(finding({ source: ['regex', 'gemini'] }))).toBe('both')
    expect(sourceKind(finding({ source: ['gemini'] }))).toBe('gemini')
    expect(sourceKind(finding({ source: ['regex'] }))).toBe('regex')
  })
})
