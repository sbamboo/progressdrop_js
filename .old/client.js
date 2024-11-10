// Modified version of: https://github.com/tq-bit/fetch-progress/blob/master/client.js
function streamFetch(url,defEncoding='utf-8') {

    let loading = false;
  
    let chunks = [];
    let results = null;
    let error = null;

    this.content = async (options) => {
        loading = true;
        try {
            const response = await fetch(url, { ...options });
            this._logHeaders(response.headers);

            
            if (response.ok) {
                return await this._readBody(response);
            } else {
                throw new Error(response.statusText);
            }
        } catch (err) {
            error = err;
            results = null;
            return error;
        } finally {
            loading = false;
        }
    }

    this.text = async (options) => {
        loading = true;
        try {
            const response = await fetch(url, { ...options });
            let encoding = this._getCharset(response.headers) || defEncoding;
            this._logHeaders(response.headers);
    
            if (response.ok) {
                let body = await this._readBody(response);
                results = new TextDecoder(encoding).decode(body);
                return results;
            } else {
                throw new Error(response.statusText);
            }
        } catch (err) {
            error = err;
            results = null;
            return error;
        } finally {
            loading = false;
        }
    }

    this.json = async (options) => {
        loading = true;
        try {
            const response = await fetch(url, { ...options });
            let encoding = this._getCharset(response.headers) || defEncoding;
            this._logHeaders(response.headers);
    
            if (response.ok) {
                let body = await this._readBody(response);
                results = new TextDecoder(encoding).decode(body);
                return await JSON.parse(results);
            } else {
                throw new Error(response.statusText);
            }
        } catch (err) {
            error = err;
            results = null;
            return error;
        } finally {
            loading = false;
        }
    }
  
    this._readBody = async (response) => {
        const reader = response.body.getReader();

        // This header must be configured serverside
        const length = +response.headers.get('content-length'); 
    
        // Declare received as 0 initially
        let received = 0;
    
        // Loop through the response stream and extract data chunks
        while (loading) {
            const { done, value } = await reader.read();
            const payload = { detail: { received, length, loading } }
            const onProgress = new CustomEvent('fetch-progress', payload);
            const onFinished = new CustomEvent('fetch-finished', payload)
    
            if (done) {
                // Finish loading
                loading = false;
        
                // Fired when reading the response body finishes
                window.dispatchEvent(onFinished)
            } else {
                // Push values to the chunk array
                chunks.push(value);
                received += value.length;
        
                // Fired on each .read() - progress tick
                window.dispatchEvent(onProgress); 
            }
        }
    
        // Concat the chinks into a single array
        let body = new Uint8Array(received);
        let position = 0;
    
        // Order the chunks by their respective position
        for (let chunk of chunks) {
            body.set(chunk, position);
            position += chunk.length;
        }

        // Return body
        return body;
    }

    this._logHeaders = (headers) => {
        headers.forEach((value, key) => {
            console.log(`${key}: ${value}`);
        });
    };

    this._getCharset = (headers) => {
        const contentType = headers.get('content-type');
        if (contentType) {
            const match = contentType.match(/charset=([^;]+)/);
            if (match) {
                return match[1];
            }
        }
        return null;
    };
}