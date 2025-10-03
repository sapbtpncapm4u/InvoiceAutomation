sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    "sap/m/MessageBox"
], (Controller, Filter, FilterOperator, MessageBox) => {
    "use strict";

    return Controller.extend("invoice.controller.HomePage", {

        selFilters: null, //To store filters selected before clicking Go
        reprocessPayload: null,
        onInit: function () {
            this.applyData = this.applyData.bind(this);
            this.fetchData = this.fetchData.bind(this);
            this.getFiltersWithValues = this.getFiltersWithValues.bind(this);

            this.oExpandedLabel = this.getView().byId("expandedLabel");
            this.oSnappedLabel = this.getView().byId("snappedLabel");
            this.oFilterBar = this.getView().byId("filterbar");
            this.oTable = this.getView().byId("table");

            this.oFilterBar.registerFetchData(this.fetchData);
            this.oFilterBar.registerApplyData(this.applyData);
            this.oFilterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

            this.oSmartVariantManagement = this.getView().byId("svm");
            var oPersInfo = new sap.ui.comp.smartvariants.PersonalizableInfo({
                type: "filterBar",
                keyName: "persistencyKey",
                dataSource: "",
                control: this.oFilterBar
            });
            this.oSmartVariantManagement.addPersonalizableControl(oPersInfo);
            this.oSmartVariantManagement.initialise(function () { }, this.oFilterBar);
            this.oTable.attachUpdateFinished(this.removeDuplicate, this);
            //this.oTable.attachEvent("rowsUpdated", this.removeDuplicate, this); //sap UI Table


            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteHome").attachPatternMatched(this._onObjectMatched, this);


        },


        _onObjectMatched: async function (oEvent) {
            this.onRefresh();
        },



        removeDuplicate: function () {
            var aMultiComboBoxIds = ["commoditySelect", "fcBox", "provider", "account", "month"];
            aMultiComboBoxIds.forEach(function (sId) {
                var oMultiComboBox = this.getView().byId(sId);
                if (!oMultiComboBox) return;

                // Save selected keys before modifying items
                var aSelectedKeys = oMultiComboBox.getSelectedKeys();

                var aItems = oMultiComboBox.getItems();
                var aUnique = [];
                var oMap = {};

                aItems.forEach(function (oItem) {
                    var sKey = oItem.getKey();
                    if (sKey && !oMap[sKey]) {
                        oMap[sKey] = true;
                        aUnique.push(oItem);
                    }
                });

                oMultiComboBox.removeAllItems();
                aUnique.forEach(function (oItem) {
                    oMultiComboBox.addItem(oItem);
                });

                // Restore selected keys
                oMultiComboBox.setSelectedKeys(aSelectedKeys);
            }, this); // Important: pass `this` as second arg so you can use this.getView() inside

        },



        onAfterRendering: function () {
            setTimeout(() => {
                const oAdaptBtn = this._findControlByPartialId("filterbar-btnFilters");
                if (oAdaptBtn) {
                    console.log("Button found:", oAdaptBtn.getId());
                    //oAdaptBtn.setEnabled(false);
                    oAdaptBtn.setVisible(false);
                } else {
                    console.warn("Button not found");
                }
            }, 1000);
        },


        onAfterVariantLoad: function () {
            this.onAfterRendering();
        },


        _findControlByPartialId: function (sPartialId) {
            const mAllControls = sap.ui.core.Element.registry.all();

            for (const id in mAllControls) {
                if (id.includes(sPartialId)) {
                    return mAllControls[id];
                }
            }

            return null;
        },



        onExit: function () {
            this.oModel = null;
            this.oSmartVariantManagement = null;
            this.oExpandedLabel = null;
            this.oSnappedLabel = null;
            this.oFilterBar = null;
            this.oTable = null;
        },

        fetchData: function () {
            var aData = this.oFilterBar.getAllFilterItems().reduce(function (aResult, oFilterItem) {
                aResult.push({
                    groupName: oFilterItem.getGroupName(),
                    fieldName: oFilterItem.getName(),
                    fieldData: oFilterItem.getControl().getSelectedKeys()
                });

                return aResult;
            }, []);

            return aData;
        },

        applyData: function (aData) {
            aData.forEach(function (oDataObject) {
                var oControl = this.oFilterBar.determineControlByName(oDataObject.fieldName, oDataObject.groupName);
                oControl.setSelectedKeys(oDataObject.fieldData);
            }, this);
        },

        getFiltersWithValues: function () {
            var aFiltersWithValue = this.oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
                var oControl = oFilterGroupItem.getControl();

                if (oControl && oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) {
                    aResult.push(oFilterGroupItem);
                }

                return aResult;
            }, []);

            return aFiltersWithValue;
        },


        onSelectionChange: function (oEvent) {
            this.oSmartVariantManagement.currentVariantSetModified(true);
            this.oFilterBar.fireFilterChange(oEvent);
        },

        onFilterChange: function () {
            this.onAfterRendering();
            this._updateLabelsAndTable();

        },

        onAfterVariantLoad: function () {
            this.onAfterRendering();
            this._updateLabelsAndTable();

        },

        getFormattedSummaryText: function () {
            var aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();

            if (aFiltersWithValues.length === 0) {
                return "No filters active";
            }

            if (aFiltersWithValues.length === 1) {
                return aFiltersWithValues.length + " filter active: " + aFiltersWithValues.join(", ");
            }

            return aFiltersWithValues.length + " filters active: " + aFiltersWithValues.join(", ");
        },

        getFormattedSummaryTextExpanded: function () {
            var aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();

            if (aFiltersWithValues.length === 0) {
                return "No filters active";
            }

            var sText = aFiltersWithValues.length + " filters active",
                aNonVisibleFiltersWithValues = this.oFilterBar.retrieveNonVisibleFiltersWithValues();

            if (aFiltersWithValues.length === 1) {
                sText = aFiltersWithValues.length + " filter active";
            }

            if (aNonVisibleFiltersWithValues && aNonVisibleFiltersWithValues.length > 0) {
                sText += " (" + aNonVisibleFiltersWithValues.length + " hidden)";
            }

            return sText;
        },

        _updateLabelsAndTable: function () {
            this.oExpandedLabel.setText(this.getFormattedSummaryTextExpanded());
            this.oSnappedLabel.setText(this.getFormattedSummaryText());
            this.oTable.setShowOverlay(true);
        },

        onNavToInvoice: function (oEvent) {

            const status = oEvent.getSource().getCells()[6].getText();
            const allowedStatuses = [
                "Duplicate",
                "In Progress",
                "Validated",
                "Ready for Review",
                "Approved",
                "Rejected"
                // "Extraction in Progress"
            ];
            if (allowedStatuses.includes(status)) {
                const oContext = oEvent.getSource().getBindingContext(); // default model
                const oObject = oContext.getObject();

                // Encode all keys for URL
                const sFacility = encodeURIComponent(oObject.FacilityShortCode);
                const sId = encodeURIComponent(oObject.Uniqueidentifier);
                const sCreated = encodeURIComponent(oObject.CreatedOnBLOB); // if datetime
                const sIsActive = encodeURIComponent(oObject.IsActiveEntity);
                const sAccNumCirah = encodeURIComponent(oObject.AccountNumberCirah);


                this.getOwnerComponent().getRouter().navTo("RouteView1", {
                    facility: sFacility,
                    id: sId,
                    created: sCreated,
                    active: sIsActive,
                    cirah: sAccNumCirah
                });
            } else {
                // MessageBox.information(
                //     "Extraction In Progress",
                //       "Extraction Failed - Please retrigger",
                //     {
                //         title: "Information",
                //         onClose: function (oAction) {
                //             // Optional: do something after the dialog is closed
                //             console.log("Information dialog closed with action:", oAction);
                //         }
                //     }
                // );

            }
        },

        onSearch: function () {
            var aTableFilters = this.oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
                var oControl = oFilterGroupItem.getControl(),
                    aSelectedKeys = oControl.getSelectedKeys(),
                    aFilters = aSelectedKeys.map(function (sSelectedKey) {
                        return new Filter({
                            path: oFilterGroupItem.getName(),
                            // operator: FilterOperator.Contains,
                            operator: FilterOperator.EQ,
                            value1: sSelectedKey
                        });
                    });

                if (aSelectedKeys.length > 0) {
                    aResult.push(new Filter({
                        filters: aFilters,
                        and: false
                    }));
                }

                return aResult;
            }, []);

            //this.oTable.getBinding("items").filter(aTableFilters); // for M table
            //this.oTable.getBinding("rows").filter(aTableFilters); // For Ui Tabel


            this.selFilters = aTableFilters;


            if (!aTableFilters.length) {
                this.onRefresh(aTableFilters); //Go will trigger
            } else {
                this.oTable.getBinding("items").filter(aTableFilters, "Application");
            }
            //The "Application" filter group ensures the filter is treated as client input, not as automatic filter/sorting.
            this.oTable.setShowOverlay(false);

            this.onAfterRendering();
        },


        onRefresh: function (aTableFilters) {
            const oTable = this.byId("table");
            if (!oTable) {
                console.warn("Table control not found");
                return;
            }

            const oBindingInfo = oTable.getBindingInfo("items");

            if (!oBindingInfo) {
                console.warn("Binding info not found on table items aggregation");
                return;
            }

            // Create sorter for FacilityShortCode (ascending)
            const oSorter = new sap.ui.model.Sorter("FacilityShortCode", false); // false = ascending

            // Rebind items with sorter
            oTable.bindItems({
                path: oBindingInfo.path,
                template: oBindingInfo.template,
                templateShareable: oBindingInfo.templateShareable,
                parameters: oBindingInfo.parameters,
                filters: this.selFilters ? this.selFilters : oBindingInfo.filters,
                sorters: [oSorter]
            });

            console.log("Table re-bound to refresh data from backend");
        },


        onRowSelection: function (evt) {
            var oItem = evt.getSource().getSelectedContextPaths();
            var oBtn = this.getView().byId("reprocessBtnFE");
            if (oItem.length) {
                oBtn.setEnabled(true);
            } else {
                oBtn.setEnabled(false);
            }
        },



        onShareAsEmail: function () {
            var sSubject = "Shared from Fiori App";
            var sBody = window.location.href;
            sap.m.URLHelper.triggerEmail(null, sSubject, sBody);
        },


        onReprocessClick: function (evt) {
            //let endPointUrl = `/cpi/http/Applicant`;
            // var applicantPayload = {
            //     "ASTNR": "006",
            //     "ASTNA": "Multi",
            //     "DISPNAME": "Check update",
            //     "BLOCKED": "X",
            //     "IsActiveEntity": true
            // }

            sap.ui.core.BusyIndicator.show(0);


            var selList = this.getView().byId("table").getSelectedItems();
            const invalidStatuses = new Set(["Duplicate", "Approved", "Rejected", "Validated"]);
            const hasInvalidItem = selList.some(item => {
                const status = item.getCells()[6].getText();
                return invalidStatuses.has(status);
            });

            if (hasInvalidItem) {
                sap.m.MessageBox.information("Reprocessing is not allowed for status - 'Duplicate', 'Approved', 'Rejected' and 'Validated'");
                return;
            }

            const entityStrings = this.getView().byId("table").getSelectedContextPaths();
            const tableBinding = this.getView().byId("table").getSelectedItems();
            const payloads = entityStrings.map((entry, index) => {
                const paramString = entry.substring(entry.indexOf('(') + 1, entry.lastIndexOf(')'));
                const pairs = paramString.split(',');

                const payload = {};

                pairs.forEach(pair => {
                    let [key, value] = pair.split('=');

                    key = key.trim();

                    // Skip the Uniqueidentifier field
                    // if (key === 'Uniqueidentifier') return;

                    // Clean and decode value
                    value = decodeURIComponent(value.replace(/^'/, '').replace(/'$/, ''));
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;

                    payload[key] = value;
                });

                // Add extra fields
                payload["FileLink"] = tableBinding[index].getCells()[7].getText();
                payload["FileDataXString"] = tableBinding[index].getCells()[8].getValue();
                payload["ProcessStatus"] = "Extraction Started";

                return payload;
            });

            this.reprocessPayload = JSON.parse(JSON.stringify(payloads));
            //console.log(this.reprocessPayload);
            payloads.forEach(obj => {
                delete obj.Uniqueidentifier;
            });
            //console.log(payloads);

            let appUrl = sap.ui.require.toUrl("invoice");
            let endPointUrl = `/cpi/http/CallInvoiceHttp`;

            var that = this;
            let allSucceeded = true;
            for (let index = 0; index < payloads.length; index++) {
                $.ajax({
                    url: appUrl + endPointUrl,
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(payloads[index]),
                    async: false,
                    success: function (data) {

                    },
                    error: function (err) {
                        if (err.status !== 200) {
                            allSucceeded = false;
                            console.error("CPI Error:", err.responseText);
                        }
                    }
                });
            }
            // Show one message at the end
            if (allSucceeded) {
                that.saveDataToInvoiceEntity();
                MessageBox.information("Record(s) has been submitted to reprocess");
            } else {
                MessageBox.error("Some records failed to submit to CPI. Please check the console for details.");
                sap.ui.core.BusyIndicator.hide();
            }

        },


        saveDataToInvoiceEntity: async function () {
            var oView = this.getView();
           
            for (let index = 0; index < this.reprocessPayload.length; index++) {
                const selItem = this.reprocessPayload[index];

                try {
                    let oModel = this.getView().getModel();

                    const oBindList = oModel.bindList("/ZPS_C_EINVOICE", undefined, [], [
                        new sap.ui.model.Filter("FacilityShortCode", sap.ui.model.FilterOperator.EQ, selItem.FacilityShortCode),
                        new sap.ui.model.Filter("Uniqueidentifier", sap.ui.model.FilterOperator.EQ, selItem.Uniqueidentifier),
                    ]);

                    const aContexts = await oBindList.requestContexts();

                    if (aContexts.length === 0) {
                        throw new Error("No data found for FacilityShortCode");
                    }

                    const oContext = aContexts[0];
                    // Map of input IDs to model property names
                    const fieldMappings = {
                        Rescheduled: "Rescheduled"
                    };
                    // Iterate and set properties
                    Object.entries(fieldMappings).forEach(([fieldId, property]) => {
                        oContext.setProperty("Rescheduled", true);
                    });
                } catch (err) {
                    sap.m.MessageBox.error("Update failed: " + err.message);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            }
        },

        // onSaveAsTile: function () {
        //     if (sap.ushell && sap.ushell.Container) {
        //         var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
        //         var sHash = oCrossAppNav.hrefForExternal({
        //             target: {
        //                 shellHash: window.location.hash.substr(1)
        //             }
        //         });

        //         var oData = {
        //             title: "My Fiori Tile",
        //             url: "#" + sHash
        //         };

        //         sap.ushell.Container.getService("LaunchPage").addTile(oData).then(function () {
        //             sap.m.MessageToast.show("Tile saved to Fiori Launchpad");
        //         });
        //     } else {
        //         sap.m.MessageToast.show("Save as Tile not available outside Fiori Launchpad");
        //     }
        // }

    });
});