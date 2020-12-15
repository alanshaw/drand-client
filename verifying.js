/* eslint-env browser */
/* global Go fs drand */
import './wasm/wasm_exec.js'

class Verifier {
  static instance () {
    if (Verifier._instance) {
      return Verifier._instance
    }
    Verifier._instance = (async function () {
      try {
        // TODO: switch to TinyGo when math/big works for smaller wasm file and non-global exports.
        const go = new Go()
        // Note: in Webpack >= v5.0.0-beta.30 the form `new URL("./relative_path.xyz", import.meta.url)`
        // is treated as dependency and creates an asset module. This allows us to create a package that
        // works in node, browsers and Webpack.
        const url = new URL("./wasm/drand.wasm", import.meta.url)
        let result
        if (typeof fs !== 'undefined' && fs.promises) { // wasm_exec puts fs on global object in Node.js
          const data = new Uint8Array(await fs.promises.readFile(url))
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
    const info = await this.info(options)
    const verifier = await Verifier.instance()
    await verifier.verifyBeacon(info.public_key, rand)
    // TODO: derive the randomness from the signature
    return { ...rand }
  }

  async close () {
    return this._client.close()
  }
}
