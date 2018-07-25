'use strict';

angular.module('bahmni.common.uicontrols.programmanagment')
    .controller('ManageProgramController', ['$scope', 'retrospectiveEntryService', '$window', 'programService',
        'spinner', 'messagingService', '$stateParams', '$q', 'confirmBox', 'appService', 'programAttributesHelper','$bahmniCookieStore','$filter',
        function ($scope, retrospectiveEntryService, $window, programService,
                  spinner, messagingService, $stateParams, $q, confirmBox, appService, programAttributesHelper, $bahmniCookieStore, $filter) {
            var DateUtil = Bahmni.Common.Util.DateUtil;

            $scope.programSelected = {};
            $scope.workflowStateSelected = {};
            $scope.allPrograms = [];
            $scope.allFilteredPrograms = [];
            $scope.programWorkflowStates = [];
            $scope.workflowStatesWithoutCurrentState = [];
            $scope.outComesForProgram = [];
            $scope.configName = $stateParams.configName;
            $scope.today = DateUtil.getDateWithoutTime(DateUtil.now());
            $scope.allProgramAttributeTypes = [];
            $scope.programAttributeTypes = [];
            var programSpecificAttributeTypesDefinition = appService.getAppDescriptor().getConfigValue("program").programSpecificAttributeTypesDefinition;
            var locationClinicMapping = appService.getAppDescriptor().getConfigValue("program").locationClinicMapping;
            var clinicProgramsMapping = appService.getAppDescriptor().getConfigValue("program").clinicProgramsMapping;
            var id = "#programEnrollmentContainer";
            $scope.showAttribute = false;


            var getCurrentLocation = function() {
                return $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName) ? $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName) : null;
            };

            angular.forEach(locationClinicMapping.programTitles, function(value, key) {
                    if (value.location == getCurrentLocation().name) {
                    $scope.clinicTitle=value.clinicTitle; 
                    return;
                    }
            });

            var updateActiveProgramsList = function () {
                spinner.forPromise(programService.getPatientPrograms($scope.patient.uuid).then(function (programs) {
                    $scope.activePrograms = programs.activePrograms;
                    _.each($scope.activePrograms, function (patientProgram) {
                        populateDefaultSelectedState(patientProgram);
                    });
                    $scope.activePrograms.showProgramSection = true;

                    $scope.endedPrograms = programs.endedPrograms;
                    $scope.endedPrograms.showProgramSection = true;
                }).then(function () {
                    formatProgramDates();
                }), id);
            };

            var populateDefaultSelectedState = function (patientProgram) {
                var activePatientProgramState = getActivePatientProgramState(patientProgram.states);
                patientProgram.selectedState = activePatientProgramState ? activePatientProgramState.state : null;
            };

            var formatProgramDates = function () {
                _.each($scope.activePrograms, function (activeProgram) {
                    activeProgram.fromDate = Bahmni.Common.Util.DateUtil.parseLongDateToServerFormat(activeProgram.dateEnrolled);
                    activeProgram.toDate = Bahmni.Common.Util.DateUtil.parseLongDateToServerFormat(activeProgram.dateCompleted);
                });
                _.each($scope.endedPrograms, function (endedProgram) {
                    endedProgram.fromDate = Bahmni.Common.Util.DateUtil.parseLongDateToServerFormat(endedProgram.dateEnrolled);
                    endedProgram.toDate = Bahmni.Common.Util.DateUtil.parseLongDateToServerFormat(endedProgram.dateCompleted);
                });
            };

            var getCurrentDate = function () {
                var retrospectiveDate = retrospectiveEntryService.getRetrospectiveDate();
                return DateUtil.parseLongDateToServerFormat(retrospectiveDate);
            };

            var init = function () {
                spinner.forPromise(programService.getAllPrograms().then(function (programs) {
                    $scope.allPrograms = programs;
                     console.log($scope.allPrograms);
                    $scope.allPrograms.showProgramSection = true;
                    filterPrograms(clinicProgramsMapping);
                }), id);
                spinner.forPromise(programService.getProgramAttributeTypes().then(function (programAttributeTypes) {
                    $scope.programAttributeTypes = programAttributeTypes;
                    $scope.allProgramAttributeTypes = programAttributeTypes;
                }), id);
                $scope.programSelected = null;
                $scope.patientProgramAttributes = {};
                $scope.programEnrollmentDate = null;



                updateActiveProgramsList();
            };

            var successCallback = function () {
                messagingService.showMessage("info", "CLINICAL_SAVE_SUCCESS_MESSAGE_KEY");
                $scope.programSelected = null;
                $scope.workflowStateSelected = null;
                $scope.patientProgramAttributes = {};
                $scope.programEnrollmentDate = null;
                $scope.programAttributeTypes = $scope.allProgramAttributeTypes;
                updateActiveProgramsList();
                if ($scope.patientProgram) {
                    $scope.patientProgram.editing = false;
                }
            };

            var failureCallback = function (error) {
                var fieldErrorMsg = findFieldErrorIfAny(error);
                var errorMsg = _.isUndefined(fieldErrorMsg) ? "Failed to Save" : fieldErrorMsg;
                messagingService.showMessage("error", errorMsg);
            };

            var findFieldErrorIfAny = function (error) {
                var stateFieldError = objectDeepFind(error, "data.error.fieldErrors.states");
                var errorField = stateFieldError && stateFieldError[0];
                return errorField && errorField.message;
            };

            var objectDeepFind = function (obj, path) {
                if (_.isUndefined(obj)) {
                    return undefined;
                }
                var paths = path.split('.'), current = obj, i;
                for (i = 0; i < paths.length; ++i) {
                    if (current[paths[i]] == undefined) {
                        return undefined;
                    } else {
                        current = current[paths[i]];
                    }
                }
                return current;
            };

            var isThePatientAlreadyEnrolled = function () {
                return _.map($scope.activePrograms, function (program) {
                    return program.program.uuid;
                }).indexOf($scope.programSelected.uuid) > -1;
            };

            var isProgramSelected = function () {
                return $scope.programSelected && $scope.programSelected.uuid;
            };

            $scope.hasPatientEnrolledToSomePrograms = function () {
                return !_.isEmpty($scope.activePrograms);
            };

            $scope.hasPatientAnyPastPrograms = function () {
                return !_.isEmpty($scope.endedPrograms);
            };

            $scope.enrollPatient = function () {
                if (!isProgramSelected()) {
                    messagingService.showMessage("error", "PROGRAM_MANAGEMENT_SELECT_PROGRAM_MESSAGE_KEY");
                    return $q.when({});
                }
                if (isThePatientAlreadyEnrolled()) {
                    messagingService.showMessage("error", "PROGRAM_MANAGEMENT_ALREADY_ENROLLED_PROGRAM_MESSAGE_KEY");
                    return $q.when({});
                }
                var stateUuid = $scope.workflowStateSelected && $scope.workflowStateSelected.uuid ? $scope.workflowStateSelected.uuid : null;
                return spinner.forPromise(
                    programService.enrollPatientToAProgram($scope.patient.uuid, $scope.programSelected.uuid, $scope.programEnrollmentDate, stateUuid, $scope.patientProgramAttributes, $scope.programAttributeTypes)
                        .then(successCallback, failureCallback)
                );
            };

            var isProgramStateChanged = function (patientProgram, activePatientProgramState) {
                if (_.isEmpty(activePatientProgramState) && patientProgram.selectedState != undefined) {
                    return true;
                }
                return patientProgram.selectedState
                    && (patientProgram.selectedState.uuid != activePatientProgramState.state.uuid);
            };

            var isOutcomeSelected = function (patientProgram) {
                return !_.isEmpty(objectDeepFind(patientProgram, 'outcomeData.uuid'));
            };

            var getActivePatientProgramState = function (states) {
                return _.find(states, function (state) {
                    return state.endDate == null && !state.voided;
                });
            };

            $scope.updatePatientProgram = function (patientProgram) {
                $scope.patientProgram = patientProgram;
                var activePatientProgramState = getActivePatientProgramState(patientProgram.states);
                var activeStateDate = activePatientProgramState ? DateUtil.parse(activePatientProgramState.startDate) : null;
                var dateCompleted = null;

                if (isProgramStateChanged(patientProgram, activePatientProgramState)) {
                    var startDate = getCurrentDate();
                    if (activePatientProgramState && DateUtil.isBeforeDate(startDate, activeStateDate)) {
                        messagingService.showMessage("error", "PROGRAM_MANAGEMENT_STATE_CANT_START_BEFORE_KEY"
                            + " (" + DateUtil.formatDateWithoutTime(activeStateDate) + ")");
                        return;
                    }
                    patientProgram.states.push({
                        state: {
                            uuid: patientProgram.selectedState.uuid
                        },
                        startDate: startDate
                    });
                }
                if (isOutcomeSelected(patientProgram)) {
                    dateCompleted = DateUtil.getDateWithoutTime(getCurrentDate());
                    if (activePatientProgramState && DateUtil.isBeforeDate(dateCompleted, activeStateDate)) {
                        messagingService.showMessage("error", "PROGRAM_MANAGEMENT_PROGRAM_CANT_END_BEFORE_KEY" + " (" + DateUtil.formatDateWithoutTime(activeStateDate) + ")");
                        return;
                    }
                }
                spinner.forPromise(
                    programService.updatePatientProgram(patientProgram, $scope.programAttributeTypes, dateCompleted)
                        .then(successCallback, failureCallback)
                );
            };

            var voidPatientProgram = function (patientProgram, closeConfirmBox) {
                patientProgram.voided = true;
                var promise = programService.updatePatientProgram(patientProgram, $scope.programAttributeTypes)
                    .then(successCallback, failureCallback)
                    .then(closeConfirmBox);
                spinner.forPromise(promise);
            };

            var unVoidPatientProgram = function (patientProgram, closeConfirmBox) {
                delete patientProgram.voidReason;
                delete patientProgram.voided;
                patientProgram.deleting = false;
                closeConfirmBox();
            };

            $scope.confirmDeletion = function (patientProgram) {
                var scope = {};
                scope.message = 'Are you sure, you want to delete ' + patientProgram.display + '?';
                scope.cancel = _.partial(unVoidPatientProgram, patientProgram, _);
                scope.delete = _.partial(voidPatientProgram, patientProgram, _);
                confirmBox({
                    scope: scope,
                    actions: ['cancel', 'delete'],
                    className: "ngdialog-theme-default delete-program-popup"
                });
            };

            $scope.toggleDelete = function (program) {
                program.deleting = !program.deleting;
            };

            $scope.toggleEdit = function (program) {
                $scope.tempProgram = angular.copy(program);
                program.editing = !program.editing;
            };

            $scope.cancelChange = function (program) {
                populateDefaultSelectedState(program);
                program.patientProgramAttributes = $scope.tempProgram.patientProgramAttributes;
                program.editing = !program.editing;
            };

            var getProgramAttributeTypeAssignedToProgram = function (currentProgram, programAttributeTypes, programAttributeTypeMapConfig) {
                var filterProgramAttributes = function (programAttributeType) {
                    if (!currentProgramMapConfig) {
                        return true;
                    }
                    return _.indexOf(currentProgramMapConfig.attributeTypes, programAttributeType.name) >= 0;
                };
                if (!programAttributeTypeMapConfig) {
                    return programAttributeTypes;
                }
                var currentProgramMapConfig = programAttributesHelper.getAttributeTypesConfigurationForProgram(currentProgram.name);
                var availableProgramAttributeTypesForProgram = _.filter(programAttributeTypes, filterProgramAttributes);
                if (!currentProgramMapConfig) {
                    return availableProgramAttributeTypesForProgram;
                } else {
                    return programAttributesHelper
                        .sortBasedOnConfiguration(availableProgramAttributeTypesForProgram, currentProgram.name);
                }
            };

            var runOnConditions = function (conditionFn, patientProgramAttributes, programAttributeTypes, allAttributeTypes) {
                if (!conditionFn) {
                    return programAttributeTypes;
                }
                var formFieldValues = programAttributesHelper.mapFieldWithConceptValue(patientProgramAttributes, programAttributeTypes);
                var conditions = conditionFn(formFieldValues, $scope.patient);
                var allShownAttributeTypes = programAttributesHelper.showAttributes(conditions.show, programAttributeTypes, allAttributeTypes);
                var sortedAttributeType = programAttributesHelper.sortBasedOnConfiguration(allShownAttributeTypes, $scope.programSelected.name);
                return programAttributesHelper.filterOnHide(conditions.hide, sortedAttributeType);
            };

            var resetProgramAttributeHiddenValue = function (conditionFn, patientProgramAttributes) {
                var filterHiddenAttributeTypes = function (attributeTypeName) {
                    if (patientProgramAttributes[attributeTypeName]) {
                        patientProgramAttributes[attributeTypeName] = null;
                    }
                };
                if (conditionFn) {
                    var conditions = conditionFn(patientProgramAttributes);
                    _.forEach(conditions.hide, filterHiddenAttributeTypes);
                }

                return patientProgramAttributes;
            };
            $scope.handleProgramAttributeUpdate = function (attributeName) {
                console.log(attributeName);
                var formConditions = Bahmni.Clinical.Program.FormConditions;
                if (formConditions && formConditions.rules) {
                    var conditionFn = formConditions.rules[attributeName];
                    $scope.programAttributeTypes = runOnConditions(conditionFn, $scope.patientProgramAttributes, $scope.programAttributeTypes, $scope.allProgramAttributeTypes);
                    $scope.patientProgramAttributes = resetProgramAttributeHiddenValue(conditionFn, $scope.patientProgramAttributes);
                }
            };

            $scope.setWorkflowStates = function (program) {
                if(program)
                {
                     $scope.showAttribute = true;
                 }else
                 {
                    $scope.showAttribute = false;
                 }
                $scope.programWorkflowStates = $scope.getStates(program);
                $scope.programAttributeTypes = getProgramAttributesForCurrentProgram(program);
                console.log($scope.programAttributeTypes);
                 angular.forEach($scope.programAttributeTypes,function(value,key){
                   $scope.handleProgramAttributeUpdate(value.name); 
                 });
                };

            var getProgramAttributesForCurrentProgram = function (program) {
                if (!program) {
                    return $scope.allProgramAttributeTypes;
                }
                return getProgramAttributeTypeAssignedToProgram(program, $scope.allProgramAttributeTypes, programSpecificAttributeTypesDefinition);
            };

            $scope.getStates = function (program) {
                var states = [];
                if (program && program.allWorkflows && program.allWorkflows.length && program.allWorkflows[0].states.length) {
                    states = program.allWorkflows[0].states;
                }
                return states;
            };

            $scope.canRemovePatientState = function (state) {
                return state.endDate == null;
            };

            $scope.removePatientState = function (patientProgram) {
                var currProgramState = getActivePatientProgramState(patientProgram.states);
                var currProgramStateUuid = objectDeepFind(currProgramState, 'uuid');
                spinner.forPromise(
                    programService.deletePatientState(patientProgram.uuid, currProgramStateUuid)
                        .then(successCallback, failureCallback)
                );
            };

            $scope.hasStates = function (program) {
                return program && !_.isEmpty(program.allWorkflows) && !_.isEmpty($scope.programWorkflowStates);
            };

            $scope.hasProgramWorkflowStates = function (patientProgram) {
                return !_.isEmpty($scope.getStates(patientProgram.program));
            };

            $scope.hasOutcomes = function (program) {
                return program.outcomesConcept && !_.isEmpty(program.outcomesConcept.setMembers);
            };

            $scope.getCurrentStateDisplayName = function (program) {
                var currentState = getActivePatientProgramState(program.states);
                return _.get(currentState, 'state.concept.display');
            };

            var filterPrograms = function (clinicProgramsMapping)
            {
                 angular.forEach(clinicProgramsMapping.programs, function(value, key) {
                 if (value.clinic == getCurrentLocation().name) {
                  console.log("Program " + value.program);
                  for (var i=0; i<$scope.allPrograms.length;i++) {
                    if ($scope.allPrograms[i].name == value.program) {
                             $scope.allFilteredPrograms.push($scope.allPrograms[i]); 
                             i = $scope.allPrograms.length;  
                              }
                     }
                   }
                 });
            }

             var filterProgramsOld= function (clinicProgramsMapping) {
                  angular.forEach(clinicProgramsMapping.programs, function(value, key) {
                    if (value.clinic == getCurrentLocation().name) {
                        $scope.allFilteredPrograms = $scope.allPrograms.filter(function(item) {
                           return item.name == value.program;

                           });
                   }             
                });
               console.log("Found " + $scope.allFilteredPrograms);
              };

            $scope.getMaxAllowedDate = function (states) {
                var minStartDate = DateUtil.getDateWithoutTime(new Date());
                if (states && angular.isArray(states)) {
                    for (var stateIndex = 0; stateIndex < states.length; stateIndex++) {
                        if (states[stateIndex].startDate < minStartDate) {
                            minStartDate = states[stateIndex].startDate;
                        }
                    }
                }
                return minStartDate;
            };

            init();
        }
    ]);