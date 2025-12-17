(function() {
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;
  const _fetch = window.fetch;
  const _WebSocket = window.WebSocket;

  // --- WebSocket Interception ---
  window.WebSocket = function(url, protocols) {
    const ws = new _WebSocket(url, protocols);

    ws.addEventListener('message', (event) => {
      try {
        // Clone the data if necessary or parse it
        // We handle string and blob/arraybuffer (if converted to text)
        // ideally we relay non-binary text frames.
        let payload = event.data;
        if (typeof payload === 'string') {
             window.postMessage({
                type: 'PIONEX_RELAY_DATA',
                source: 'websocket',
                url: url,
                payload: payload
             }, '*');
        }
      } catch(e) {
          console.error("RelayExt: Error capturing WS frame", e);
      }
    });

    return ws;
  };
  window.WebSocket.prototype = _WebSocket.prototype;


  // --- Fetch Interception ---
  window.fetch = async function(...args) {
    const response = await _fetch(...args);
    
    // We want to clone the response so we can read the body 
    // without consuming it for the actual app.
    const clone = response.clone();
    const url = response.url;

    clone.text().then(text => {
        // filter mainly for JSON-like responses or the specific kline endpoint
        try {
            // Try parsing to see if it's JSON
            JSON.parse(text); 
            window.postMessage({
                type: 'PIONEX_RELAY_DATA',
                source: 'fetch',
                url: url,
                payload: text
             }, '*');
        } catch (e) {
            // Not JSON, ignore or log
        }
    }).catch(err => {
        console.error("RelayExt: Error reading fetch body", err);
    });

    return response;
  };

  // --- XHR Interception ---
  // Many sites still use XHR or a mix.
  XHR.open = function(method, url) {
    this._url = url;
    return open.apply(this, arguments);
  };

  XHR.send = function(postData) {
    this.addEventListener('load', function() {
      if (this.responseType === '' || this.responseType === 'text') {
         try {
             // Try parsing
             JSON.parse(this.responseText);
             window.postMessage({
                type: 'PIONEX_RELAY_DATA',
                source: 'xhr',
                url: this._url,
                payload: this.responseText
             }, '*');
         } catch(e) {
             // ignore non-json
         }
      }
    });
    return send.apply(this, arguments);
  };

})();
