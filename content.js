document.addEventListener('DOMNodeInserted', function(event) {
    const target = event.target;

    if (target.className === 'ptm js-button-bar') {
        const postButton = target.querySelector('button.action-submit');
        const postAndUnsubscribeButton = postButton.cloneNode(true);
        postAndUnsubscribeButton.innerHTML = 'Post and Unsubscribe';
        postAndUnsubscribeButton.style.width = 'auto';
        postAndUnsubscribeButton.style.marginRight = '2px';
        postAndUnsubscribeButton.onclick = function() {
            chrome.runtime.sendMessage({"startHandling": true}, function(response) {
                if (response.submitted === true) {
                    postButton.click();
                }
            });
        };
        postButton.parentNode.insertBefore(postAndUnsubscribeButton, postButton.nextSibling);

        const observer = new MutationObserver(function(mutations) {
            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];
                if (mutation.attributeName === 'disabled') {
                    postAndUnsubscribeButton.disabled = postButton.disabled;

                    break;
                }
            }
        });
        observer.observe(postButton, {attributes: true});
    }
});
