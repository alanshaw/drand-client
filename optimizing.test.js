import test from 'ava'
import HTTP from './http.js'
import Optimizing from './optimizing.js'
import fetch from 'node-fetch'
import AbortController from 'abort-controller'
import Mock from './mock.js'

global.fetch = fetch
global.AbortController = AbortController

const TESTNET_CHAIN_HASH = '84b2234fb34e835dccd048255d7ad3194b81af7d978c3bf157e3469592ae4e02'
const TESTNET_URLS = [
  // 'http://pl-eu.testnet.drand.sh',
  'http://pl-us.testnet.drand.sh',
  // 'http://pl-sin.testnet.drand.sh'
]

test('should get randomness from working client', async t => {
  const info = await HTTP.info(TESTNET_URLS[0], TESTNET_CHAIN_HASH)

  const faultyClient = {
    async get () {
      throw new Error('boom')
    }
  }

  const client = new Optimizing([faultyClient, new HTTP(TESTNET_URLS[0], info)])
  t.deepEqual((await client.get(1)).round, 1)
})

test('should fail to get randomness if all clients fail', async t => {
  let calls = 0
  const faultyClient = () => ({
    async get () {
      calls++
      throw new Error('boom')
    }
  })

  const client = new Optimizing([faultyClient(), faultyClient()])
  const err = await t.throwsAsync(client.get(1))
  t.is(err.message, 'boom')
  t.is(calls, 2)
})

test('should get info from working client', async t => {
  const info = await HTTP.info(TESTNET_URLS[0], TESTNET_CHAIN_HASH)

  const faultyClient = {
    async info () {
      throw new Error('boom')
    }
  }

  const client = new Optimizing([faultyClient, new HTTP(TESTNET_URLS[0], info)])
  t.deepEqual(await client.info(), info)
})

test('should fail to get info if all clients fail', async t => {
  let calls = 0
  const faultyClient = () => ({
    async info () {
      calls++
      throw new Error('boom')
    }
  })

  const client = new Optimizing([faultyClient(), faultyClient()])
  const err = await t.throwsAsync(client.info())
  t.is(err.message, 'boom')
  t.is(calls, 2)
})

test('should get from the fastest client', async t => {
  const fastBeacons = [{ round: 138 }, { round: 139 }, { round: 140 }]
  const fast = new Mock({ beacons: [{ round: 1 }, ...fastBeacons] })
  // This client shouldn't be used other than for the speed test
  class Slow extends Mock {
    get (round, options) {
      if (round !== 1) t.fail(`not expected to call get other than for speed test (${round})`)
      return super.get(round, options)
    }
  }
  const slow = new Slow({ beacons: [{ round: 1, delay: 100 }] })

  const client = new Optimizing([slow, fast])
  await client.start()

  for (const beacon of fastBeacons) {
    const b = await client.get(beacon.round)
    t.is(b.round, beacon.round)
  }

  await client.close()
})

test('should watch from the fastest client', async t => {
  const chainInfo = { period: 1 }

  const fastBeacons = [{ round: 138 }, { round: 139 }, { round: 140 }]
  const fast = new Mock({
    beacons: [{ round: 1 }, ...fastBeacons],
    latestBeaconIndex: 1,
    chainInfo
  })
  // This client shouldn't be used other than for the speed test
  class Slow extends Mock {
    watch () {
      t.fail('not expected to call watch')
    }
  }
  const slow = new Slow({ beacons: [{ round: 1, delay: 100 }] })

  const client = new Optimizing([slow, fast])
  await client.start()

  const watchedBeacons = client.watch()

  for (const beacon of fastBeacons) {
    const b = (await watchedBeacons.next()).value
    t.is(b.round, beacon.round)
  }

  watchedBeacons.return()
  await client.close()
})

test('should switch to a faster client', async t => {
  const beacons = [{ round: 138 }, { round: 139 }, { round: 140 }]

  class FastThenSlow extends Mock {
    get (round, options) {
      if (round > 139) t.fail(`not expected to be asked for beacons > 139 (${round})`)
      return super.get(round, options)
    }
  }
  const fastThenSlow = new FastThenSlow({
    beacons: [{ round: 1 }, ...[beacons[0], ...beacons.slice(1).map(b => ({ ...b, delay: 200 }))]]
  })
  class Steady extends Mock {
    get (round, options) {
      if (round > 1 && round < 140) t.fail(`not expected to be asked for beacons < 140 (${round})`)
      return super.get(round, options)
    }
  }
  const steady = new Steady({ beacons: [{ round: 1, delay: 100 }, ...beacons.map(b => ({ ...b, delay: 100 }))] })

  const client = new Optimizing([fastThenSlow, steady])
  await client.start()

  for (const beacon of beacons) {
    const b = await client.get(beacon.round)
    t.is(b.round, beacon.round)
  }

  await client.close()
})
