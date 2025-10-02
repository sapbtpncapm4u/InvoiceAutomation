sap.ui.define([], function () {
    "use strict";

    return {
        formatDateTime: function (sIsoDate) {
            if (!sIsoDate) return "";

            const oDate = new Date(sIsoDate); // Parses ISO string as UTC

            const oLocale = sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale();
            const oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                style: "medium",
                UTC: false // Convert to local time
            }, oLocale);

            return oDateFormat.format(oDate);
        }
    };
});
