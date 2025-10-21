export function simpleWorkerEval({ timeout, code, preloadCode } = {}) {
    timeout = timeout ?? Infinity
    return new Promise((resolve, reject) =>{
        var blobURL = URL.createObjectURL(
            new Blob(
                [
                    // postMessage and addEventListener will get nuked, so we need a reference to them
                    `{var p=postMessage,a=addEventListener;a("message",async (e)=>p(await new Function("","return (async ()=>("+e.data+"\\n))()")()))}`,
                    preloadCode,
                ],
                { type: "application/javascript" }
            )
        )
        var worker = new Worker(blobURL, { type: "module" })
        // URL.revokeObjectURL(blobURL) // For some reason this causes an error on Deno when calling function more than once
        worker.onmessage = function (evt) {
            worker.terminate()
            resolve(evt.data)
        }
        worker.onerror = function (evt) {
            reject(new Error(evt.message))
        }
        worker.postMessage(code)

        if (timeout !== Infinity) {
            setTimeout(function () {
                worker.terminate()
                reject(new Error("The worker timed out."))
            }, timeout)
        }
    })
}