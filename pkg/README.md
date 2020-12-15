# drand verify

A [drand](https://drand.love/) verification library in Rust.
This can be used by other crates or be compiled to a Wasm blob (< 500 kilobytes) with JavaScript bindings.

## Development

Compile with

```
$ cargo test
$ cargo build --examples
```

## Build for JS

In order to keep the JS/Wasm interface simple, there is a wrapper in the module `verify_js.rs` which takes
inputs in hex format and uses u32 round numbers. JS/Wasm bindings are created using wasm-bindgen.

**For Node.js**

This creates a CommonJS module that is loaded synchonously.

The example uses [the League of Entropy public key](https://api3.drand.sh/info)
and [round 72785](https://api3.drand.sh/public/72785).

```
$ wasm-pack build --target nodejs -- --features js
$ node
> const { verify_beacon } = require('./pkg/drand_verify');

// all good
> verify_beacon("868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31", 72785, "a609e19a03c2fcc559e8dae14900aaefe517cb55c840f6e69bc8e4f66c8d18e8a609685d9917efbfb0c37f058c2de88f13d297c7e19e0ab24813079efe57a182554ff054c7638153f9b26a60e7111f71a0ff63d9571704905d3ca6df0b031747", "82f5d3d2de4db19d40a6980e8aa37842a0e55d1df06bd68bddc8d60002e8e959eb9cfa368b3c1b77d18f02a54fe047b80f0989315f83b12a74fd8679c4f12aae86eaf6ab5690b34f1fddd50ee3cc6f6cdf59e95526d5a5d82aaa84fa6f181e42")
true

// wrong round
> verify_beacon("868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31", 42, "a609e19a03c2fcc559e8dae14900aaefe517cb55c840f6e69bc8e4f66c8d18e8a609685d9917efbfb0c37f058c2de88f13d297c7e19e0ab24813079efe57a182554ff054c7638153f9b26a60e7111f71a0ff63d9571704905d3ca6df0b031747", "82f5d3d2de4db19d40a6980e8aa37842a0e55d1df06bd68bddc8d60002e8e959eb9cfa368b3c1b77d18f02a54fe047b80f0989315f83b12a74fd8679c4f12aae86eaf6ab5690b34f1fddd50ee3cc6f6cdf59e95526d5a5d82aaa84fa6f181e42")
false

// invalid pubkey length
> verify_beacon("868f", 72785, "a609e19a03c2fcc559e8dae14900aaefe517cb55c840f6e69bc8e4f66c8d18e8a609685d9917efbfb0c37f058c2de88f13d297c7e19e0ab24813079efe57a182554ff054c7638153f9b26a60e7111f71a0ff63d9571704905d3ca6df0b031747", "82f5d3d2de4db19d40a6980e8aa37842a0e55d1df06bd68bddc8d60002e8e959eb9cfa368b3c1b77d18f02a54fe047b80f0989315f83b12a74fd8679c4f12aae86eaf6ab5690b34f1fddd50ee3cc6f6cdf59e95526d5a5d82aaa84fa6f181e42")
Thrown: 'Invalid input length for point (must be in compressed format): Expected 48, actual: 2'
```

**For browsers and other JS environments**

You need to change the target in order to get a suiteable package. E.g.

```
$ wasm-pack build --target web -- --features js
$ ls ./pkg
```

for browsers. Please refer to the wasm-bindgen handbook [to learn more about targets](https://rustwasm.github.io/docs/wasm-bindgen/reference/deployment.html).

## License

Apache 2.0, see [LICENSE](./LICENSE) and [NOTICE](./NOTICE)
