/* eslint-env browser */
import init, { verify_beacon } from './pkg/drand_verify.js'

class Verifier {
  static instance () {
    if (Verifier._instance) {
      return Verifier._instance
    }
    Verifier._instance = (async function () {
      try {
        // Note: in Webpack >= v5.0.0-beta.30 the form `new URL("./relative_path.xyz", import.meta.url)`
        // is treated as dependency and creates an asset module. This allows us to create a package that
        // works in node, browsers and Webpack.
        const url = new URL("./pkg/drand_verify_bg.wasm", import.meta.url)
        if (url.protocol === "file:") {
          // node-fetch does not like file:// URLs
          const fs = await import("fs");
          const data = await fs.promises.readFile(url)
          await init(data)
        } else {
          console.log(url)
          await init(url)
        }
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
    const verifier = await Verifier.instance()
    const afterInstantiation = Date.now()
    //await verifier.verifyBeacon(info.public_key, rand)
    const ok = verify_beacon(info.public_key, rand.round, rand.previous_signature, rand.signature)
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
