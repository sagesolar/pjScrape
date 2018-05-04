dataSourceConfigs = {
    "code": "WK",
    "name": "Wikipedia",
    "remotePathRoot": "https://en.wikipedia.org/wiki/Main_Page",
    "recordPathRoot": "https://en.wikipedia.org/wiki/",
    "recordPathEnd": "",
    "usePathRoot": true,
    "resources": [
        ["name", "Title"],
        ["genres"],
        ["developers"],
        ["publishers"],
        ["releaseDate"]
    ]
}

// Set the resource data definitions here
function retrieveRecordData(data) {
    pageRecord.name = $(data).find("#firstHeading").text().replace(/\(.*(?:video )?game\)/i, "").trim();

    $(data).find("table.infobox.hproduct tbody tr").each(function(index) {
        if ($(this).find("th:contains('Genre(s)')")) {
            temp = $(this).find("th:contains('Genre(s)')").next().html();
            if (typeof temp !== "undefined") {
                pageRecord.genres = temp
                .replace(/(?:<br>|<li>)/g, ",")
                .replace(/<.+?>/g, "")
                .replace(/(?:\s*,){2,}\s*/g, ", ")
                .replace(/(?:^\s*,|,\s*$)/, "")
                .replace(/\[\w+\]/g, "")
                .trim();
            }
        }
        if ($(this).find("th:contains('Developer(s)')")) {
            temp = $(this).find("th:contains('Developer(s)')").next().html();
            if (typeof temp !== "undefined") {
                pageRecord.developers = temp
                .replace(/(?:<br>|<li>)/g, ";;")
                .replace(/<.+?>/g, "")
                .replace(/(?:\s*;;){1,}\s*/g, ";; ")
                .replace(/(?:^\s*;;|;;\s*$)/, "")
                .replace(/\[\w+\]/g, "")
                .trim();
            }
        }
        if ($(this).find("th:contains('Publisher(s)')")) {
            temp = $(this).find("th:contains('Publisher(s)')").next().html();
            if (typeof temp !== "undefined") {
                pageRecord.publishers = temp
                .replace(/(?:<br>|<li>)/g, ";;")
                .replace(/<.+?>/g, "")
                .replace(/(?:\s*;;){1,}\s*/g, ";; ")
                .replace(/(?:^\s*;;|;;\s*$)/, "")
                .replace(/\[\w+\]/g, "")
                .trim();
            }
        }
        if ($(this).find("th:contains('Release')")) {
            temp = $(this).find("th:contains('Release')").next().html();
            if (typeof temp !== "undefined") {
                pageRecord.releaseDate = temp
                .replace(/(?:<br>|<li>)/g, ";;")
                .replace(/<.+?>/g, "")
                .replace(/(?:\s*;;){1,}\s*/g, ";; ")
                .replace(/(?:^\s*;;|;;\s*$)/, "")
                .replace(/\[\w+\]/g, "")
                .trim();                
            }
        }
    });
}
