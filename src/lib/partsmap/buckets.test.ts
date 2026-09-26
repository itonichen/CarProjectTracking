import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bucketOf, countBuckets, describeCounts, type StatusInfo } from './buckets'

const statuses = new Map<string, StatusInfo>([
  ['bought', { category: 'have', at_builder: false }],
  ['shipped', { category: 'have', at_builder: true }],
])

test('categories and the at-builder flag decide the bucket', () => {
  assert.equal(bucketOf({ build_status: 'installed', status_id: null }, statuses), 'built')
  assert.equal(bucketOf({ build_status: 'have', status_id: 'shipped' }, statuses), 'shipped')
  assert.equal(bucketOf({ build_status: 'have', status_id: 'bought' }, statuses), 'bought')
  assert.equal(bucketOf({ build_status: 'sourcing', status_id: null }, statuses), 'need')
})

test('counts add up to the total', () => {
  const c = countBuckets(
    [
      { build_status: 'installed', status_id: null },
      { build_status: 'have', status_id: 'shipped' },
      { build_status: 'needed', status_id: null, needs_review: true },
      { build_status: 'needed', status_id: null },
    ],
    statuses,
  )
  assert.deepEqual(c, { built: 1, shipped: 1, bought: 0, need: 2, total: 4, review: 1 })
  assert.equal(c.built + c.shipped + c.bought + c.need, c.total)
  assert.equal(describeCounts('Engine', c), 'Engine: 1 built, 1 shipped, 0 bought, 2 to buy')
})
