/* tslint:disable */
/* eslint-disable */
/**
* This is the entry point from JavaScript.
*
* The argument types are chosen such that the JS binding is simple
* (u32 can be expressed as number, u64 cannot; strings are easier than binary data).
*
* The result type is translated to an exception in case of an error
* and too a boolean value in case of success.
* @param {string} pk_hex
* @param {number} round
* @param {string} previous_signature_hex
* @param {string} signature_hex
* @returns {boolean}
*/
export function verify_beacon(pk_hex: string, round: number, previous_signature_hex: string, signature_hex: string): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly verify_beacon: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        