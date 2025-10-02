sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "invoice/model/formatter",
    "sap/ui/core/Fragment",
    "sap/base/security/URLWhitelist",
    "sap/m/MessageBox",
], (Controller, JSONModel, formatter, Fragment, URLWhitelist, MessageBox) => {
    "use strict";

    return Controller.extend("invoice.controller.Detail", {

        formatter: formatter,
        pageData: null,
        initialReadData: null,
        selInputForF4: null,
        // _iSkip: 0,
        // _iTop: 100,
        // _aLoadedData: [],
        // _sLastSearchValue: "",
        onInit: async function () {
            let oModel = new JSONModel({
                editOnly: false,
                readOnly: true,
                showEditBtn: true,
                showUser: true,
                showTotalUsageBreakDown: false
            })
            this.getView().setModel(oModel, "visibilityModel");

            var monthData = {
                "months": [
                    { "key": "January", "name": "January" },
                    { "key": "February", "name": "February" },
                    { "key": "March", "name": "March" },
                    { "key": "April", "name": "April" },
                    { "key": "May", "name": "May" },
                    { "key": "June", "name": "June" },
                    { "key": "July", "name": "July" },
                    { "key": "August", "name": "August" },
                    { "key": "September", "name": "September" },
                    { "key": "October", "name": "October" },
                    { "key": "November", "name": "November" },
                    { "key": "December", "name": "December" }
                ]
            };
            var oMonthModel = new JSONModel(monthData);
            this.getView().setModel(oMonthModel, "monthModel");

            // var statusData = {
            //     "Statuses": [
            //         { key: "action1", text: "Validated", visible: true },
            //         { key: "action2", text: "Duplicate", visible: true },
            //         { key: "action3", text: "In Progress", visible: true },
            //         { key: "action4", text: "Ready for Review", visible: true },
            //         { key: "action5", text: "Approved", visible: true }
            //     ]
            // };
            // var statsModel = new sap.ui.model.json.JSONModel(statusData);
            // // Filter items manually
            // var aItems = statsModel.getProperty("/Statuses");
            // var aFiltered = aItems.filter(function (item) {
            //     return item.visible; // Only keep visible ones
            // });
            // statsModel.setProperty("/FilteredStatuses", aFiltered);
            // // Set model to the view
            // this.getView().setModel(statsModel, "statusModel");




            this._iEvent = 0;
            await this.getUserDetail();

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteView1").attachPatternMatched(this._onObjectMatched, this);

        },

        activateBackButtonTracking: function (evt) {
            if (this.getView().byId("lockIcon").getIcon().split("//")[1] === 'unlocked' && this.getView().byId("saveBtn").getEnabled() === true) {
                sap.m.MessageBox.confirm("Are you sure you want to leave this page without saving?", {
                    title: "Confirm Navigation",
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.OK) {
                            this.resetLockToUnlock();
                            this.getOwnerComponent().getRouter().navTo("RouteHome");
                        }
                    }.bind(this)
                });
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteHome");
            }
        },


        // handleChange: function (oEvent) {
        //     var oText = this.byId("textResult"),
        //         oDP = oEvent.getSource(),
        //         sValue = oEvent.getParameter("value");

        //     this._iEvent++;
        //     oText.setText("Change - Event " + this._iEvent + ": DatePicker " + oDP.getId() + ":" + sValue);
        // },

        _onObjectMatched: async function (oEvent) {
            const args = oEvent.getParameter("arguments");

            // Decode parameters
            const sFacility = decodeURIComponent(args.facility);
            const sId = decodeURIComponent(args.id);
            const sCreated = decodeURIComponent(args.created);
            const sIsActive = decodeURIComponent(args.active);
            const sAccNumCirah = decodeURIComponent(args.cirah);

            // Build the entity key path for OData V4
            this.sPath = `/ZPS_C_EINVOICE(FacilityShortCode='${sFacility}',Uniqueidentifier='${sId}',CreatedOnBLOB=${sCreated},IsActiveEntity=${sIsActive},AccountNumberCirah=${sAccNumCirah})`;

            let oModel = this.getView().getModel();

            const aCombinedFilter = new sap.ui.model.Filter([
                new sap.ui.model.Filter("FacilityShortCode", sap.ui.model.FilterOperator.EQ, sFacility),
                new sap.ui.model.Filter("Uniqueidentifier", sap.ui.model.FilterOperator.EQ, sId),
                new sap.ui.model.Filter("CreatedOnBLOB", sap.ui.model.FilterOperator.EQ, sCreated),
                new sap.ui.model.Filter("IsActiveEntity", sap.ui.model.FilterOperator.EQ, sIsActive),
                new sap.ui.model.Filter("AccountNumberCirah", sap.ui.model.FilterOperator.EQ, sAccNumCirah)


            ], true); // 'true' sets AND condition

            // oModel.bindList("/ZPS_C_EINVOICE", undefined, undefined, aCombinedFilter, undefined).requestContexts().then(function (aContexts) {
            //     aContexts.forEach(oContext => {
            //         //console.log(oContext.getObject());
            //         let oModel = new JSONModel(oContext.getObject());
            //         this.getView().setModel(oModel, "invoiceData");
            //     });
            // });

            sap.ui.core.BusyIndicator.show(0); // Show immediately
            oModel.bindList("/ZPS_C_EINVOICE", undefined, undefined, aCombinedFilter, undefined)
                .requestContexts()
                .then((aContexts) => {
                    aContexts.forEach(oContext => {
                        const oJSONModel = new sap.ui.model.json.JSONModel(oContext.getObject());

                        if (oContext.getObject().FiscalYear) {
                            oJSONModel.getData().FiscalYear = new Date(oContext.getObject().FiscalYear);
                            oJSONModel.getData().FiscalYearOnly = oJSONModel.getData().FiscalYear.getFullYear();
                        } else {
                            oJSONModel.getData().FiscalYear = null;
                            oJSONModel.getData().FiscalYearOnly = null;
                        }

                        this.getView().setModel(oJSONModel, "invoiceData");

                        this.initialReadData = oContext.getObject();

                        //this.getView().getModel("invoiceData").refresh();

                        let url = oContext.getObject().FileLink;
                        const fileName = decodeURIComponent(url.split('/').pop());
                        let aModel = new JSONModel({
                            Source: url,
                            Title: fileName,
                            hardcodedTex: "File"
                        });
                        this.getView().setModel(aModel, "pdfData");

                        //url = 'https://microsoft.sharepoint.com/teams/Constellation242/_layouts/15/embed.aspx?UniqueId=25ae572d-b06f-4e48-add3-8ea8f6936427';
                        var sIframeHTML = `
                              <iframe 
                                src="${url}" 
                                height="550" 
                                frameborder="0" 
                                scrolling="no" 
                                allowfullscreen >
                              </iframe>
                            `;
                        this.getView().byId("iframeHtml").setContent(sIframeHTML);

                        // let status = oContext.getObject().ProcessStatus;
                        // let vModel = this.getView().getModel("visibilityModel");
                        // const allowedStatuses = [
                        //     "Duplicate",
                        //     "Validated"
                        // ];
                        // if (allowedStatuses.includes(status)) {
                        //     vModel.setProperty("/showEditBtn", false);
                        // }




                        //this._fetchPDFMediaStream(); //Genarte the PDF from DB

                        this._loadPdfFromBase64(this.initialReadData.FileDataXString); //Genarte the PDF Locally



                        const status = oContext.getObject().ProcessStatus;
                        const allowedStatuses = ["Duplicate", "Validated", "Approved", "Rejected"];

                        this.getView().getModel("visibilityModel").setProperty(
                            "/showEditBtn",
                            !allowedStatuses.includes(status)
                        );


                        this.onStatusChange("Validated"); //Permanently ReadOnly

                        this.readAllFieldLevelLogChangeDetail();


                        this.pageData = oContext.getObject();

                        this.getView().byId("editBtn").setEnabled(true);
                        if (oContext.getObject().Locked) {
                            this.getView().byId("lockIcon").setIcon("sap-icon://locked");
                            this.getView().byId("lockIcon").setTooltip("Locked");
                        } else {
                            this.getView().byId("lockIcon").setIcon("sap-icon://unlocked");
                            this.getView().byId("lockIcon").setTooltip("UnLocked");
                        }


                        // this.getView().byId("lockIcon").setTooltip("Clik on Edit to check status");

                        this.getView().getModel("visibilityModel").setProperty(
                            "/showTotalUsageBreakDown", false
                        );


                    });
                })
                .catch((err) => {
                    console.error("Data load error:", err);
                    sap.ui.core.BusyIndicator.hide();
                })

        },

        onEditPress: function (evt) {

            var userData = this.getView().getModel("userData").getData();
            let payload = {
                Locked: true,
                LockedOn: this.formatToISOStringNoMicroseconds(new Date()), // "2025-07-24T06:20:06.652521Z",
                LockedBy: userData.id,
            };

            if (this.getView().byId("statusBox").getSelectedKey() === 'Ready for Review') {
                this.getView().byId("statusBox2").setSelectedKey("In Progress");
            } else if (this.getView().byId("statusBox").getSelectedKey() === 'In Progress') {
                this.getView().byId("statusBox2").setSelectedKey("In Progress");
            }

            let data = this.pageData;
            if (data.Locked) {
                this.getView().byId("lockIcon").setIcon("sap-icon://locked");
                this.getView().byId("lockIcon").setTooltip("Locked");

                let lockTime = this.formatISOToLocalDateTime(data.LockedOn);
                let timeDiff = this.getTimeDifferenceInMinutes(data.LockedOn, payload.LockedOn);
                let sameUser = userData.fullName.toUpperCase() === data.ChangedByUname.toUpperCase() ? true : false;

                if (timeDiff < 30 && !sameUser) {
                    MessageBox.information(
                        `Facility Code "${data.FacilityShortCode}" is currently locked for editing by ${data.LockedByUname} at ${lockTime}.\n You will be able to overwrite in 30 mins.`,
                        {
                            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            emphasizedAction: MessageBox.Action.OK,
                            dependentOn: this.getView()
                        }
                    );
                } else {
                    const oDialog = new sap.m.Dialog({
                        title: `Locked by ${data.LockedBy}`,
                        type: "Message",
                        customHeader: new sap.m.OverflowToolbar({
                            content: [
                                new sap.ui.core.Icon({
                                    src: "sap-icon://warning",
                                    color: "#e9730c"
                                }),
                                new sap.m.Title({ text: "Warning" })
                            ]
                        }),
                        content: new sap.m.Text({
                            text: `Facility Code "${data.FacilityShortCode}" is currently locked for editing by ${data.LockedByUname} at ${lockTime}.\n Do you want to override?`
                        }),
                        beginButton: new sap.m.Button({
                            icon: "sap-icon://accept",
                            text: "Override",
                            press: function () {
                                payload.Locked = false;
                                this.getParent().close();

                                that.getView().byId("lockIcon").setIcon("sap-icon://unlocked");
                                that.getView().byId("lockIcon").setTooltip("UnLocked");
                                that.onEditUpdateLock(payload);
                                that.onStatusChange("In Progress");
                            }
                        }),
                        endButton: new sap.m.Button({
                            icon: "sap-icon://cancel",
                            text: "Cancel",
                            press: function () {
                                oDialog.close();
                            }
                        }),
                        afterClose: function () {
                            oDialog.destroy();
                        }
                    });
                    const that = this;
                    //this.getView().byId("editBtn").setEnabled(true);
                    oDialog.open();
                }
            } else {
                this.getView().byId("lockIcon").setIcon("sap-icon://unlocked");
                this.getView().byId("lockIcon").setTooltip("UnLocked");

                this.onEditUpdateLock(payload);
                this.onStatusChange("In Progress");
                // this.getView().byId("editBtn").setEnabled(true);
            }


        },

        onLockedBtnPress: function (oEvent) {
            const oButton = oEvent.getSource();
            if (oButton.getIcon().split("//")[1] === 'locked') {
                const oView = this.getView();
                const oModel = oView.getModel("visibilityModel");
                const pageData = this.pageData;
                const lockTimeDetail = this.formatISOToLocalDateTime(pageData.LockedOn);

                if (!this._pResizablePopOvrLock) {
                    this._pResizablePopOvrLock = Fragment.load({
                        id: oView.getId(),
                        name: "invoice.fragment.LockInfo",
                        controller: this
                    }).then(function (oPopover) {
                        oView.addDependent(oPopover);
                        return oPopover;
                    });
                }
                this._pResizablePopOvrLock.then(function (oPopover) {
                    const oForm = oPopover.getContent?.()[0];
                    if (oButton.getIcon().split("//")[1] === 'unlocked') {
                        oModel.setProperty("/showUser", false);
                    } else {
                        oModel.setProperty("/showUser", true);
                    }
                    oForm.getContent()[1].setText(pageData.LockedByUname);
                    oForm.getContent()[3].setText(lockTimeDetail);
                    let icon = oView.byId("lockIcon").getIcon().split("//")[1];
                    if (icon === "status-inactive") {
                        return;
                    } else if (icon === "unlocked") {
                        oPopover.setTitle("Editing By");
                    } else {
                        oPopover.setTitle("Locked By");
                    }
                    oPopover.openBy(oButton);
                });
            }
        },

        onStatusChange: function (sText) {
            let oModel = this.getView().getModel("visibilityModel");
            let i18nText = this.getView().getModel("i18n");
            if (sText === i18nText.getProperty("action3")) {
                oModel.setProperty("/editOnly", true);
                oModel.setProperty("/readOnly", false);
                oModel.setProperty("/notesEdit", true);
            } else {
                oModel.setProperty("/editOnly", false);
                oModel.setProperty("/readOnly", true);
                oModel.setProperty("/notesEdit", false);
            }
            oModel.refresh();
        },


        getUserDetail: function () {
            var that = this;
            let appUrl = sap.ui.require.toUrl("invoice");
            jQuery.ajax({
                //url: `/1ab363ba-5599-48a3-90f0-1442b0954f6b.invoice.invoice-0.0.1/sap/bc/ui2/start_up`,
                //url: `/sap/bc/ui2/start_up`,
                url: appUrl + `/sap/bc/ui2/start_up`,
                method: "GET",
                success: function (data) {
                    var oUserDataModel = new sap.ui.model.json.JSONModel(data);
                    that.getView().setModel(oUserDataModel, "userData"); // Use 'that' instead of 'this'
                    console.log("User data model created:", oUserDataModel);
                },
                error: function (xhr, status, error) {
                    console.error("Error:", error);
                }
            });
        },


        resetValueStatesToNone: function (view) {
            const controlIds = [
                "basicField3",
                "scanField1",
                "scanField2",
                "scanField3",
                "scanField4",
                "scanField5",
                "scanField6",
                "scanField7",
                "scanField8",
                "scanField9",
                "scanField10",
                "scanField11",
                "scanField12",
                "uomInput",
                "currencyInput"
            ];

            controlIds.forEach((id) => {
                const control = view.byId(id);
                if (control && typeof control.setValueState === "function") {
                    control.setValueState("None");
                } else {
                    console.warn(`Control '${id}' not found or doesn't support setValueState`);
                }
            });
        },



        onSavePress: function () {
            var oView = this.getView();
            var iValid = true;
            var aInvalidFields = [];

            var aFieldsToCheck = [
                { id: "scanField1", label: "Service Start", type: "date" },
                { id: "scanField2", label: "Service End", type: "date" },
                { id: "scanField3", label: "Due Date", type: "date" },
                { id: "scanField4", label: "Account Number", type: "text" },
                { id: "scanField5", label: "Vendor Invoice", type: "text" },
                { id: "currencyInput", label: "Currency Input", type: "text" },
                { id: "uom7", label: "Unit of Measure (Total Usage)", type: "text" },
                { id: "uom8", label: "Unit of Measurev (Total Usage OH)", type: "text" },
                { id: "uom9", label: "Unit of Measure (PUE Factored Usage)", type: "text" },
                { id: "uom10", label: "Unit of Measure (PUE Actual)", type: "text" },
                { id: "uom11", label: "Unit of Measure (PUE Cap)", type: "text" },
                { id: "uomInput", label: "Unit of Measure (Total Usage Units)", type: "text" },
                // { id: "scanField6", label: "Total Usage", type: "text" },
                // { id: "scanField7", label: "Total Usage OH", type: "text" },
                // { id: "scanField8", label: "PUE Factored Usage", type: "text" },
                // { id: "scanField9", label: "PUE Actual", type: "text" },
                // { id: "scanField10", label: "PUE Cap", type: "text" },
                // { id: "scanField11", label: "", type: "text" },
                // { id: "scanField12", label: "Total Charges", type: "text" }
            ];

            aFieldsToCheck.forEach(function (field) {
                var oControl = oView.byId(field.id);
                if (oControl) {
                    var bIsEmpty = (field.type === "date") ?
                        !oControl.getDateValue() :
                        !oControl.getValue();
                    if (bIsEmpty) {
                        iValid = false;
                        oControl.setValueState("Error");
                        aInvalidFields.push("- " + field.label);
                    } else {
                        oControl.setValueState("None");
                    }
                }
            });


            var isTotalChargesSame = true;
            if (this.getView().getModel("visibilityModel").getProperty("/showTotalUsageBreakDown")) {
                var isTotalChargesSame = this.checkTotalChargesSUM();
            }

            if (iValid && isTotalChargesSame) {
                this.savePostDataAndLogToDB();
            } else {
                var sMsg;
                if (!isTotalChargesSame) {
                    sMsg = "Sum of 'Invoice Total Charge Human' in breakdown must be equal to 'Total Charges Human' field";
                } else {
                    sMsg = "Below Human fields cannot be blank:\n\n" + aInvalidFields.join("\n");
                }

                if (!this.oErrorSaveMsgDialog) {
                    this.oErrorSaveMsgDialog = new sap.m.Dialog({
                        type: sap.m.DialogType.Message,
                        title: "Error",
                        state: "Error",
                        content: new sap.m.Text({ text: sMsg }),
                        beginButton: new sap.m.Button({
                            type: sap.m.ButtonType.Emphasized,
                            text: "OK",
                            press: function () {
                                this.oErrorSaveMsgDialog.close();
                            }.bind(this)
                        })
                    });
                } else {
                    // update the message if dialog already exists
                    this.oErrorSaveMsgDialog.getContent()[0].setText(sMsg);
                }

                this.oErrorSaveMsgDialog.open();
            }
        },


        savePostDataAndLogToDB: async function () {
            const oView = this.getView();
            const oModel = oView.getModel();

            sap.ui.core.BusyIndicator.show(0);

            try {
                const facilityCode = oView.byId("facilityCode").getValue();
                const uniqId = oView.byId("uniqId").getText();

                const oBindList = oModel.bindList("/ZPS_C_EINVOICE", undefined, [], [
                    new sap.ui.model.Filter("FacilityShortCode", sap.ui.model.FilterOperator.EQ, facilityCode),
                    new sap.ui.model.Filter("Uniqueidentifier", sap.ui.model.FilterOperator.EQ, uniqId)
                ]);

                const aContexts = await oBindList.requestContexts();

                if (aContexts.length === 0) {
                    throw new Error("No data found for FacilityShortCode");
                }

                const oContext = aContexts[0];

                // Map of input IDs to model property names
                const fieldMappings = {
                    // Basic Fields
                    basicField2: "ServiceMonth",
                    basicField3: "ExtractedDate",
                    basicField4: "Source",
                    basicField5: "FiscalYear",
                    basicField6: "CommodityType",
                    basicField7: "ProviderName",
                    basicField8: "Daysbilled",
                    basicField9: "PoNumber",
                    basicField10: "MsInvoiceNumber",
                    basicField11: "InvoiceType",
                    basicField12: "Region",

                    // Scan Fields
                    scanField1: "ServiceStartHuman",
                    scanField2: "ServiceEndHuman",
                    scanField3: "InvoiceDueDateHuman",
                    scanField4: "AccountNumberHuman",
                    scanField5: "VendorInvoiceNumberHuman",
                    scanField6: "CommodityTotalUsageHuman",
                    //scanField7: "CommodityTotalUsageOhHuman",
                    scanField8: "PueFactoredUsageHuman",
                    scanField9: "PueActualHuman",
                    scanField10: "PueCapHuman",
                    //scanField11: "TotalUsageUnitsHuman",
                    scanField12: "CommodityTotalChargesHuman",

                    // Other Inputs
                    uomInput: "UnitofmeasureHuman",
                    currencyInput: "CurrencyHuman",
                    notesId: "Notes",

                    lock: "Locked",
                    statusBox: "ProcessStatus",
                    statusBox2: "ProcessStatus"
                };

                // Iterate and set properties
                Object.entries(fieldMappings).forEach(([fieldId, property]) => {
                    const oControl = oView.byId(fieldId);
                    if (oControl) {
                        let value = oControl.getValue?.() ?? oControl.getText?.(); // Support both Input and Text
                        if (fieldId === "basicField5" || fieldId === "scanField1" || fieldId === "scanField2" || fieldId === "scanField3" || fieldId === "basicField3") {
                            value = this.formatDateToYYYYMMDD(oView.byId(fieldId).getDateValue()); //value = "2025-01-01";
                            if (!value) {
                                value = null;
                            }
                        }
                        if (fieldId === "lock") {
                            value = false;
                        }
                        if (fieldId === "basicField8") {
                            value = Number(value); // Special case: numeric
                        }
                        if (fieldId === "basicField2" || fieldId === 'statusBox2') { //Select
                            value = oControl.getSelectedItem().getText();
                        }
                        oContext.setProperty(property, value);
                    }
                });

                this.onStatusChange("Validated"); //Make Read Only
                this.getView().byId("editBtn").setEnabled(true); // Post SAVE make Edit btn Visible.


                this.saveLogs();

                if (this.checkTotalChargesSUM()) {
                    this.saveTotalChargeBreakDown();
                }

            } catch (err) {
                sap.m.MessageBox.error("Update failed: " + err.message);
            } finally {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Saved successfully");
                this._refreshUiPageWithDBData();
            }
        },

        /*For Saving Logs*/
        saveLogs: async function () {
            //This to collect and check if any field is edited for LOG
            const oView = this.getView();
            const oModel = oView.getModel();
            var changedData = this.getView().getModel("invoiceData").getData();
            var initialData = this.initialReadData;

            if (!changedData || !initialData) {
                console.error("Missing data for comparison");
                return;
            }

            const differences = {};

            const humanValueFieldsWithUnits = [
                "CommodityTotalUsageHuman",     // Total Usage
                //"CommodityTotalUsageOhHuman",   // Total Usage OH
                "PueFactoredUsageHuman",        // PUE Factored Usage
                "PueActualHuman",               // PUE Actual
                "PueCapHuman"                  // PUE Cap
                // "TotalUsageUnitsHuman"          // Total Usage Units
            ];

            const unitField = "UnitofmeasureHuman";
            const currencyField = "CurrencyHuman";
            const chargeField = "CommodityTotalChargesHuman";

            const initialUnit = initialData[unitField];
            const changedUnit = changedData[unitField];

            const initialCurrency = initialData[currencyField];
            const changedCurrency = changedData[currencyField];

            const unitChanged = initialUnit !== changedUnit;
            const currencyChanged = initialCurrency !== changedCurrency;

            // Track currency field change
            if (currencyChanged) {
                differences[currencyField] = {
                    OldValue: initialCurrency,
                    NewValue: changedCurrency
                };
            }

            for (const key in initialData) {
                if (initialData.hasOwnProperty(key) && key.endsWith("Human")) {
                    const oldVal = initialData[key];
                    const newVal = changedData[key];

                    const isUnitBasedField = humanValueFieldsWithUnits.includes(key);
                    const isChargeField = key === chargeField;

                    const forceIncludeDueToUnitChange = unitChanged && isUnitBasedField;
                    const forceIncludeDueToCurrencyChange = currencyChanged && isChargeField;

                    if (oldVal !== newVal || forceIncludeDueToUnitChange || forceIncludeDueToCurrencyChange) {
                        let oldDisplay = oldVal;
                        let newDisplay = newVal;

                        if (isChargeField) {
                            oldDisplay = `${oldVal} ${initialCurrency}`;
                            newDisplay = `${newVal} ${changedCurrency}`;
                        } else if (isUnitBasedField) {
                            oldDisplay = `${oldVal} ${initialUnit}`;
                            newDisplay = `${newVal} ${changedUnit}`;
                        }

                        differences[key] = {
                            OldValue: oldDisplay,
                            NewValue: newDisplay
                        };
                    }
                }
            }

            delete differences["CurrencyHuman"];
            delete differences["UnitofmeasureHuman"];

            // Step 2: Extract Invoice UID from binding path
            var match = this.sPath?.match(/Uniqueidentifier='([^']+)'/);
            var invoiceUID = match ? match[1] : null;

            if (!invoiceUID) {
                console.error("Invoice UID could not be extracted.");
                return;
            }

            // Step 3: Build final payload
            function buildChangePayload(differences, invoiceUID) {
                return Object.keys(differences).map(function (fieldName) {
                    var diff = differences[fieldName];
                    return {
                        Invoice_UID: invoiceUID,
                        FieldName: fieldName,
                        OldValue: diff.OldValue === null ? "" : diff.OldValue,
                        NewValue: diff.NewValue === null ? "" : diff.NewValue,
                        ChangeReason: "Fixed Text"
                    };
                });
            }
            const aLogPayload = buildChangePayload(differences, invoiceUID);

            // Step 4: POst the log to BAckend
            try {
                const oBindList = oModel.bindList("/ZPS_I_EINV_LOG");
                // POST each entry
                for (const entry of aLogPayload) {
                    await oBindList.create(entry);
                }
                //sap.m.MessageToast.show("Change log saved successfully.");
            } catch (err) {
                sap.m.MessageBox.error("Save failed: " + err.message);
            }


            // Ensure the model is not in a dirty/failed state before calling bindList
            await oModel.resetChanges("updateGroup");  // or "$auto"
        },


        resetLockToUnlock: async function () {
            let oModel = this.getView().getModel();
            const facilityCode = this.getView().byId("facilityCode").getValue();
            const uniqId = this.getView().byId("uniqId").getText();

            const oBindList = oModel.bindList("/ZPS_C_EINVOICE", undefined, [], [
                new sap.ui.model.Filter("FacilityShortCode", sap.ui.model.FilterOperator.EQ, facilityCode),
                new sap.ui.model.Filter("Uniqueidentifier", sap.ui.model.FilterOperator.EQ, uniqId)
            ]);

            const aContexts = await oBindList.requestContexts();
            const oContext = aContexts[0];

            oBindList.requestContexts().then(function (aContexts) {
                aContexts[0].setProperty("Locked", false);
            });

        },

        onValueHelpPress: function (oEvent) {
            const oSrcPath = oEvent.getSource().getBinding("value").getPath();
            const isUnitOfMeasure = oSrcPath === "/UnitofmeasureHuman";
            const dialogIndex = isUnitOfMeasure ? 0 : 1;
            const that = this;
            this.selInputForF4 = oEvent.getSource();

            function openDialog(dialog) {
                dialog.getContent()[dialogIndex].open();
            }

            if (!this._oValueHelpDialog) {
                Fragment.load({
                    name: "invoice.fragment.ProductValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    that._oValueHelpDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    if (dialogIndex) {
                        that.onSearchCurrency("blank");
                    } else {
                        that.onSearchUOM("blank");
                    }
                    openDialog(oDialog);
                });
            } else {
                if (dialogIndex) {
                    that.onSearchCurrency("blank");
                } else {
                    that.onSearchUOM("blank");
                }
                openDialog(this._oValueHelpDialog);
            }
        },

        onSearchUOM: async function (oEvent) {
            let sValue;
            if (oEvent === "blank") {
                sValue = "";
            } else {
                sValue = oEvent.getParameter("value") || "";
            }
            // const safeValue = sValue.replace(/'/g, "''"); // escape single quotes

            const oModel = this.getView().getModel();

            const aCombinedFilter = new sap.ui.model.Filter([
                new sap.ui.model.Filter("UnitOfMeasure_Text", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("UnitOfMeasure", sap.ui.model.FilterOperator.Contains, sValue)
            ], false);


            /* Loading as standard approach*/
            // oModel.bindList("/I_UnitOfMeasure", undefined, undefined, aCombinedFilter, undefined)
            //     .requestContexts()
            //     .then((aContexts) => {
            //         const aData = aContexts.map(oContext => oContext.getObject());
            //         const oUomModel = new JSONModel(aData);
            //         this.getView().setModel(oUomModel, "uomModel");
            //         this.getView().getModel("uomModel").refresh();
            //     })
            //     .catch((err) => {
            //         console.error("Data load error:", err);
            //     });

            /* Force Loading All */
            oModel.bindList("/I_UnitOfMeasure", undefined, undefined, aCombinedFilter, undefined)
                .requestContexts(0, 1000) // start at 0, fetch 1000 items
                .then((aContexts) => {
                    const aData = aContexts.map(oContext => oContext.getObject());
                    const oUomModel = new JSONModel(aData);
                    this.getView().setModel(oUomModel, "uomModel");
                    this.getView().getModel("uomModel").refresh();
                })
                .catch((err) => {
                    console.error("Data load error:", err);
                });
        },

        onSearchCurrency: async function (oEvent) {
            let sValue;
            if (oEvent === "blank") {
                sValue = "";
            } else {
                sValue = oEvent.getParameter("value") || "";
            }
            // const safeValue = sValue.replace(/'/g, "''"); // escape single quotes

            const oModel = this.getView().getModel();

            // Inner OR filter
            const oOrFilter = new sap.ui.model.Filter([
                new sap.ui.model.Filter("Currency", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("CurrencyName", sap.ui.model.FilterOperator.Contains, sValue)
            ], false); // false = OR

            // Outer AND filter with Language = 'EN'
            const aCombinedFilter = new sap.ui.model.Filter([
                new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, 'EN'),
                oOrFilter
            ], true); // true = AND

            // oModel.bindList("/I_CurrencyText", undefined, undefined, aCombinedFilter, undefined)
            //     .requestContexts()
            //     .then((aContexts) => {
            //         const aData = aContexts.map(oContext => oContext.getObject());
            //         const currModel = new JSONModel(aData);
            //         this.getView().setModel(currModel, "currencyModel");
            //         this.getView().getModel("currencyModel").refresh();
            //     })
            //     .catch((err) => {
            //         console.error("Data load error:", err);
            //     });


            /* Force Loading All */
            oModel.bindList("/I_CurrencyText", undefined, undefined, aCombinedFilter, undefined)
                .requestContexts(0, 1000) // start at 0, fetch 1000 items
                .then((aContexts) => {
                    const aData = aContexts.map(oContext => oContext.getObject());
                    const currModel = new JSONModel(aData);
                    this.getView().setModel(currModel, "currencyModel");
                    this.getView().getModel("currencyModel").refresh();
                })
                .catch((err) => {
                    console.error("Data load error:", err);
                });
        },


        onSelectVhelp: function (evt) {
            let oInput;
            const oTitle = evt.getSource().getTitle();
            if (oTitle === 'Currencies') {
                //oInput = this.byId("currencyInput");
                oInput = this.selInputForF4;
            } else {
                oInput = this.byId("uomInput");
            }


            const oSelectedItem = evt.getParameter("selectedItem");

            if (!oSelectedItem) {
                //oInput.resetProperty("value");
                return;
            }

            const match = oSelectedItem.getTitle().match(/\(\s*(.*?)\s*\)/);
            const value = match ? match[1] : "";
            oInput.setValue(value);
        },


        // onOpenPdf: function () {
        //     const sPdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

        //     // Enable blob and remote display trust
        //     URLWhitelist.add("https://morth.nic.in");

        //     const oPdfViewer = new sap.m.PDFViewer({
        //         source: sPdfUrl,
        //         title: "Motor Transport PDF",
        //         isTrustedSource: true
        //     });

        //     this.getView().addDependent(oPdfViewer);
        //     oPdfViewer.open();
        // },



        // handlePopoverPress: function (oEvent) {
        //     var oButton = oEvent.getSource(),
        //         oView = this.getView(),
        //         sType = oEvent.getSource().getType() === 'Accept' ? 'Success' : 'Warning' ,
        //         oTitle = oEvent.getSource().getBinding("text").getPath(),
        //         sReasonMsg = oEvent.getSource().getParent().getItems()[2].getText();
        //     if (!this._pResizablePopover) {
        //         this._pResizablePopover = Fragment.load({
        //             id: oView.getId(),
        //             name: "invoice.fragment.CIRAHInfo",
        //             controller: this
        //         }).then(function (oPopover) {
        //             oView.addDependent(oPopover);
        //             return oPopover;
        //         });
        //     }
        //     this._pResizablePopover.then(function (oPopover) {
        //         // Get the model and property value
        //         var oModel = oView.getModel("invoiceData");
        //         var selTitle = oModel.getProperty(oTitle);
        //         oPopover.setTitle(selTitle);
        //         oPopover.getContent()[0].setText(sReasonMsg);
        //         oPopover.getContent()[0].setType(sType);
        //         oPopover.openBy(oButton);
        //     });
        // },

        handlePopoverPress: function (oEvent) {
            const oButton = oEvent.getSource();
            const oView = this.getView();
            const oModel = oView.getModel("invoiceData");

            const sType = oButton.getType() === "Accept" ? "Success" : "Warning";
            // const sBindingPath = oButton.getBinding("text").getPath();
            // const sTitle = oModel.getProperty(sBindingPath);

            const sTitle = oButton.getText();
            const sReasonMsg = oButton.getParent().getItems()[1]?.getText?.() || "";

            if (!this._pResizablePopover) {
                this._pResizablePopover = Fragment.load({
                    id: oView.getId(),
                    name: "invoice.fragment.CIRAHInfo",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }
            this._pResizablePopover.then(function (oPopover) {
                const oContent = oPopover.getContent?.()[0];
                if (oContent) {
                    oPopover.setTitle(sTitle);
                    oContent.setText(sReasonMsg);
                    oContent.setType(sType);
                }
                oPopover.openBy(oButton);
            });

        },


        handleClose: function () {
            this.byId("myResizablePopover").close();
        },

        onEditUpdateLock: async function (payload) {
            const oView = this.getView();
            const oModel = oView.getModel();
            sap.ui.core.BusyIndicator.show(0);

            try {
                const facilityCode = oView.byId("facilityCode").getValue();
                const uniqId = oView.byId("uniqId").getText();

                const oBindList = oModel.bindList("/ZPS_C_EINVOICE", undefined, [], [
                    new sap.ui.model.Filter("FacilityShortCode", sap.ui.model.FilterOperator.EQ, facilityCode),
                    new sap.ui.model.Filter("Uniqueidentifier", sap.ui.model.FilterOperator.EQ, uniqId)
                ]);

                const aContexts = await oBindList.requestContexts();

                if (aContexts.length === 0) {
                    throw new Error("No data found for FacilityShortCode");
                }

                const oContext = aContexts[0];
                Object.entries(payload).forEach(([property, value]) => {
                    oContext.setProperty(property, value);
                });

                // Submit batch update
                await oModel.submitBatch("updateGroup");

                this.resetValueStatesToNone(this.getView());

                sap.m.MessageToast.show("Edit Mode is now enabled");
            } catch (err) {
                sap.m.MessageBox.error("Changing to Edit Mode failed: " + err.message);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        formatToISOStringNoMicroseconds: function (date) {
            if (!(date instanceof Date)) {
                throw new Error("Invalid Date");
            }

            const pad = (num) => String(num).padStart(2, '0');

            const year = date.getUTCFullYear();
            const month = pad(date.getUTCMonth() + 1);
            const day = pad(date.getUTCDate());
            const hours = pad(date.getUTCHours());
            const minutes = pad(date.getUTCMinutes());
            const seconds = pad(date.getUTCSeconds());

            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
        },

        formatISOToLocalDateTime: function (isoString) {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) {
                return "Invalid date";
            }

            return date.toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',    // "Aug"
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true       // For AM/PM format; remove for 24h format
            });
        },


        getTimeDifferenceInMinutes: function (date1, date2) {
            const d1 = (date1 instanceof Date) ? date1 : new Date(date1);
            const d2 = (date2 instanceof Date) ? date2 : new Date(date2);

            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
                throw new Error("Invalid date input(s)");
            }

            const diffMs = Math.abs(d2 - d1);
            return Math.floor(diffMs / (1000 * 60)); // Minutes
        },


        formatDateToYYYYMMDD: function (oDate) {
            if (!(oDate instanceof Date)) {
                return "";
            }

            const year = oDate.getFullYear();
            const month = String(oDate.getMonth() + 1).padStart(2, '0'); // Month is 0-based
            const day = String(oDate.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        },


        fetchFieldLevelLogDetails: function (sInvoiceUID, sFieldName) {
            let oModel = this.getView().getModel();  // OData V4 model
            sap.ui.core.BusyIndicator.show(0); // Show immediately

            // Use the path and parameters properly
            oModel.bindList("/ZPS_I_EINV_LOG", undefined, undefined, undefined, {
                $orderby: "ChangeSeq desc",
                $filter: `Invoice_UID eq '${sInvoiceUID}' and FieldName eq '${sFieldName}'`
            })
                .requestContexts()
                .then((aContexts) => {
                    let data = [];
                    aContexts.forEach(oContext => {
                        data.push(oContext.getObject());
                    });
                    var oJSONModel = new JSONModel(data);
                    this.getView().setModel(oJSONModel, "fieldLogModel");
                    /** Panels should be collapsed **/
                    var aPanels = this.oFieldLevelDialog.getContent()[1].getItems();
                    if (aPanels.length > 0) {
                        aPanels.forEach(function (oPanel) {
                            if (oPanel.setExpanded) {
                                oPanel.setExpanded(false); // collapse the panel
                            }
                        });
                    }
                    this.oFieldLevelDialog.open();
                })
                .catch((err) => {
                    console.error("Data load error:", err);
                })
                .finally(() => {
                    sap.ui.core.BusyIndicator.hide(); // Always hide, success or error
                    if (this.oFieldLevelDialog) {
                        this.oFieldLevelDialog.setBusy(false);
                    }
                });
        },

        // handleFieldLogLevelForPopoverFeature: function (oEvent) {
        //     const oButton = oEvent.getSource();
        //     const oView = this.getView();
        //     //const oModel = oView.getModel("invoiceData");
        //     var sTitle = oEvent.getSource().getParent().getParent().getCells()[0].getText();
        //     var fieldName = oEvent.getSource().getParent().getItems()[0].getBindingPath("value");

        //     this.fetchFieldLevelLogDetails();

        //     if (!this._pFieldLevelPopover) {
        //         this._pFieldLevelPopover = Fragment.load({
        //             id: oView.getId(),
        //             name: "invoice.fragment.FieldLevelLogData",
        //             controller: this
        //         }).then(function (oPopover) {
        //             oView.addDependent(oPopover);
        //             return oPopover;
        //         });
        //     }
        //     this._pFieldLevelPopover.then(function (oPopover) {
        //         oPopover.setTitle("Logs for" + " " + sTitle);
        //         oPopover.openBy(oButton);
        //     });
        // },


        detailLevelBreakDown: function (sInvoiceUID, refresh) {
            let oModel = this.getView().getModel();  // OData V4 model
            sap.ui.core.BusyIndicator.show(0); // Show immediately

            // Use the path and parameters properly
            oModel.bindList("/ZPS_I_EINV_TOTUSAGE", undefined, undefined, undefined, {
                $orderby: "ColocationName asc",
                $filter: `Invoice_UID eq '${sInvoiceUID}'`
            })
                .requestContexts()
                .then((aContexts) => {
                    let data = [];
                    aContexts.forEach(oContext => {
                        data.push(oContext.getObject());
                    });
                    var oJSONModel = new JSONModel(data);
                    this.getView().setModel(oJSONModel, "InvTotUsgBreakDownModel");
                    if (refresh) {
                        return;
                    } else if (!data.length) {
                        sap.m.MessageToast.show("Total charges Breakdown not avaialble");
                    } else {
                        this.getView().getModel("visibilityModel").setProperty(
                            "/showTotalUsageBreakDown", true
                        );
                    }

                    /** Panels should be collapsed **/
                    // let aPanels = this.oBreakdownDialog.getContent()[1].getItems();
                    // if (aPanels.length > 0) {
                    //     aPanels.forEach(function (oPanel) {
                    //         if (oPanel.setExpanded) {
                    //             oPanel.setExpanded(false); // collapse the panel
                    //         }
                    //     });
                    // }
                    // this.oBreakdownDialog.open();
                })
                .catch((err) => {
                    console.error("Data load error:", err);
                })
                .finally(() => {
                    sap.ui.core.BusyIndicator.hide(); // Always hide, success or error
                    if (this.oFieldLevelDialog) {
                        this.oFieldLevelDialog.setBusy(false);
                    }
                });
        },


        openTotalUsageDetailedBreakdownDialog: function (oEvent) {
            const oButton = oEvent.getSource();
            const oView = this.getView();

            const Items = oButton.getParent().getParent().getCells();
            let sTitle;
            if (Items[0].getId().search("box") > 0) {
                sTitle = Items[0].getItems()[0].getText();
            } else {
                sTitle = Items[0].getText();
            }

            let sFieldName = oButton.getParent().getItems()[0].getBindingPath("value");
            if (!sFieldName) {
                sFieldName = oButton.getParent().getItems()[0].getBindingPath("text");
            }

            // Use RegEx to match Uniqueidentifier
            let match = this.sPath.match(/Uniqueidentifier='([^']+)'/);
            let sInvoiceUID = match ? match[1] : null;


            this.detailLevelBreakDown(sInvoiceUID);

            // if (!this.oBreakdownDialog) {
            //     // Load the fragment (XML) and then embed it into the dialog
            //     Fragment.load({
            //         id: oView.getId(),
            //         name: "invoice.fragment.BreakdownDialog",
            //         controller: this
            //     }).then(function (oFragmentContent) {
            //         var oModel = this.getView().getModel("fieldLogModel");
            //         // Create Dialog and set fragment as content
            //         this.oBreakdownDialog = new sap.m.Dialog({
            //             title: "Breakdown for " + sTitle,
            //             content: [oFragmentContent],
            //             contentWidth: "800px",
            //             contentHeight: "325px",
            //             resizable: true,
            //             endButton: new sap.m.Button({
            //                 text: "Close",
            //                 press: function () {
            //                     this.oBreakdownDialog.close();
            //                 }.bind(this)
            //             })
            //         });
            //         oView.addDependent(this.oBreakdownDialog);
            //     }.bind(this));

            // } else {
            //     // Update title dynamically if dialog already exists
            //     this.oBreakdownDialog.setTitle("Breakdown for " + sTitle);
            // }
        },



        handleFieldLogLevelDialogForStatus: function (oEvent) {
            const oView = this.getView();
            const oButton = this.getView().byId("statusBox2");
            var sTitle = "Processing Status";
            let sFieldName = "ProcessStatus";

            // Use RegEx to match Uniqueidentifier
            let match = this.sPath.match(/Uniqueidentifier='([^']+)'/);
            let sInvoiceUID = match ? match[1] : null;


            this.fetchFieldLevelLogDetails(sInvoiceUID, sFieldName.split("/")[1]);
            //this.fetchFieldLevelLogDetails("EAA41537-3C57-1FD0-9A8A-F4173D2B9E76", "PUE_CAP_HUMAN");

            if (!this.oFieldLevelDialog) {
                // Load the fragment (XML) and then embed it into the dialog
                Fragment.load({
                    id: oView.getId(),
                    name: "invoice.fragment.FieldLevelLogDialog",
                    controller: this
                }).then(function (oFragmentContent) {
                    var oModel = this.getView().getModel("fieldLogModel");
                    // Create Dialog and set fragment as content
                    this.oFieldLevelDialog = new sap.m.Dialog({
                        title: "Logs for " + sTitle,
                        content: [oFragmentContent],
                        contentWidth: "400px",
                        contentHeight: "350px",
                        resizable: true,
                        endButton: new sap.m.Button({
                            text: "Close",
                            press: function () {
                                this.oFieldLevelDialog.close();
                            }.bind(this)
                        })
                    });
                    oView.addDependent(this.oFieldLevelDialog);
                    //this.oFieldLevelDialog.setBusy(true);
                }.bind(this));

            } else {
                // Update title dynamically if dialog already exists
                this.oFieldLevelDialog.setTitle("Logs for " + sTitle);
                //this.oFieldLevelDialog.setBusy(true);
            }
        },





        handleFieldLogLevelDialog: function (oEvent) {
            const oButton = oEvent.getSource();
            const oView = this.getView();

            const Items = oButton.getParent().getParent().getCells();
            let sTitle;
            if (Items[0].getId().search("box") > 0) {
                sTitle = Items[0].getItems()[0].getText();
            } else {
                sTitle = Items[0].getText();
            }

            let sFieldName = oButton.getParent().getItems()[0].getBindingPath("value");
            if (!sFieldName) {
                sFieldName = oButton.getParent().getItems()[0].getBindingPath("text");
            }

            // Use RegEx to match Uniqueidentifier
            let match = this.sPath.match(/Uniqueidentifier='([^']+)'/);
            let sInvoiceUID = match ? match[1] : null;


            this.fetchFieldLevelLogDetails(sInvoiceUID, sFieldName.split("/")[1]);
            //this.fetchFieldLevelLogDetails("EAA41537-3C57-1FD0-9A8A-F4173D2B9E76", "PUE_CAP_HUMAN");

            if (!this.oFieldLevelDialog) {
                // Load the fragment (XML) and then embed it into the dialog
                Fragment.load({
                    id: oView.getId(),
                    name: "invoice.fragment.FieldLevelLogDialog",
                    controller: this
                }).then(function (oFragmentContent) {
                    var oModel = this.getView().getModel("fieldLogModel");
                    // Create Dialog and set fragment as content
                    this.oFieldLevelDialog = new sap.m.Dialog({
                        title: "Logs for " + sTitle,
                        content: [oFragmentContent],
                        contentWidth: "400px",
                        contentHeight: "350px",
                        resizable: true,
                        endButton: new sap.m.Button({
                            text: "Close",
                            press: function () {
                                this.oFieldLevelDialog.close();
                            }.bind(this)
                        })
                    });
                    oView.addDependent(this.oFieldLevelDialog);
                    //this.oFieldLevelDialog.setBusy(true);
                }.bind(this));

            } else {
                // Update title dynamically if dialog already exists
                this.oFieldLevelDialog.setTitle("Logs for " + sTitle);
                //this.oFieldLevelDialog.setBusy(true);
            }
        },

        // formatShortDateToISO: function (value) { //This was issue creating issue in US timezone
        //     if (!value) return value;
        //     // Try parsing short date like "8/22/25"
        //     var date = new Date(value);
        //     if (isNaN(date.getTime())) {
        //         return value; // Return original if parsing fails
        //     }
        //     // Format to "YYYY-MM-DD"
        //     var year = date.getFullYear();
        //     var month = String(date.getMonth() + 1).padStart(2, '0');
        //     var day = String(date.getDate()).padStart(2, '0');
        //     return `${year}-${month}-${day}`;
        // },


        formatShortDateToISO: function (value) {
            if (!value) return value;

            // Handle already formatted "YYYY-MM-DD" date
            // Ensure we extract only the date part (no time or offset issues)
            const parts = value.split(/[-\/]/); // handles "2025-09-01" or "8/22/25"

            let year, month, day;

            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // Format is "YYYY-MM-DD"
                    [year, month, day] = parts;
                } else {
                    // Format is "MM/DD/YY" or "M/D/YY"
                    [month, day, year] = parts;

                    // Normalize 2-digit year
                    if (year.length === 2) {
                        year = parseInt(year, 10) < 50 ? '20' + year : '19' + year;
                    }
                }

                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }

            return value; // fallback if unexpected format
        },




        formatNoDataVisible: function (data) {
            // data is usually the array or object bound at '/'
            if (!data) {
                return true; // no data → show text
            }
            if (Array.isArray(data)) {
                return data.length === 0; // empty array → show text
            }
            // For objects or other types, implement your logic accordingly
            return false;
        },



        // onReschedulePressXXXX: function () { //Working but date format is not correct 
        //     var changedData = this.getView().getModel("invoiceData").getData();
        //     var initialData = this.initialReadData;

        //     var differences = {};
        //     for (var key in initialData) {
        //         if (initialData.hasOwnProperty(key) && key.endsWith("Human")) {
        //             var valueA = initialData[key];
        //             var valueB = changedData[key];
        //             if (valueA !== valueB) {
        //                 differences[key] = {
        //                     OldValue: valueA,
        //                     NewValue: valueB
        //                 };
        //             }
        //         }
        //     }
        //     //console.log(differences);

        //     function buildChangePayload(differences, invoiceUID) {
        //         var result = [];

        //         for (var fieldName in differences) {
        //             if (differences.hasOwnProperty(fieldName)) {
        //                 var diff = differences[fieldName];

        //                 result.push({
        //                     Invoice_UID: invoiceUID,
        //                     FieldName: fieldName,
        //                     OldValue: diff.OldValue,
        //                     NewValue: diff.NewValue,
        //                     ChangeReason: "Fixed Text"
        //                 });
        //             }
        //         }

        //         return result;
        //     }

        //     // Use RegEx to match Uniqueidentifier
        //     let match = this.sPath.match(/Uniqueidentifier='([^']+)'/);
        //     let sInvoiceUID = match ? match[1] : null;

        //     var logPayload = buildChangePayload(differences, sInvoiceUID);

        //     console.log(logPayload);

        // },


        _refreshUiPageWithDBData: async function () {
            const sPath = this.sPath;

            // Remove the prefix and suffix
            const match = sPath.match(/\(([^)]+)\)/);
            if (!match || !match[1]) {
                console.error("Invalid sPath format:", sPath);
                return;
            }
            const entityParamsStr = match[1];

            // Parse into key-value pairs
            const keyValuePairs = entityParamsStr.split(',').reduce((acc, part) => {
                const [key, rawVal] = part.split('=');
                const cleanVal = rawVal.replace(/^'|'$/g, ""); // remove quotes if present
                acc[key.trim()] = cleanVal;
                return acc;
            }, {});

            // Now destructure them
            const sFacility = keyValuePairs.FacilityShortCode;
            const sId = keyValuePairs.Uniqueidentifier;
            const sCreated = keyValuePairs.CreatedOnBLOB;
            const sIsActive = keyValuePairs.IsActiveEntity;
            const sAccNumCirah = keyValuePairs.AccountNumberCirah;

            const aCombinedFilter = new sap.ui.model.Filter([
                new sap.ui.model.Filter("FacilityShortCode", sap.ui.model.FilterOperator.EQ, sFacility),
                new sap.ui.model.Filter("Uniqueidentifier", sap.ui.model.FilterOperator.EQ, sId),
                new sap.ui.model.Filter("CreatedOnBLOB", sap.ui.model.FilterOperator.EQ, sCreated),
                new sap.ui.model.Filter("IsActiveEntity", sap.ui.model.FilterOperator.EQ, sIsActive),
                new sap.ui.model.Filter("AccountNumberCirah", sap.ui.model.FilterOperator.EQ, sAccNumCirah)
            ], true);

            let oModel = this.getView().getModel();
            oModel.bindList("/ZPS_C_EINVOICE", undefined, undefined, aCombinedFilter, undefined)
                .requestContexts()
                .then((aContexts) => {
                    aContexts.forEach(oContext => {
                        const oJSONModel = new sap.ui.model.json.JSONModel(oContext.getObject());
                        if (oContext.getObject().FiscalYear) {
                            oJSONModel.getData().FiscalYear = new Date(oContext.getObject().FiscalYear);
                            oJSONModel.getData().FiscalYearOnly = oJSONModel.getData().FiscalYear.getFullYear();
                        } else {
                            oJSONModel.getData().FiscalYear = null;
                            oJSONModel.getData().FiscalYearOnly = null;
                        }

                        this.getView().setModel(oJSONModel, "invoiceData");

                        this.initialReadData = oContext.getObject();

                        this.readAllFieldLevelLogChangeDetail();

                        // Use RegEx to match Uniqueidentifier
                        let match = this.sPath.match(/Uniqueidentifier='([^']+)'/);
                        let sInvoiceUID = match ? match[1] : null;
                        this.detailLevelBreakDown(sInvoiceUID, true); //Read breakdown


                    });
                })
                .catch((err) => {
                    console.error("Data load error:", err);
                    sap.ui.core.BusyIndicator.hide();
                });

        },




        onDateValidation: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sEnteredValue = oEvent.getParameter("value");
            var bValid = oEvent.getParameter("valid");

            if (!bValid) {
                // Get binding info of the 'value' property
                var oBindingInfo = oDatePicker.getBindingInfo("value");

                if (
                    oBindingInfo &&
                    oBindingInfo.parts &&
                    oBindingInfo.parts.length > 0
                ) {
                    var oPart = oBindingInfo.parts[0];
                    var sBoundProperty = oPart.path.split("/")[1]; // e.g. 'ServiceStartHuman'

                    // Use the bound property to look up value directly from this.pageData
                    var sOriginalValue = this.pageData[sBoundProperty];

                    // Reset DatePicker to original value
                    if (sOriginalValue) {
                        oDatePicker.setValue(sOriginalValue);
                    }
                }
                oDatePicker.setValueState(sap.ui.core.ValueState.Information);
                oDatePicker.setValueStateText("Date format must be YYYY-MM-DD.");
            } else {
                oDatePicker.setValueState(sap.ui.core.ValueState.None);
            }
        },


        onHumanValueValidation: function (oEvent) {
            var oInput = oEvent.getSource();
            var sEnteredValue = oEvent.getParameter("value");

            // Step 1: Extract binding info to get property name
            var oBindingInfo = oInput.getBindingInfo("value");
            if (
                oBindingInfo &&
                oBindingInfo.parts &&
                oBindingInfo.parts.length > 0
            ) {
                var sPropertyName = oBindingInfo.parts[0].path.split("/")[1]; // e.g. "CommodityTotalUsageHuman"
                var sOriginalValue = this.pageData[sPropertyName]; // Get original value from pageData

                // Step 2: Validate format using regex
                // Match up to 10 digits before decimal, optional decimal, up to 3 digits after
                var oRegex = /^\d{1,10}(\.\d{0,3})?$/;
                var bValid = oRegex.test(sEnteredValue);

                if (!bValid) {
                    // Step 3: If invalid, reset value and show error
                    oInput.setValue(sOriginalValue);
                    oInput.setValueState(sap.ui.core.ValueState.Information);
                    oInput.setValueStateText("Value must be a number with up to 13 digits (max 3 decimals).");
                } else {
                    // Step 4: Valid input — clear error state
                    oInput.setValueState(sap.ui.core.ValueState.None);
                }
            }
        },


        onHumanValueValidationForString: function (oEvent) {
            var oInput = oEvent.getSource();
            var sEnteredValue = oEvent.getParameter("value");

            // Step 1: Extract binding info to get property name
            var oBindingInfo = oInput.getBindingInfo("value");
            if (
                oBindingInfo &&
                oBindingInfo.parts &&
                oBindingInfo.parts.length > 0
            ) {
                var sPropertyPath = oBindingInfo.parts[0].path;  // e.g. "AccountNumberHuman"
                var sPropertyName = sPropertyPath.split("/")[1]; // e.g. "AccountNumberHuman"
                var sOriginalValue = this.pageData[sPropertyName]; // Get original value from pageData

                // Step 2: Validate length
                if (sEnteredValue && sEnteredValue.length > 20) {
                    // Step 3: Invalid – reset and show error
                    oInput.setValue(sOriginalValue);
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Input cannot exceed 20 characters.");
                } else {
                    // Step 4: Valid input – clear error
                    oInput.setValueState(sap.ui.core.ValueState.None);
                }
            }
        },


        onHumanValueValidationForBasicInfo: function (oEvent) {
            var oInput = oEvent.getSource();
            var sEnteredValue = oEvent.getParameter("value");

            // Step 1: Extract binding info to get property name
            var oBindingInfo = oInput.getBindingInfo("value");
            if (
                oBindingInfo &&
                oBindingInfo.parts &&
                oBindingInfo.parts.length > 0
            ) {
                var sPropertyPath = oBindingInfo.parts[0].path;  // e.g. "AccountNumberHuman"
                var sPropertyName = sPropertyPath.split("/")[1]; // e.g. "AccountNumberHuman"
                var sOriginalValue = this.pageData[sPropertyName]; // Get original value from pageData

                // Step 2: Validate length
                if (sEnteredValue && sEnteredValue.length > 10) {
                    // Step 3: Invalid – reset and show error
                    oInput.setValue(sOriginalValue);
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Input cannot exceed 10 characters.");
                } else {
                    // Step 4: Valid input – clear error
                    oInput.setValueState(sap.ui.core.ValueState.None);
                }
            }
        },

        onChargesValueValidation: function (oEvent) {
            var oInput = oEvent.getSource();
            var sEnteredValue = oEvent.getParameter("value");

            // Get binding info
            var oBindingInfo = oInput.getBindingInfo("value");
            if (
                oBindingInfo &&
                oBindingInfo.parts &&
                oBindingInfo.parts.length > 0
            ) {
                var sPropertyName = oBindingInfo.parts[0].path.split("/")[1]; // e.g. "CommodityTotalChargesHuman"
                var sOriginalValue = this.pageData[sPropertyName]; // Original value from the model

                // Basic check: required and numeric
                if (!sEnteredValue || isNaN(sEnteredValue)) {
                    oInput.setValue(sOriginalValue);
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("This field is required and must be a valid number.");
                    return;
                }

                // Match pattern: up to 12 digits before decimal, optional 2 after
                var regex = /^\d{1,12}(\.\d{0,2})?$/;

                if (!regex.test(sEnteredValue)) {
                    oInput.setValue(sOriginalValue);
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Maximum 12 digits before decimal and 2 digits after decimal allowed.");
                    return;
                }

                // Check total length including decimal point
                if (sEnteredValue.length > 15) {
                    oInput.setValue(sOriginalValue);
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Total length must not exceed 15 characters.");
                    return;
                }

                // All validations passed
                oInput.setValueState(sap.ui.core.ValueState.None);
            }
        },


        checkValidation: function (evt) {
            var oInput = evt.getSource();
            var sValue = oInput.getValue();

            if (sValue.length > 10) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Maximum 10 characters allowed.");
            } else {
                oInput.setValueState(sap.ui.core.ValueState.None);
            }
        },

        handleChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var bValid = oEvent.getParameter("valid");

            // Extract the field name and original value
            var oBindingInfo = oDatePicker.getBindingInfo("value");
            var sProperty = oBindingInfo?.parts?.[0]?.path.split("/")[1];
            var sOriginalValue = this.pageData?.[sProperty]; // e.g. "2025"

            // Regex: Only 4-digit years, e.g. 1900 - 2099 (customize as needed)
            var oYearRegex = /^\d{4}$/;

            if (!bValid || !oYearRegex.test(sValue)) {
                // Reset to original value if invalid
                oDatePicker.setValue(sOriginalValue);
                oDatePicker.setValueState(sap.ui.core.ValueState.Information);
                oDatePicker.setValueStateText("Please enter a valid 4-digit year (e.g., 2025).");
            } else {
                // Valid
                oDatePicker.setValueState(sap.ui.core.ValueState.None);
            }
        },


        _loadPdfFromBase64XXXXXXXXXXXXXXXX: function (base64Pdf) {
            //base64Pdf =
            //    "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFsgMyAwIFIgXSAKL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMCA0IDAgUiA+PiA+PiAvTWVkaWFCb3ggWzAgMCA2MDAgODAwXQovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNTkgPj4Kc3RyZWFtCkJUIAovRjAgMTIgVGYKMTAgNzUwIFRECiAoSGVsbG8sIFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTYzIDAwMDAwIG4gCjAwMDAwMDAyMjUgMDAwMDAgbiAKMDAwMDAwMDM0MSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgL0luZm8gNyAwIFIgPj4Kc3RhcnR4cmVmCjQ1MAolJUVPRgo=";

            // Convert base64 to binary
            const byteCharacters = atob(base64Pdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });

            // Create URL for the Blob
            const pdfUrl = URL.createObjectURL(blob);

            // Inject PDF into the iframe via <core:HTML>
            const sIframeHTML = `
                <iframe 
                    src="${pdfUrl}" 
                    type="application/pdf"
                    width="100%" 
                    height="600px" 
                    style="border: none;"
                    allowfullscreen>
                </iframe>
            `;
            this.getView().byId("iframeHtml").setContent(sIframeHTML);
        },




        onApprovePress: function (evt) {
            var that = this;
            sap.m.MessageBox.warning("Once Approved, no further changes will be allowed.\n Would you like to proceed ?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that.changeProcessStatus(that);
                    }
                },
                // Show the message box as dependent on the view
                styleClass: that.getView().$().closest(".sapUiSizeCompact").length ? "sapUiSizeCompact" : "",
                title: "Quantity Exceeds Planned"
            });
        },


        changeProcessStatus: async function (evt) {
            var oView = evt.getView();
            const oModel = oView.getModel();

            sap.ui.core.BusyIndicator.show(0);

            try {
                const facilityCode = oView.byId("facilityCode").getValue();
                const uniqId = oView.byId("uniqId").getText();

                const oBindList = oModel.bindList("/ZPS_C_EINVOICE", undefined, [], [
                    new sap.ui.model.Filter("FacilityShortCode", sap.ui.model.FilterOperator.EQ, facilityCode),
                    new sap.ui.model.Filter("Uniqueidentifier", sap.ui.model.FilterOperator.EQ, uniqId)
                ]);

                const aContexts = await oBindList.requestContexts();

                if (aContexts.length === 0) {
                    throw new Error("No data found for FacilityShortCode");
                }

                const oContext = aContexts[0];

                // Map of input IDs to model property names
                const fieldMappings = {
                    notesId: "Notes",
                    lock: "Locked",
                    statusBox: "ProcessStatus"
                };

                // Iterate and set properties
                Object.entries(fieldMappings).forEach(([fieldId, property]) => {
                    const oControl = oView.byId(fieldId);
                    if (oControl) {
                        let value = oControl.getValue?.() ?? oControl.getText?.(); // Support both Input and Text
                        if (fieldId === "lock") {
                            value = false;
                        }
                        if (fieldId === "statusBox") {
                            value = "Approved"; // Special case: numeric
                        }
                        oContext.setProperty(property, value);
                    }
                });

                this.onStatusChange("Validated"); //Make Read Only
                this.getView().byId("editBtn").setEnabled(false); // Post SAVE make Edit btn InVisible as its approved.
            } catch (err) {
                sap.m.MessageBox.error("Update failed: " + err.message);
            } finally {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Approved");
                this._refreshUiPageWithDBData();
            }
        },



        _loadPdfFromBase64: function (pdfValue) {
            const pdfBase64 = "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoKMiAwIG9iago8PC9UeXBlIC9QYWdlcy9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCgozIDAgb2JqCjw8L1R5cGUgL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDYgMCBSPj4+Pi9NZWRpYUJveCBbMCAwIDU5NSA4NDJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCgo0IDAgb2JqCjw8L0xlbmd0aCA1MT4+CnN0cmVhbQpCBiAwIDAgMCAwIDAgMTAwIFRECi9GMSAxMiBUZgowIDUwIFREClQgKEhlbGxvIFdvcmxkKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgo2IDAgb2JqCjw8L1R5cGUgL0ZvbnQvU3VidHlwZSAvVHlwZTEvTmFtZSAvRjEvQmFzZUZvbnQgL0hlbHZldGljYT4+CmVuZG9iagoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE1NSAwMDAwMCBuIAowMDAwMDAwMjUwIDAwMDAwIG4gCjAwMDAwMDAzNDMgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDcgL1Jvb3QgMSAwIFIgL0luZm8gNyAwIFIgL0lEIFsgPDEzMzYwYjcyZmRkMDY4MDE0Zjk3NzUwMDAwMDAwMDAwPiA8MTMzNjBiNzJmZGQwNjgwMTRmOTc3NTAwMDAwMDAwMDA+IF0gPj4Kc3RhcnR4cmVmCjQ2MQolJUVPRgo=";
            if (pdfValue) {
                // Clean up potential issues
                pdfValue = pdfValue
                    .replace(/\s/g, '')      // Remove whitespace, newlines
                    .replace(/-/g, '+')      // Fix URL-safe base64
                    .replace(/_/g, '/');     // Fix URL-safe base64
            } else {
                pdfValue = pdfBase64;
            }

            // Create a data URL for the PDF
            const pdfDataUrl = "data:application/pdf;base64," + pdfValue + "#zoom=page-width";

            // Embed an <iframe> into the core:HTML control
            const iframeHtml = `<iframe src="${pdfDataUrl}" width="100%" height="590px" style="border:none;"></iframe>`;

            // Get reference to the core:HTML control and set the content
            const oHtmlControl = this.getView().byId("iframeHtml");
            oHtmlControl.setContent(iframeHtml);
        },





        _fetchPDFMediaStream: async function () {
            sap.ui.core.BusyIndicator.show();

            try {
                const oModel = this.getView().getModel(); // Your V4 model
                const sServiceUrl = oModel.sServiceUrl;

                // Extract key values from sPath
                const match = this.sPath.match(/\(([^)]+)\)/);
                if (!match || !match[1]) {
                    throw new Error("Invalid sPath format");
                }

                const keyValuePairs = match[1].split(",").reduce((acc, part) => {
                    const [key, val] = part.split("=");
                    acc[key.trim()] = val.replace(/^'|'$/g, "");
                    return acc;
                }, {});

                // Construct key segment correctly
                const keySegment =
                    `FacilityShortCode='${encodeURIComponent(keyValuePairs.FacilityShortCode)}',` +
                    `Uniqueidentifier='${encodeURIComponent(keyValuePairs.Uniqueidentifier)}',` +
                    `CreatedOnBLOB=${encodeURIComponent(keyValuePairs.CreatedOnBLOB)},` +
                    `AccountNumberCirah='${encodeURIComponent(keyValuePairs.AccountNumberCirah)}',` +
                    `IsActiveEntity=${keyValuePairs.IsActiveEntity}`;

                // Construct final full URL to media stream
                const fullUrl = `${sServiceUrl}/ZPS_C_EINVOICE(${keySegment})/Attachment`;

                // Optional CSRF Token (if needed)
                const csrfToken = oModel.getHttpHeaders()["x-csrf-token"] || "";

                const response = await fetch(fullUrl, {
                    method: "GET",
                    headers: {
                        "Accept": "application/pdf",
                        "X-CSRF-Token": csrfToken
                    },
                    credentials: "include"
                });

                if (!response.ok) {
                    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
                }

                // Convert response to Blob and display
                const blob = await response.blob();
                const pdfUrl = URL.createObjectURL(blob);

                const sIframeHTML = `
            <iframe 
                src="${pdfUrl}" 
                width="100%" 
                height="600px" 
                style="border:none;" 
                allowfullscreen>
            </iframe>
        `;
                this.getView().byId("iframeHtml").setContent(sIframeHTML);

            } catch (err) {
                console.log("Error fetching PDF:", err);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },


        format1970Value: function (evt) {
            if (evt = "1970") {
                return evt;
            } else {
                return evt;
            }
        },


        // calulateIfLogPresent: function () {
        //     this.readAllFieldLevelLogChangeDetail();
        // },


        readAllFieldLevelLogChangeDetail: function () {
            sap.ui.core.BusyIndicator.show();
            let oModel = this.getView().getModel();  // OData V4 model

            // Use RegEx to match Uniqueidentifier
            let match = this.sPath.match(/Uniqueidentifier='([^']+)'/);
            let sInvoiceUID = match ? match[1] : null;

            // Use the path and parameters properly
            oModel.bindList("/ZPS_I_EINV_LOG", undefined, undefined, undefined, {
                $orderby: "ChangeSeq desc",
                $filter: `Invoice_UID eq '${sInvoiceUID}'`
            })
                .requestContexts()
                .then((aContexts) => {
                    let dataArray = [];
                    aContexts.forEach(oContext => {
                        dataArray.push(oContext.getObject());
                    });

                    var selArray = ["ServiceStartHuman", "ServiceEndHuman", "InvoiceDueDateHuman", "AccountNumberHuman", "VendorInvoiceNumberHuman",
                        "CommodityTotalUsageHuman", "PueFactoredUsageHuman", "PueActualHuman", "PueCapHuman", "CommodityTotalChargesHuman"
                    ];

                    // Create a Set of all field names present in DATA
                    var presentFields = new Set(dataArray.map(item => item.FieldName));

                    // Build the result
                    var result = {};
                    selArray.forEach(field => {
                        result[field] = presentFields.has(field);
                    });

                    console.log(result);

                    selArray.forEach((field, index) => {
                        var btnId = "Btn" + (index + 1); // Assumes Btn1, Btn2, ..., Btn10
                        var btn = this.getView().byId(btnId);

                        if (!btn) return; // Safety check

                        var isPresent = presentFields.has(field);
                        if (!isPresent && !btn.getText()) {
                            // const spaceCount = 20;
                            // btn.setText(Array(spaceCount + 1).join("\u00A0"));
                            btn.setEnabled(false);
                        } else {
                            btn.setEnabled(true);
                        }
                        btn.setType(isPresent ? "Accept" : "Default");
                        btn.setIcon(isPresent ? "sap-icon://user-edit" : "");
                    });

                    sap.ui.core.BusyIndicator.hide();

                    // var oJSONModel = new JSONModel(data);
                    // this.getView().setModel(oJSONModel, "FieldLogData");
                })
                .catch((err) => {
                    console.error("Data load error for fetching Log details:", err);
                    sap.ui.core.BusyIndicator.hide();
                });
        },




        onReprocessPress: function () {
            //debugger;
        },

        onCancelPress: function () {
            this.resetLockToUnlock();
            const status = this.pageData.ProcessStatus;
            const allowedStatuses = ["Duplicate", "Validated", "Approved", "Rejected"];
            this.getView().getModel("visibilityModel").setProperty(
                "/showEditBtn",
                !allowedStatuses.includes(status)
            );
            this.onStatusChange("Validated"); //Permanently ReadOnly
            this.getView().byId("editBtn").setEnabled(true);
            if (this.pageData.Locked) {
                this.getView().byId("lockIcon").setIcon("sap-icon://locked");
                this.getView().byId("lockIcon").setTooltip("Locked");
            } else {
                this.getView().byId("lockIcon").setIcon("sap-icon://unlocked");
                this.getView().byId("lockIcon").setTooltip("UnLocked");
            }
            this.getView().getModel("visibilityModel").setProperty(
                "/showTotalUsageBreakDown", false
            );
            sap.m.MessageToast.show("Display Mode");
        },



        checkTotalChargesSUM: function () {
            var oItms = this.getView().byId("idInvoiceBreakdownTable").getItems();
            var total = 0;
            if (oItms.length) {
                for (let index = 0; index < oItms.length; index++) {
                    var cellValue = oItms[index].getCells()[2].getItems()[1].getValue();
                    total += parseFloat(cellValue) || 0;
                }
            }
            var totalCargesHumanField = parseFloat(this.getView().byId("scanField12").getValue()) || 0;
            return total === totalCargesHumanField;
        },



        saveTotalChargeBreakDown: async function () {
            const oModel = this.getView().getModel(); // OData V4 model
            const groupId = "updateGroup";

            // function buildPayload() {
            //     return [
            //         {
            //             IndividualColoId: "DE713FF3-7DC8-1FE0-A7D0-0E883F4D2AF5", // <-- KEY
            //             ColocationName: "PROPERTY 1503 - SN6 - ZONE A",
            //             CurrencyHuman: "EUR",
            //             InvoiceTotalChargeHUMAN: "33333",
            //             Invoice_UID: "EAA41537-3C57-1FD0-9A8A-F4173D2B9E76"
            //         }
            //     ];
            // }

            function buildPayload(oTable) {
                const aPayload = [];

                const aItems = oTable.getItems();

                aItems.forEach(oItem => {
                    const aCells = oItem.getCells();
                    const oHBox = aCells[2]; // HBox in 3rd column

                    const oTextColoName = aCells[0]; // Text control
                    const oInputChargeHuman = oHBox.getItems()[1]; // Input for InvoiceTotalChargeHUMAN
                    const oInputCurrencyHuman = oHBox.getItems()[2]; // Input for CurrencyHuman

                    const oContext = oItem.getBindingContext("InvTotUsgBreakDownModel");
                    const oData = oContext.getObject();

                    aPayload.push({
                        IndividualColoId: oData.IndividualColoId,
                        ColocationName: oTextColoName.getText(), // or oData.ColocationName
                        CurrencyHuman: oInputCurrencyHuman.getValue(),
                        InvoiceTotalChargeHUMAN: oInputChargeHuman.getValue(),
                        Invoice_UID: oData.Invoice_UID
                    });
                });

                return aPayload;
            }

            const oTable = this.getView().byId("idInvoiceBreakdownTable");
            const aLogPayload = buildPayload(oTable);

            try {
                for (const entry of aLogPayload) {
                    const sKey = encodeURIComponent(entry.IndividualColoId);
                    const sPath = `/ZPS_I_EINV_TOTUSAGE('${sKey}')`;

                    const oBinding = oModel.bindContext(sPath, null, {
                        $$updateGroupId: groupId
                    });

                    try {
                        await oBinding.requestObject(); // Load entity

                        const oContext = oBinding.getBoundContext();

                        if (!oContext) {
                            throw new Error("No context found for path: " + sPath);
                        }

                        // Set properties one by one (excluding the key)
                        for (const [prop, val] of Object.entries(entry)) {
                            if (prop !== "IndividualColoId") {
                                oContext.setProperty(prop, val);
                            }
                        }

                        console.log("Properties set for update:", entry.IndividualColoId);

                    } catch (patchErr) {
                        // Entity not found, fallback to create
                        console.warn("Entity not found, u should try create for:", sPath);

                        // const oListBinding = oModel.bindList("/ZPS_I_EINV_TOTUSAGE", null, null, null, {
                        //     $$updateGroupId: groupId
                        // });

                        // await oListBinding.create(entry);
                        // console.log("Created:", entry.IndividualColoId);
                    }
                }

                await oModel.submitBatch(groupId); // Commit all updates/creates
                //sap.m.MessageToast.show("Changes saved successfully.");
            } catch (err) {
                console.error("Save failed:", err);
                sap.m.MessageBox.error("Save failed: " + err.message);
            }



            // this.deleteChargeBreakDownEntry("B663242B-9A23-1FD0-A7D1-09C61E0A4871"); //Delete an entry (Not Working)
        },



        // deleteChargeBreakDownEntry: async function (sIndividualColoId) {
        //     const oModel = this.getView().getModel(); // OData V4 model
        //     const groupId = "deleteGroup";

        //     if (!sIndividualColoId) {
        //         sap.m.MessageBox.error("No ID provided for deletion.");
        //         return;
        //     }

        //     const sKey = encodeURIComponent(sIndividualColoId);
        //     const sPath = `/ZPS_I_EINV_TOTUSAGE('${sKey}')`;

        //     try {
        //         const oBinding = oModel.bindContext(sPath, null, {
        //             $$updateGroupId: groupId
        //         });

        //         await oBinding.requestObject(); // Wait for data load

        //         const oContext = oBinding.getBoundContext();

        //         if (!oContext || typeof oContext.delete !== "function") {
        //             console.log("Context not deletable or not found for path: " + sPath);
        //         }

        //         await oContext.delete(); // 👈 This should now work

        //         await oModel.submitBatch(groupId); // Required for backend call


        //         sap.m.MessageToast.show("Entry deleted successfully.");
        //     } catch (err) {
        //         console.error("Delete failed:", err);
        //         sap.m.MessageBox.error("Delete failed: " + err.message);
        //     }
        // },









        handleValidatedRejectedStatus: function () {
            var that = this;
            sap.m.MessageBox.warning("Once you save, further edits will not be possible.\n Would you like to proceed ?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that.changeProcessStatus(that);
                    }
                },
                // Show the message box as dependent on the view
                styleClass: that.getView().$().closest(".sapUiSizeCompact").length ? "sapUiSizeCompact" : "",
                // title: "Quantity Exceeds Planned"
            });
        }







    });
});