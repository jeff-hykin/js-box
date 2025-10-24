# JS Box

This is an experiment in different ways to make a JS environment deterministic.


## Quick Usage

### As Eval (any environment that supports web workers)

```js
import { deterministicEval } from "https://esm.sh/gh/jeff-hykin/js-box@0.1.0.1/main.js"
// code is run in a web worker
let x = await deterministicEval(`10 + new Date().getTime()`)
// code is run in a web worker
let y = await deterministicEval(`10 + new Date().getTime()`)
console.log(x === y) // true
```

<!-- ### As a CLI Tool

Convert a normal JS file to a deterministic one, not particularly useful as side effects are impossible.

```sh
# Install deno
curl -fsSL 'https://deno.land/install.sh' | sh
export PATH="$HOME/.deno/bin:$PATH"

# install js-box
deno install -n js-box -Afg https://esm.sh/gh/jeff-hykin/js-box/main/nullifyEnvCli.js

# use js-box
js-box ./file.js --output ./file.deterministic.js
``` -->


### As a JS Module

```js
import "https://esm.sh/gh/jeff-hykin/js-box@0.1.0.1/main/nullifyEnv.js"
let deterministic1 = 10 + new Date().getTime()
let deterministic2 = 10 + new Date().getTime() // time increments every time its checked
let deterministic3 = 10 + Performance.now() // time increments every time its checked
let deterministic4 = 10 + Math.random()
// race conditions don't exist, even with fluxuating workloads
setTimeout(()=>{
    console.log("race condition1", deterministic1) // true
    setTimeout(()=>{
        console.log("race condition1.1", deterministic1) // true
    }, 500)
}, 500)
setTimeout(()=>{
    console.log("race condition2", deterministic1) // true
    setTimeout(()=>{
        console.log("race condition2.1", deterministic1) // true
    }, 499)
    setTimeout(()=>{
        console.log("race condition2.2", deterministic1) // true
    }, 500)
}, 498)
```


## Caveats

Not all JS features are available, and this system has not been hardened for running malicious code (it might work, but no guarantees).

### How does it work?

There are many sources of JS non-determinism:
1. Obvious API's like:
    - Timing apis like `Date.now()`, `Performance.now()`
    - Randomness from `crypto`, and `Math.random()`
    - Dynamic imports `import()`
    - External data `fetch`, `fs.readFileSync`
2. Less obvious API's like:
    - `new Error().stack `
    - `String.toLocaleLowerCase()` which uses location to know the locale
    - `Date.toLocaleString()`
4. Static imports are (surprisingly) not deterministic. E.g. in `import "a.js";"import 'b.js'"` it is 100 valid (and happens) that the code from `b.js` finishes before the code from `a.js`.
3. Event loop race conditions `setTimeout`, `runNextMacroTask`, `setInterval`, etc
4. Non-specified details of JS runtimes like:
    - What keys are present on the global object
    - The order of builtin attributes, such as `Reflect.ownKeys(Object)`
    - Whether or not the global object has a prototype (it does on nodejs, but not in others)
    - The string returned by native functions, like `Function.toString()` (e.g. `"function Function() { [native code] }"` is not the same across)
    - The properties of all builtin methods/attributes (e.g. enumerable, configurable, etc) 
    - etc (there's a lot)
5. Cpu based difference in floating point math

All of these are addressed in some way, except for #5 (for now). Bundling the code gets rid of the static-import non determinism. From there a function (`createNullEnv`) does extremely-aggressive patching of the global object with a whitelist of allowed globals, including a whitelist of the attributes of each of those globals. The most powerful part of this library is `main/deterministic_tooling/timingTools.js` which manages to fix race conditions. Easy aspects like `Math.random()` and `Date.now()` are patched, but the harder ones like `String.toLocaleLowerCase()` and `Date.toLocaleString()` are not yet fully patched.

In practice stuff like fetch is still needed, so to make a deterministic version of fetch, see one of my other projects [Offline Fetch Shim](https://github.com/jeff-hykin/offline_fetch_shim)

## How could it work in theory?

Ideally there would be a `js-box --generateExternalWorld file.js` that records fetch calls, file reads, etc and generates a `externalWorld.js` file. Then any file could be run in a fake deterministic environment with `js-box --run file2.js --with externalWorld.js`. This would be useful as a build tool, generating tests, and detecting malicious code.
