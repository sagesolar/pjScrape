/*////////////////////////////////////////////////////
// Page Object functions
////////////////////////////////////////////////////*/

// Create page and set settings of page object
function setPageSettings() {

    dataSourceConfigs.dataSourceDomain = new RegExp(
        ("^(?:" + dataSourceConfigs.remotePathRoot + "\/?$|" +
            dataSourceConfigs.recordPathRoot + ")").replace(/\./g, "\\."), "i"
    )

    initialPageStatus = {
        "status": 0,
        "url": "#none#",
        "newUrl": "#none#",
        "statusText": "#none#",
        "errorString": "#none#"
    };

    page = require("webpage").create();
    page.settings.userAgent = appConfig.pageSettings.userAgentString;
    page.settings.loadImages = appConfig.pageSettings.loadImages;
    page.settings.javascriptEnabled = appConfig.pageSettings.javascriptEnabled;
    page.settings.resourceTimeout = appConfig.pageSettings.resourceTimeout;
    page.customHeaders = appConfig.pageSettings.customHeaders;

    //////////////////////////////////////////////////////
    // System messages
    //////////////////////////////////////////////////////
    phantom.onError = function(msg, trace) {
        var msgStack = ["PHANTOM ERROR: " + msg];
        if (trace && trace.length) {
            msgStack.push("TRACE:");
            trace.forEach(function(t) {
                msgStack.push(" -> " + (t.file || t.sourceURL) + ": " + t.line + (t.function ? " (in function " + t.function+")" : ""));
            });
        }
        console.log(msgStack.join("\n"));
        phantom.exit(1);
    };

    page.onError = function(msg, trace) {
        if (appConfig.scrapeSettings.hidePageErrors) {
            mutedPageErrors.push(msg);
        }
        else {
            console.log("PAGE ERROR: " + msg);
        }
        // var msgStack = ["PAGE ERROR: " + msg];
        //
        // if (trace && trace.length) {
        //   msgStack.push("TRACE:");
        //   trace.forEach(function(t) {
        //     msgStack.push(" -> " + t.file + ": " + t.line + (t.function ? " (in function "" + t.function +"")" : ""));
        //   });
        // }
        //
        // console.error(msgStack.join("\n"));
    };

    page.onConsoleMessage = function(msg, line, source) {
        if (msg.trim() === msg_int_insertBlankLine) {
            console.log("");
        }
        else if (msg.search(msg_inf_dashDivider) !== -1) {
            console.log(msg_inf_dashDivider);
        }
        else if (appConfig.scrapeSettings.hidePageMessages) {
            if (msg.search(msg_int_insecureContentDisplayed) !== -1) {
                mutedPageMessages.push(msg);
            }
            else {
                console.log(">> " + msg);
            }
        }
    };

    page.onAlert = function(msg) {
        if (msg.search(msg_int_internalJqueryDetected) !== -1) {
            console.log("@> " + msg);
        }
    };

    //////////////////////////////////////////////////////
    // Page resource handling
    //////////////////////////////////////////////////////
    page.onResourceRequested = function(requestData, request) {
        // console.log("= onResourceRequested()");
        // console.log("  request: " + JSON.stringify(request, undefined, 4));
        // if (request.id === 1) {
        //     console.log(JSON.stringify(request, null, 2));
        // }

        // Prevent non domain resources from being accepted
        if (requestData.url.search(dataSourceConfigs.dataSourceDomain) === -1) {
            if (!appConfig.scrapeSettings.hideBlockedResources) {
                console.log("Blocking: [" + requestData.url + "]");
            }
            request.abort();
            countBlockedResources++;
        }
    };

    page.onResourceReceived = function(response) {
        if (response.id === 1 && response.stage === "end") {
            initialPageStatus.status = response.status;
            initialPageStatus.statusText = response.statusText;
            initialPageStatus.url = response.url;

            // If the host has responded with a redirection code, capture URL (Location) of redirection
            if (response.status === 301) {
                //console.log(JSON.stringify(response));
                initialPageStatus.newUrl = getValueByKey("name", "Location", response.headers);

                // Redirected url includes full URI. this requires trapping
                if (initialPageStatus.newUrl.indexOf("http") !== -1) {
                    console.log(msg_err_unhandledRedirect + initialPageStatus.newUrl);
                    phantom.exit();
                }
            }
        }
        // console.log("= onResourceReceived()" );
        // console.log("  id: " + response.id + ", stage: "" + response.stage + "", response: " + JSON.stringify(response));
    };

    page.onResourceError = function(resourceError) {
        if (resourceError.id === 1) {
            initialPageStatus.errorString = resourceError.errorString;
            initialPageStatus.status = resourceError.status;
            initialPageStatus.statusText = resourceError.statusText;
            initialPageStatus.url = resourceError.url;
        }
        // console.log("= onResourceError()");
        // console.log("  - unable to load url: "" + resourceError.url + """);
        // console.log("  - error code: " + resourceError.errorCode + ", description: " + resourceError.errorString );
    };

    page.onResourceTimeout = function(request) {
        // If the first requested resource times out, retry loading the page
        if (request.id === 1) {

            page.clearMemoryCache();
            page.close();
            console.log(msg_wrn_pageTimeoutOccured + currentUrl);
            console.log(msg_inf_equalsDivider);
            setTimeout(function() {
                beginScrape();
            }, 10000);
        }
        // console.log("Response (#" + request.id + "): " + JSON.stringify(request));
    };

    //////////////////////////////////////////////////////
    // Page navigation handling
    //////////////////////////////////////////////////////

    // page.onNavigationRequested = function(url, type, willNavigate, main) {
    //     console.log("= onNavigationRequested");
    //     console.log("  destination_url: " + url);
    //     console.log("  type (cause): " + type);
    //     console.log("  will navigate: " + willNavigate);
    //     console.log("  from page\"s main frame:" + main);
    // };

    // page.onLoadStarted = function() {
    //     console.log("= onLoadStarted()");
    //     var currentUrl = page.evaluate(function() {
    //         return window.location.href;
    //     });
    //     console.log("  leaving url: " + currentUrl);
    // };

    // page.onLoadFinished = function(status) {
    //     console.log("= onLoadFinished()");
    //     console.log("  status: " + status);
    // };
}

