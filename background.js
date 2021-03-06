(function() {
    const tabStorage = {};
    const networkFilters = {
        urls: [
            "*://*.speakap.nl/*", "*://*.speakap.com/*", "*://*.speakap.io/*"
        ]
    };
    let requestToExecute = null;
    let startHandling = false;

    function getRequestBody(rawBody) {
        if (rawBody && rawBody.raw && rawBody.raw.length > 0) {
            const raw = rawBody.raw[0];

            return JSON.parse(String.fromCharCode.apply(null, new Uint8Array(raw.bytes)));
        }

        return null;
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.startHandling === true) {
            startHandling = true;
            sendResponse({submitted: true});
        }
    });

    chrome.webRequest.onBeforeRequest.addListener((details) => {
        const { tabId, requestId } = details;
        if (!tabStorage.hasOwnProperty(tabId)) {
            return;
        }

        if (!startHandling) {
            return;
        }

        const requestBody = getRequestBody(details.requestBody);
        const url = new URL(details.url);
        const urlSearchParams = url.searchParams;
        const accessToken = urlSearchParams.get("access_token");
        const version = urlSearchParams.get("v");
        if (requestBody && requestBody.messageType === "comment") {
            requestToExecute = url.protocol + "//" + url.host + url.pathname + requestBody.parent.EID + "/unsubscribe?v=" + version + "&access_token=" + accessToken;
        }

        tabStorage[tabId].requests[requestId] = {
            requestId: requestId,
            url: details.url,
            startTime: details.timeStamp,
            status: 'pending',
            requestBody: requestBody,
        };
    }, networkFilters, ["requestBody"]);

    chrome.webRequest.onCompleted.addListener((details) => {
        const { tabId, requestId } = details;
        if (!tabStorage.hasOwnProperty(tabId) || !tabStorage[tabId].requests.hasOwnProperty(requestId)) {
            return;
        }

        const request = tabStorage[tabId].requests[requestId];

        Object.assign(request, {
            endTime: details.timeStamp,
            requestDuration: details.timeStamp - request.startTime,
            status: 'complete'
        });

        if (requestToExecute !== null) {
            var oReq = new XMLHttpRequest();
            oReq.open("POST", requestToExecute);
            oReq.send();

            requestToExecute = null;
            startHandling = false;
        }

    }, networkFilters);

    chrome.webRequest.onErrorOccurred.addListener((details)=> {
        const { tabId, requestId } = details;
        if (!tabStorage.hasOwnProperty(tabId) || !tabStorage[tabId].requests.hasOwnProperty(requestId)) {
            return;
        }

        const request = tabStorage[tabId].requests[requestId];
        Object.assign(request, {
            endTime: details.timeStamp,
            status: 'error',
        });
    }, networkFilters);

    chrome.tabs.onActivated.addListener((tab) => {
        const tabId = tab ? tab.tabId : chrome.tabs.TAB_ID_NONE;
        if (!tabStorage.hasOwnProperty(tabId)) {
            tabStorage[tabId] = {
                id: tabId,
                requests: {},
                registerTime: new Date().getTime()
            };
        }
    });

    chrome.tabs.onRemoved.addListener((tab) => {
        const tabId = tab.tabId;
        if (!tabStorage.hasOwnProperty(tabId)) {
            return;
        }
        tabStorage[tabId] = null;
    });
}());
