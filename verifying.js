/* eslint-env browser */
/* global Go fs drand */
import './wasm/wasm_exec.js'
import drand_verify from './pkg/drand_verify.js'

class Verifier {
  static instance () {
    if (Verifier._instance) {
      return Verifier._instance
    }
    Verifier._instance = (async function () {
      try {
        // TODO: switch to TinyGo when math/big works for smaller wasm file and non-global exports.
        const go = new Go()
        const url = `${import.meta.url.split('/').slice(0, -1).join('/')}/wasm/drand.wasm`
        let result
        if (typeof fs !== 'undefined' && fs.promises) { // wasm_exec puts fs on global object in Node.js
          const dirname = new URL(import.meta.url).pathname.split('/').slice(0, -1).join('/')
          const data = new Uint8Array(await fs.promises.readFile(`${dirname}/wasm/drand.wasm`))
          result = await WebAssembly.instantiate(data, go.importObject)
        } else if (WebAssembly.instantiateStreaming) {
          result = await WebAssembly.instantiateStreaming(fetch(url), go.importObject)
        } else {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`unexpected HTTP status fetching WASM ${res.status}`)
          result = await WebAssembly.instantiate(await res.arrayBuffer(), go.importObject)
        }
        go.run(result.instance)
        return drand // window.drand / global.drand should now be available
      } catch (err) {
        Verifier._instance = null
        throw err
      }
    })()
    return Verifier._instance
  }
}

export default class Verifying {
  constructor (client, options) {
    this._client = client
    this._options = options || {}
  }

  async get (round, options) {
    options = options || {}
    const rand = await this._client.get(round, options)
    return this._verify(rand, { signal: options.signal })
  }

  info (options) {
    return this._client.info(options)
  }

  async * watch (options) {
    options = options || {}
    for await (let rand of this._client.watch(options)) {
      rand = await this._verify(rand, { signal: options.signal })
      yield rand
    }
  }

  roundAt (time) {
    return this._client.roundAt(time)
  }

  async _verify (rand, options) {
    // TODO: full/partial chain verification
    const start = Date.now()
    const info = await this.info(options)
    const afterInfo = Date.now()
    // const verifier = await Verifier.instance()
    const afterInstantiation = Date.now()
    //await verifier.verifyBeacon(info.public_key, rand)
    const ok = drand_verify.verify_beacon(info.public_key, rand.round, rand.previous_signature, rand.signature)
    if (!ok) throw new Error("Verification failed")
    const end = Date.now()
    console.log(`Verification time: ${end-start}ms (${afterInfo-start}ms info; ${afterInstantiation-afterInfo}ms instantiation; ${end-afterInstantiation}ms verify beacon)`)
    // TODO: derive the randomness from the signature
    return { ...rand }
  }

  async close () {
    return this._client.close()
  }
}
