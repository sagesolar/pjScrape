/*////////////////////////////////////////////////////
// Common functions
////////////////////////////////////////////////////*/

// Main script
function beginScrape() {
    // If there are data source records to scrape
    if (dataSourceConfigs.remote.records.length !== 0) {

        // Set up page object
        setPageSettings();

        // If a remote record encoding error has occured
        if (dataSourceConfigs.remote.error || !dataSourceConfigs.usePathRoot) {
            currentUrl = dataSourceConfigs.recordPathRoot + dataSourceConfigs.remote.records[0].url;
        }
        else {
            currentUrl = dataSourceConfigs.remotePathRoot;
        }

        if (dataSourceConfigs.remote.error) {
            console.log("");
            console.log(msg_inf_equalsDivider);
        }

        console.log("Retrieving [" + appConfig.scrapeSettings.recordsFetchBatchSize +"] records per batch.")
        console.log("Loading [" + dataSourceConfigs.name + "] ==> " + currentUrl.replace(dataSourceConfigs.recordPathRoot, ""));
        console.log(msg_inf_equalsDivider);

        if (!appConfig.scrapeSettings.hidePageErrors || !appConfig.scrapeSettings.hideBlockedResources) {
            console.log(msg_inf_pageMessages);
        }
        console.log("");

        // Load the current page url
        page.open(decodeURI(encodeURI(currentUrl)), function(status) {
            setTimeout(function() {
                onPageLoadComplete(status, initialPageStatus);
            }, 1500);
        });
    }
    // Scrape is complete
    else {
        displayScrapeSummary();
        phantom.exit();
    }
}

// Import the application config settings
function importAppConfig(appConfigFilePath) {
    try {
        appConfig = JSON.parse(fs.read(appConfigFilePath, {
            mode: "r",
            charset: "UTF-8"
        }));
    }
    catch (e) {
        console.log(msg_err_parsingAppConfig);
        console.log(msg_inf_errorDetails + e);
    }
}