// Handle page redirects and inject remote scripts
function onPageLoadComplete(status, initialPageStatus) {
    //var pageContect = page.content;

    // If page has been marked as moved by the host, add the returned link to the URL list to be followed next
    if (initialPageStatus.status === 301) {

        console.log("SERVER RESPONSE: [" + currentUrl + " is now " + initialPageStatus.newUrl + "]");

        // Add the redirected URL into the current URL record
        currentUrl = initialPageStatus.newUrl;

        // Add the current date-time to URL records GUID as a unique ID to prevent subsequent records from being skipped by script
        // this is to ensure that other potential records aren"t missed due to host redirection. However this also mean that
        // multiple records for the same individual may be found as multiple aliases could redirect to the same record at the host.
        var d = new Date().getTime();
        currentUrl = currentUrl + "[REDIRECTED]" + d;

        setTimeout(function() {
            page.clearMemoryCache();
            page.close();
            console.log(msg_inf_retryRedirectUrl + currentUrl);
            console.log(msg_inf_dashDivider);
            setTimeout(function() {
                beginScrape();
            }, 4000);
        }, 1000);

    }
    else if (initialPageStatus.status >= 300) {
        setTimeout(function() {
            page.clearMemoryCache();
            page.close();

            if (initialPageStatus.status >= 500) {
                console.log("SERVER ERROR: [" + initialPageStatus.status + ":" + initialPageStatus.statusText + "]");
            }
            else {
                console.log("CLIENT ERROR: [" + initialPageStatus.status + ":" + initialPageStatus.statusText + "]");
            }

            console.log("CONTINUING");
            console.log(msg_inf_dashDivider);

            setTimeout(function() {
                beginScrape();
            }, 4000);
        }, 1000);
    }
    else {
        setTimeout(function() {
            console.log(msg_inf_dashDivider);
            //console.log(msg_inf_injectingJquery);
            if (!page.injectJs(appConfig.filePaths.localJquery)) {
                console.log(msg_err_jQueryNotInjected);
                phantom.exit();
            }

            //console.log(msg_inf_injectingMomentJs);
            if (!page.injectJs(appConfig.filePaths.localMomentJs)) {
                console.log(msg_err_momentJsNotInjected);
                phantom.exit();
            }

            //console.log(msg_inf_injectingRemoteCommon);
            if (!page.injectJs(appConfig.filePaths.remoteCommon)) {
                console.log(msg_err_rmtCmnNotInjected);
                phantom.exit();
            }

            //console.log(msg_inf_injectingDataSourceConfigs);
            if (!page.injectJs(appConfig.filePaths.dataSourceConfig)) {
                console.log(msg_err_dsCfgNotInjected);
                phantom.exit();
            }

            console.log(msg_inf_beginRetrieval);
            console.log(msg_inf_dashDivider);
            retrieveAndStoreRecords();
        }, 1000);
    }
}
