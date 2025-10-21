// based on:
    // (yeah it says "dont use" but whatever)
    // https://w3c.github.io/web-performance/specs/HAR/Overview.html#sec-object-types-params

function hashCode(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function requestJsonToId(request) {
    if (!request) {
        return null
    }
    return hashCode(JSON.stringify({url: request.url, method: request.method, postData: { encoding: request.postData?.encoding, text: request.postData?.text,}}))
}

function fetchArgsToId(urlOrRequest, options=undefined) {
    // standardize format of first argument
    if (typeof urlOrRequest == 'string') {
        try {
            urlOrRequest = new URL(urlOrRequest).href
        } catch (error) {
            if (globalThis.window?.location?.href) {
                urlOrRequest = new URL(`${window.location.href}/${urlOrRequest}`)
            }
        }
    }

    // turn all of it into a Request object
    let request
    if (options) {
        // options for Request:
        // method,
        // headers,
        // body,
        // referrer,
        // referrerPolicy,
        // mode,
        // credentials,
        // cache,
        // redirect,
        // integrity,
        // keepalive,
        // signal,
        // window,
        // duplex,
        // priority,
        request = new Request(urlOrRequest, options)
    } else if (urlOrRequest instanceof Request) {
        request = urlOrRequest
    } else if (urlOrRequest instanceof URL) {
        request = new Request(urlOrRequest)
    } else {
        // e.g. throw error because its an invalid argument (but use the real fetch to trigger the error)
        return fetch(urlOrRequest)
    }

    // 
    // extract url and params
    // 
    const url = request.url

    // 
    // extract method
    // 
    const method = request.method

    // const { credentials, headers, referrer, method, mode, body, redirect } = options
    let postData = { encoding: undefined, text: undefined }
    if (method === 'POST') {
        var requestCopy = request.clone()
        try {
            postData.text = requestCopy.text()
        } catch (error) {
            postData.text = btoa( requestCopy.bytes() )
            postData.encoding = "base64"
        }
    }
    return hashCode(
        JSON.stringify({url, method, postData})
    )
}

function responseJsonToResponseObject(jsonObj) {
    const headers = new Headers()
    for (const { name, value } of jsonObj.headers) {
        headers.append(key, value)
    }
    if (jsonObj.content?.mimeType) {
        headers.set("Content-Type", jsonObj.content.mimeType)
    }
    let body = ""
    if (jsonObj.content?.text) {
        body = jsonObj.content.text
        if (jsonObj.content?.encoding === "base64") {
            body = atob(body)
        }
    }
    
    return new Response(body, {
        status: jsonObj.status,
        statusText: jsonObj.statusText,
        headers: headers,
    })
}

export function createFetchShim(data, {realFetch}={}) {
    if (!realFetch) {
        realFetch = globalThis.fetch
    }
    const allReqestIds = new Set()
    
    const idToResponse = {}
    for (const {request: requestJson, response: responseJson} of data.log.entries) {
        if (!requestJson) {
            continue
        }
        const requestId = requestJsonToId(requestJson)
        allReqestIds.add(requestId)
        idToResponse[requestId] = ()=>responseJsonToResponseObject(responseJson)
    }
    
    return function fetch(url, options) {
        // e.g. url, method, postData
        const requestId = fetchArgsToId(url, options)
        if (!allReqestIds.has(url)) {
            return realFetch(url, options)
        }
        return Promise.resolve(idToResponse[requestId]())
    }
}