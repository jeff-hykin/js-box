import { bundle } from "./bundle.js"
import { pureBinaryify } from "https://deno.land/x/binaryify@2.5.6.1/tools.js"

export async function toImportJsAsString(path) {
    const relativePathToOriginal = null
    const version = null
    const bytes = await bundle(path)
    return pureBinaryify(bytes, relativePathToOriginal, version, { disableSelfUpdating: true, forceExportString: true })
}