import { build, stop, context } from "https://deno.land/x/esbuild@v0.24.0/mod.js"
import { denoPlugins } from "https://esm.sh/jsr/@luca/esbuild-deno-loader@0.11.1/mod.ts"
import { FileSystem } from "https://deno.land/x/quickr@0.8.6/main/file_system.js"

export {stop}
// returns Uint8Array
export function bundle(path) {
    return new Promise((resolve, reject)=>{
        build({
            bundle: true,
            write: false,
            entryPoints: [ path ],
            jsxFactory: "h",
            format: "esm",
            plugins: [
                {
                    "name": "handle-on-build",
                    "setup": (build) => {
                        build.onEnd((result) => {
                            const eachOutput = result.outputFiles[0]
                            resolve(eachOutput.contents)
                            // stop().catch(reject)
                        })
                    },
                },
                ...denoPlugins()
            ],
            external: [
                "node:assert",
                "node:buffer",
                "node:child_process",
                "node:cluster",
                "node:crypto",
                "node:dgram",
                "node:dns",
                "node:domain",
                "node:events",
                "node:fs",
                "node:http",
                "node:https",
                "node:net",
                "node:os",
                "node:path",
                "node:punycode",
                "node:querystring",
                "node:readline",
                "node:stream",
                "node:string_decoder",
                "node:timers",
                "node:tls",
                "node:tty",
                "node:url",
                "node:util",
                "node:v8",
                "node:vm",
                "node:zlib",
                "node:inspector",
            ]
        })
    })
}