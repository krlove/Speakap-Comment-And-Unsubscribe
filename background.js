(function() {
    const tabStorage = {};
    const networkFilters = {
        urls: [
            "*://*.speakap.nl/*"
        ]
    };
    let requestToExecute = null;
    let startHandling = false;

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

        const requestBody = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes))); // todo sophisticate
        const url = new URL(details.url);
        const urlSearchParams = url.searchParams;
        const accessToken = urlSearchParams.get("access_token");
        const version = urlSearchParams.get("v");
        if (requestBody.messageType === "comment") {
            requestToExecute = url.protocol + "//" + url.host + url.pathname + requestBody.parent.EID + "/unsubscribe?v=" + version + "&access_token=" + accessToken;
        }

        tabStorage[tabId].requests[requestId] = {
            requestId: requestId,
            url: details.url,
            startTime: details.timeStamp,
            status: 'pending',
            requestBody: requestBody,
        };
        console.log(tabStorage[tabId].requests[requestId]);
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
            console.log('Request to be executed: ' + requestToExecute);
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
        //console.log(tabStorage[tabId].requests[requestId]);
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