// Import data source details based on data souce alias
function importDataSourceDetails(dataSourceAlias) {
    var dataSourceAliasUpper = dataSourceAlias.toUpperCase();

    if (appConfig.dataSourceAliases.hasOwnProperty(dataSourceAliasUpper)) {
        appConfig.filePaths.dataSourceConfig = appConfig.filePaths.dataSourceConfig.replace(/#{5}/, appConfig.dataSourceAliases[dataSourceAliasUpper]);
        appConfig.filePaths.dataSourceInput = appConfig.filePaths.dataSourceInput.replace(/#{5}/, appConfig.dataSourceAliases[dataSourceAliasUpper]);
        appConfig.filePaths.dataSourceOutput = appConfig.filePaths.dataSourceOutput.replace(/#{5}/, appConfig.dataSourceAliases[dataSourceAliasUpper]);
    }
    else {
        console.log("[" + dataSourceAlias + "]" + msg_err_unknownDataSourceAlias);
        phantom.exit();
    }

    try {
        phantom.injectJs(appConfig.filePaths.dataSourceConfig);

        // Add remote data source configs
        dataSourceConfigs.remote = {
            "displayRetrievedRecords": appConfig.scrapeSettings.displayRetrievedRecords,
            "initialRecordCount": 0,
            "encodingErrorCount": 0,
            "records": [],
            "results": [],
            "error": false
        }

        // Add standard resources to start of resource set
        for (var i = appConfig.preResources.length - 1; i >= 0; i--) {
            dataSourceConfigs.resources.unshift(
                appConfig.preResources[i]
            );
        }

        // Add standard resources to end of resource set
        for (var i = 0; i < appConfig.postResources.length; i++) {
            dataSourceConfigs.resources.push(
                appConfig.postResources[i]
            );
        }
    }
    catch (e) {
        console.log(msg_err_parsingSysArgs);
        console.log(msg_inf_errorDetails + e);
        phantom.exit();
    }
}

// Import data source input records
function importDataSourceInputRecords(dataSourceInputPath) {
    var curLine;
    var curLineNo = 1;
    var stream = fs.open(dataSourceInputPath, {
        mode: "r",
        charset: "UTF-8"
    });

    while (!stream.atEnd()) {
        curLine = stream.readLine();

        // If the current line is blank
        if (curLine.trim() === "") {
            // Stop import at blank row
            if (appConfig.scrapeSettings.breakAtBlankInputRow) {
                console.log(msg_inf_breakingInputFileImportAtRow + curLineNo);
                break;
            }
            // Skip import at blank row
            else {
                continue;
            }
        }

        // If input records have an id column
        if (curLine.indexOf("\t") !== -1) {
            curLine = curLine.split("\t");
            dataSourceConfigs.remote.records.push({
                "id": curLine[0],
                "url": curLine[1].replace(dataSourceConfigs.recordPathRoot, "")
            });
        }
        // No id provided, so generate record guids
        else if (appConfig.scrapeSettings.generateRecordGuids) {
            dataSourceConfigs.remote.records.push({
                "id": getGuid(),
                "url": curLine.replace(dataSourceConfigs.recordPathRoot, "")
            });
        }
        // Use record count
        else {
            dataSourceConfigs.remote.initialRecordCount++;
            dataSourceConfigs.remote.records.push({
                "id": dataSourceConfigs.remote.initialRecordCount,
                "url": curLine.replace(dataSourceConfigs.recordPathRoot, "")
            });
        }

        curLineNo++;
    }

    dataSourceConfigs.remote.initialRecordCount = dataSourceConfigs.remote.records.length;
    stream.close();

    // Exit program if no input records were imported
    if (dataSourceConfigs.remote.records.length === 0){
        console.log(msg_err_noInputRecordsLoaded);
        phantom.exit();
    }
}

// Create a backup of the data source input file
function createInputFileBackup(){
    // If input file backup directory does not exist create it
    if (!fs.isDirectory(appConfig.filePaths.dataSourceInputBackupDir)){
        fs.makeDirectory(appConfig.filePaths.dataSourceInputBackupDir)
    }

    var inputBackupFilePath = appConfig.filePaths.dataSourceInputBackupDir + appConfig.filePaths.dataSourceInput.replace(/pjScrape\/dsInput\//, "").replace(/\.txt/, "") + "[INITIAL].txt"

    try {
        // If the input file backup does not exist, create it
        if (!fs.exists(inputBackupFilePath)){
            console.log(msg_inf_backupInputFile);
            fs.copy(appConfig.filePaths.dataSourceInput, inputBackupFilePath);
        }
        // If the input file backup is older than the current input file, replace it
        else {
            var inputFileLastModDate = fs.lastModified(appConfig.filePaths.dataSourceInput)
            var backupInputFileLastModDate = fs.lastModified(inputBackupFilePath);

            if (backupInputFileLastModDate < inputFileLastModDate) {
                fs.remove(inputBackupFilePath);
                fs.copy(appConfig.filePaths.dataSourceInput, inputBackupFilePath);
            }
        }
    }
    catch (e) {
        console.log(msg_err_unableToBackupInputFile + appConfig.filePaths.dataSourceInput);
        console.log(msg_inf_errorDetails + e);
        dataSourceConfigs.remote.error = true;
        return false;
    }
}

// Remove the retrieved records from the input file
function updateInputFile() {
    // Clear the current input file
    fs.write(appConfig.filePaths.dataSourceInput, "", {
        mode: "w",
        charset: "UTF-8"
    });

    // Add each remaining record to retrieve into the input file
    for (var i = 0; i < dataSourceConfigs.remote.records.length; i++) {
        fs.write(
            appConfig.filePaths.dataSourceInput,
            dataSourceConfigs.remote.records[i].id + "\t" + dataSourceConfigs.recordPathRoot + dataSourceConfigs.remote.records[i].url + "\r\n",
            {mode: "a", charset: "UTF-8"}
        );
    }
}

// Create the data source output file and add header row
function createOutputFile(outputFilePath) {
    var fileRows = 0;

    // Determine the row count in the output file
    if (fs.exists(outputFilePath)) {
        var content = fs.read(outputFilePath, {
            mode: "r",
            charset: "UTF-8"
        });

        fileRows = content.match(/\r\n/g);

        if (fileRows !== null) {
            fileRows = fileRows.length;
        }
        else if (content !== "") {
            fileRows = 1;
            fs.write(outputFilePath, "\r\n", {
                mode: "a",
                charset: "UTF-8"
            });
        }
        else {
            fileRows = 0;
        }
    }

    // If the file contains no header row, add header columns from remote resources
    if (fileRows === 0) {
        console.log(msg_inf_creatingOutputFile + outputFilePath);
        var headerRowNames = [];

        // Add resource data types to file header
        for (var i = 0; i < dataSourceConfigs.resources.length; i++) {
            // If an alternative resource title has been provided, use it
            if (dataSourceConfigs.resources[i].length > 1 && typeof(dataSourceConfigs.resources[i][1]) === "string") {
                headerRowNames.push(dataSourceConfigs.resources[i][1]);
            }
            else {
                headerRowNames.push(camelCaseToTitleCase(dataSourceConfigs.resources[i][0]));
            }
        }

        // Add the header row to the file
        fs.write(outputFilePath, headerRowNames.join(",") + "\r\n", {
            mode: "w",
            charset: "UTF-8"
        });
    }
}

// Retrieve remote page records
function retrieveAndStoreRecords() {
    do {
        dataSourceConfigs = page.evaluate(function(dsConfigs, settings) {
            dataSourceConfigs = dsConfigs;
            scrapeSettings = settings;

            // Display current retrieved record counts
            calculateRecordCounts();

            // NON-AJAX RETRIEVAL METHOD
            // If the previous record retrieval encountered a UTF8 character encoding issue
            if (dataSourceConfigs.remote.error) {
                console.log("RETRIEVING WITHOUT AJAX : " + dataSourceConfigs.remote.records[0].url);
                createPageRecord(true);
                retrieveRecordData($);

                // Sanitise the value of each key in the page data record
                pageRecord = sanitiseRecord(pageRecord);

                // Clear error flag
                dataSourceConfigs.remote.error = false;
                dataSourceConfigs.remote.records.shift();
                dataSourceConfigs.remote.results.push(pageRecord);

                // Increment Ajax retrieval error count
                dataSourceConfigs.remote.encodingErrorCount++;

                // Display current retrieved record
                if (dataSourceConfigs.remote.displayRetrievedRecords) {
                    console.log(JSON.stringify(pageRecord, null, 4));
                }
            }

            //  AJAX RETRIEVAL METHOD
            while (
                dataSourceConfigs.remote.error !== true && (
                    dataSourceConfigs.remote.records.length != 0 &&
                    dataSourceConfigs.remote.records.length != (remainingUrls - scrapeSettings.recordsFetchBatchSize))
            ) {
                console.log("RETRIEVING : " + dataSourceConfigs.remote.records[0].url);
                createPageRecord(false);
                retrieveRecord(pageRecord.profileUrl, 0);
                retrieveRecordData(outputData);

                // Sanitise the value of each key in the page data record
                pageRecord = sanitiseRecord(pageRecord);

                // Encode special characters in UTF8
                pageRecord = encodeSpecialCharacters(pageRecord);

                // If encoding error has not occured, remove the current URL from
                // the URL array and push current record into record data array
                if (dataSourceConfigs.remote.error !== true) {
                    dataSourceConfigs.remote.records.shift();
                    dataSourceConfigs.remote.results.push(pageRecord);

                    // Display current retrieved record
                    if (dataSourceConfigs.remote.displayRetrievedRecords) {
                        console.log(JSON.stringify(pageRecord, null, 4));
                    }
                }
            }

            return dataSourceConfigs;
        }, dataSourceConfigs, appConfig.scrapeSettings);

        console.log(msg_inf_dashDivider);
        console.log(dataSourceConfigs.remote.results.length + " RECORDS RETRIEVED");

        if (dataSourceConfigs.remote.results.length > 0) {
            console.log("");
            console.log(msg_inf_dashDivider);
            if (dataSourceConfigs.remote.results.length > 1) {
                console.log("PERSISTING CURRENT RECORDS : [" + dataSourceConfigs.remote.results[0].name + "] TO [" + dataSourceConfigs.remote.results[dataSourceConfigs.remote.results.length - 1].name + "]");
            }
            else {
                console.log("PERSISTING CURRENT RECORD : [" + dataSourceConfigs.remote.results[0].name + "]");
            }
            console.log(msg_inf_dashDivider);

            // Set/reset the header keys for ordering CSV record data
            headerKeys = [];
            for (var i = 0; i < dataSourceConfigs.resources.length; i++) {
                headerKeys.push(dataSourceConfigs.resources[i][0]);
            }

            // Generate and persist a CSV record row for each current result
            for (var i = 0; i < dataSourceConfigs.remote.results.length; i++) {
                var csvRecordRow = "";
                for (var j = 0; j < headerKeys.length; j++) {
                    csvRecordRow += "\"" + dataSourceConfigs.remote.results[i][headerKeys[j]] + "\"";
                    if (j < (headerKeys.length - 1)) {
                        csvRecordRow += ",";
                    }
                }

                // Sanitise whitespace in CSV record
                csvRecordRow = csvRecordRow.replace(/\s+/g, " ") + "\r\n";

                // Display current CSV record
                if (appConfig.scrapeSettings.displayCsvRecords) {
                    console.log("CSV RECORD FOR: [" + dataSourceConfigs.remote.results[i].name + "]");
                    for (var k = 0; k < headerKeys.length; k++) {
                        console.log("[" + headerKeys[k] + "] => [" + dataSourceConfigs.remote.results[i][headerKeys[k]] + "]");
                        if (dataSourceConfigs.remote.results[i][headerKeys[k]].length > 100) {
                            console.log("");
                        }
                    }
                    console.log(msg_inf_dashDivider);
                }

                // Persist current CSV record row
                if (appConfig.scrapeSettings.persistCsvRecordsToFile) {
                    fs.write(appConfig.filePaths.dataSourceOutput, csvRecordRow, {
                        mode: "a",
                        charset: "UTF-8"
                    });
                }
            }

            if (appConfig.scrapeSettings.updateInputFile){
                updateInputFile();
                console.log(msg_inf_inputFileUpdated);
                console.log(msg_inf_dashDivider);
            }
        }

        // Reset results array
        dataSourceConfigs.remote.results = [];
    }
    // While no errors have occured, and a batch of 500 records have not been retrieved, and
    // there are records still to be retrieved,continue retrieving. This forces phantomjs
    // to reset the page occasionally to deal with memory overflows.
    while (
        dataSourceConfigs.remote.error !== true &&
        (dataSourceConfigs.remote.initialRecordCount - dataSourceConfigs.remote.records.length) % appConfig.scrapeSettings.recordRetrievalRestartCount !== 0  &&
        dataSourceConfigs.remote.records.length !== 0
    );

    // Rinse and repeat
    page.clearMemoryCache();
    page.close();

    setTimeout(function() {
        beginScrape();
    }, 2001);
}

// Convert a given string from camel case to title case
function camelCaseToTitleCase(camelCaseStr) {
    // If given string contains a space, return it
    if (camelCaseStr.search(" ") !== -1) {
        return camelCaseStr;
    }

    // Convert the string
    var result = camelCaseStr.trim().replace(/([A-Z])/g, " $1").trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// Return the domain part of a given url
function getUrlDomain(url) {
    var myRegexp = /^(?:https?:\/\/)?(?:.+\.)?([a-z\d\.-]+)\.(?:[a-z\.]{2,10})(?:[/\w\.-]*)*/i;
    try {
        return myRegexp.exec(url)[1];
    }
    catch (e) {
        console.log(msg_err_incorrectRemotePathRoot);
        console.log(msg_inf_errorDetails + e);
        phantom.exit();
    }
}

// Return the value of a given data object's key
function getValueByKey(key, keyValue, data) {
    var i, len = data.length;

    for (i = 0; i < len; i++) {
        if (data[i] && data[i].hasOwnProperty(key) && data[i][key] === keyValue) {
            return data[i]["value"];
        }
    }
    return -1;
}

// Pause system execution
function pause() {
    system.stdout.writeLine(msg_inf_pressAnyKeyToCont);
    system.stdin.readLine();
}

// Provide system title
function getSystemTitle() {
    console.log(msg_inf_equalsDivider);
    console.log(msg_inf_sysTitle3);
    console.log(msg_inf_sysTitle1);
    console.log(msg_inf_sysTitle2);
    console.log(msg_inf_sysTitle3);
    console.log(msg_inf_equalsDivider);
}

// Provide summary of blocked messages and resource during scrape
function displayScrapeSummary() {
    console.log("");
    console.log(msg_inf_equalsDivider);

    if (appConfig.scrapeSettings.persistCsvRecordsToFile) {
        console.log(msg_inf_allRecordsPersisted);
        console.log("");
    }
    
    console.log(msg_inf_mutedPageErrorCount + mutedPageErrors.length);
    console.log(msg_inf_mutedPageMessageCount + mutedPageMessages.length);
    console.log(msg_inf_blockedResourceCount + countBlockedResources);
    console.log(msg_inf_recordEncodingErrorCount + dataSourceConfigs.remote.encodingErrorCount);
    console.log(msg_inf_equalsDivider);
}

// Generates a pjScrape GUID
function getGuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    // PJS#xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return "PJS#" + s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}
