/*////////////////////////////////////////////////////
// Global variables
////////////////////////////////////////////////////*/
var pjSrapeVer = "1.9";

var fs = require('fs');
var system = require('system');
var sysArgs = system.args;
var page;

var appConfig;
var dataSourceConfigs;
var currentUrl;
var headerKeys;

var mutedPageMessages = [];
var mutedPageErrors = [];
var countBlockedResources = 0;
