import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toCsv } from './csv'

test('quotes, escapes and defuses formulas', () => {
  assert.equal(toCsv(['a', 'b'], [['x, y', 'say "hi"'], ['=SUM(A1)', -5]]), 'a,b\r\n"x, y","say ""hi"""\r\n\'=SUM(A1),-5\r\n')
})
