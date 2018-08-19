/*////////////////////////////////////////////////////
// Common functions for page injection
////////////////////////////////////////////////////*/

// PAGE CONSOLE/ALERT INTERCEPTS
const msg_int_insertBlankLine = "#####BLANK#####";
const msg_inf_dashDivider = "--------------------------------------------------------------------------------------------";

// Global variables
var dataSourceConfigs;
var scrapeSettings;
var remainingUrls;
var outputData;
var pageRecord;
var temp;

// Add jQuery regex support
// https://blog.mastykarz.nl/jquery-regex-filter/
$.extend(
    jQuery.expr[':'], {
        regex: function(a, i, m, r) {
            //console.log(m[3]);
            var r = new RegExp(m[3], 'i');
            return r.test(jQuery(a).text());
        }
    }
);

// Add custom string set
function StringSet() {
    var setObj = {},
        val = {};

    this.add = function(str) {
        setObj[str] = val;
    };

    this.contains = function(str) {
        return setObj[str] === val;
    };

    this.remove = function(str) {
        delete setObj[str];
    };

    this.values = function() {
        var values = [];
        for (var i in setObj) {
            if (setObj[i] === val) {
                values.push(i);
            }
        }
        return values;
    };
}

// Add custom string map
function StringMap() {
    var mapObj = {};

    this.add = function(str) {
        if (!mapObj.hasOwnProperty(str)) {
            mapObj[str] = 1;
        }
        else {
            mapObj[str]++;
        }
    }

    this.addArr = function(arr) {
        for (var i = 0; i < arr.length; i++) {
            if (!mapObj.hasOwnProperty(arr[i])) {
                mapObj[arr[i]] = 1;
            }
            else {
                mapObj[arr[i]]++;
            }
        }
    }

    this.remove = function(str) {
        if (mapObj.hasOwnProperty(str)) {
            if (mapObj[str] > 1) {
                mapObj[str]--;
            }
            else {
                delete mapObj[str];
            }
        }
    };

    this.contains = function(str) {
        return mapObj.hasOwnProperty(str);
    };

    this.delete = function(str) {
        delete mapObj[str];
    };

    this.values = function() {
        var values = [];
        for (var i in mapObj) {
            values.push(i + "#[" + mapObj[i] + "]");
        }
        return values;
    };

    this.valuesCount = function() {
        return Object.keys(mapObj).length;
    }

    this.valuesOccurrenceTotal = function() {
        var count = 0;
        for (var i in mapObj) {
             count = count + mapObj[i];
        }
        return count;
    }
}

// Calculate and display current retrieved record counts
function calculateRecordCounts() {
    remainingUrls = dataSourceConfigs.remote.records.length;

    var pagesRetrieved = dataSourceConfigs.remote.initialRecordCount - remainingUrls;
    var percentDone = (((dataSourceConfigs.remote.initialRecordCount - remainingUrls) /
        dataSourceConfigs.remote.initialRecordCount) * 100).toFixed(2);

    console.log("REMAINING PAGES : " + remainingUrls);
    console.log("PAGES RETRIEVED : " + pagesRetrieved + " [" + percentDone + "%]");
    console.log(msg_inf_dashDivider);
}

// Pounds & ounces to kilograms converter
function lbsOzToKg(imperial) {
    var pounds = imperial.pounds + imperial.ounces / 16;
    return Math.round((pounds * 0.45359237) / 10);
}

// Feet & inches to centimeters converter
function ftInToCm(imperial) {
    var inches = (parseInt(imperial.feet) * 12) + parseInt(imperial.inches);
    return Math.round(inches * 2.54);
}

// To title case string converter
String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

// Sanitise the value of each key in the page data record
// Use [https://www.somacon.com/p525.php] to identify each individual character in a string
function sanitiseRecord(dataRecord) {
    $.each(dataRecord, function(key, value) {
        // Replace non-standard characters with standard characters
        dataRecord[key] = value.toString()
            .replace(/[\u0027\u0060\u00B4\u02B9\u02BB\u02BC\u02BD\u02BE\u02BF\u02C8\u02CA\u0313\u0314\u0315\u0343\u0374\u0384\u055A\u1FBD\u1FBF\u2018\u2018\u2019\u201B\u2032\uA78B\uA78C\uFF07]/g, "'")
            .replace(/[\u201C\u201D\u201F\u301D\u301E\uFF02\u02EE\u2033]/g, "\"")
            .replace(/[\u00AD\u2010\u2011\u2012\u2013\u2014\u2015\uFE63\uFF0D\u2043]/g, "-")
            .replace(/&amp;/g, "&") // Un-escape ampersand
            .replace(/\u00A0/g, " ") // Non-breaking spaces
            .replace(/"/g, '""') // Escape single double quote characters
            .trim();
    });

    return dataRecord;
}

// Encode special characters in UTF8
function encodeSpecialCharacters(dataRecord) {
    $.each(dataRecord, function(key, value) {
        try {
            dataRecord[key] = decodeURIComponent(escape(value));
        }
        // Error encoding characters, set error flag and cancel further encoding.
        catch (e) {
            console.log("ENCODING ERROR - CANCELLING AJAX RECORD RETRIEVAL");
            dataSourceConfigs.remote.error = true;
            return false;
        }
    });

    return dataRecord;
}

// Ajax record retrieval
function retrieveRecord(recordUrl) {
    $.ajax({
        async: false, // Disable ajax async
        url: recordUrl,
        type: 'get',
        success: function(output) {
            //console.log(output);
            outputData = $.parseHTML(output);
        },
        error: function(xhr, textStatus) {
            console.log("AN ERROR OCCURED: " + xhr.status + " | " + textStatus);
            outputData = false;
        },
        timeout: scrapeSettings.ajaxRetrievalTimeout
    });
}

// Set a page record based on the resource configs
function createPageRecord(encodeErrorBool) {
    pageRecord = {};

    // Set the undefined properties of the current data source
    for (var i = 0; i < dataSourceConfigs.resources.length; i++) {
        // If a false boolean has been provided for the current resource, set as undefined
        if ((dataSourceConfigs.resources[i].length === 2 && typeof(dataSourceConfigs.resources[i][1]) === "boolean" && dataSourceConfigs.resources[i][1] === false) ||
            (dataSourceConfigs.resources[i].length === 3 && typeof(dataSourceConfigs.resources[i][2]) === "boolean" && dataSourceConfigs.resources[i][2] === false)) {
            pageRecord[dataSourceConfigs.resources[i][0]] = "undefined";
        }
        else {
            pageRecord[dataSourceConfigs.resources[i][0]] = "";
        }
    }

    // Set the data source code, record url, and record guid
    pageRecord.source = dataSourceConfigs.code;
    pageRecord.profileUrl = dataSourceConfigs.recordPathRoot + dataSourceConfigs.remote.records[0].url;
    pageRecord.guid = dataSourceConfigs.remote.records[0].id;

    // Set the remote encoding error flag
    if (encodeErrorBool) {
        pageRecord.encodingError = "TRUE";
    }
    else {
        pageRecord.encodingError = "";
    }
}

// Parse a given string and return any detected date in DD-MM-YYYY
// This function uses momentjs for date parsing and formatting
function getFormatedDate(inputStr, dateFormstStr) {
    if (inputStr.trim() === "") {
        return "";
    }
    var d = moment(inputStr, dateFormstStr);

    if (d.isValid()) {
        // [https://devhints.io/moment] - Date formatting
        return d.format("DD-MMM-YYYY");
    }
    else {
        throw "Date Parse Error: [" + inputStr + "]";
    }
}
