/*////////////////////////////////////////////////////
// Script initialisation
////////////////////////////////////////////////////*/
phantom.injectJs("pjScrape/scripts/pjGlobals.js");
phantom.injectJs("pjScrape/scripts/pjMessages.js");
phantom.injectJs("pjScrape/scripts/pjCommon.js");
phantom.injectJs("pjScrape/scripts/pjPage.js");
importAppConfig("pjScrape/config/app.config.json");

// If a data source code or name has been provided
if (sysArgs[1]) {
    getSystemTitle();
    importDataSourceDetails(sysArgs[1]);    
    importDataSourceInputRecords(appConfig.filePaths.dataSourceInput);

    if (appConfig.scrapeSettings.updateInputFile){
        createInputFileBackup();
    }

    if (appConfig.scrapeSettings.generateRecordGuids) {
        console.log(msg_inf_generatingRecordGuids);
    }

    createOutputFile(appConfig.filePaths.dataSourceOutput);
    console.log(dataSourceConfigs.remote.initialRecordCount + msg_inf_initialRecCount)

    beginScrape();
}
else {
    console.log(msg_err_noSysArgsPassed);
    console.log(msg_inf_expectedSysArgs);
    phantom.exit();
}
