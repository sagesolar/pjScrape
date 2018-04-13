/*////////////////////////////////////////////////////
// Script messages
////////////////////////////////////////////////////*/

// ERRORS
const msg_err_noSysArgsPassed = "No Data Source code or name passed to script.";
const msg_err_unknownDataSourceAlias = " is an unknown Data Source code or name.";
const msg_err_importDataSource = "An error occured whilst importing Data Source details.";
const msg_err_parsingAppConfig = "An error occured whilst parsing application configs.";
const msg_err_unhandledRedirect = "An unhandled redirect occured for : ";
const msg_err_jQueryNotInjected = "An error occured whilst injecting jQuery.";
const msg_err_momentJsNotInjected = "An error occured whilst injecting MomentJs.";
const msg_err_rmtCmnNotInjected = "An error occured whilst injecting remote common script.";
const msg_err_dsCfgNotInjected = "An error occured whilst injecting data source configs.";
const msg_err_parsingSysArgs = "An error occured whilst parsing system arguments.";
const msg_err_incorrectRemotePathRoot = "The provided data source remotePathRoot setting is not a valid URL.";

// WARNINGS
const msg_wrn_pageTimeoutOccured = "Timeout occured. Retrying : ";

// INFO
var msg_inf_sysTitle1 = "#" + Array(33).join(" ") + "+++-++-+ pjScrape +-++-+++" + Array(33).join(" ") + "#";
var msg_inf_sysTitle2 = "#" + Array(44).join(" ") + "v" + pjSrapeVer + Array(44).join(" ") + "#";
var msg_inf_sysTitle3 = "#" + Array(91).join(" ") + "#";
const msg_inf_expectedSysArgs = "Expected Data Source code or name as: [DSCODE] or [dsname]";
const msg_inf_pressAnyKeyToCont = "Press any key to continue...";
const msg_inf_creatingOutputFile = "Creating output file --> ";
const msg_inf_dashDivider = "--------------------------------------------------------------------------------------------";
const msg_inf_equalsDivider = "============================================================================================";
const msg_inf_beginRetrieval = "Remote scripts injected. Beginning record retrieval."
const msg_inf_allRecordsPersisted = "All records persisted.";
const msg_inf_openingPage = "Opening Page";
const msg_inf_retryRedirectUrl = "Retrying with redirected URL for ";
const msg_inf_injectingJquery = "Injecting jQuery script.";
const msg_inf_injectingRemoteCommon = "Injecting Remote Common script.";
const msg_inf_injectingDataSourceConfigs = "Injecting Data Source Configs.";
const msg_inf_injectingMomentJs = "Injecting MomentJs script.";
const msg_inf_initialRecCount = " data source records loaded.";
const msg_inf_pageMessages = "Page messages:";
const msg_inf_mutedPageErrorCount = "Muted Error Count: ";
const msg_inf_mutedPageMessageCount = "Muted Message Count: ";
const msg_inf_blockedResourceCount = "Blocked Resource Count: ";
const msg_inf_recordEncodingErrorCount = "Record Encoding Error Count: ";
const msg_inf_generatingRecordGuids = "Generating Record GUIDs.";

// PAGE CONSOLE/ALERT INTERCEPTS
const msg_int_insertBlankLine = "#####BLANK#####";
const msg_int_insecureContentDisplayed = "displayed insecure content from";
const msg_int_internalJqueryDetected = "code.jquery.com/jquery";
