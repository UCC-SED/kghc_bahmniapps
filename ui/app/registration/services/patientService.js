'use strict';

angular.module('bahmni.registration')
    .factory('patientService', ['$http', '$rootScope', '$bahmniCookieStore', '$q', 'patientServiceStrategy', 'sessionService', function ($http, $rootScope, $bahmniCookieStore, $q, patientServiceStrategy, sessionService) {
        var openmrsUrl = Bahmni.Registration.Constants.openmrsUrl;
        var baseOpenMRSRESTURL = Bahmni.Registration.Constants.baseOpenMRSRESTURL;

        var search = function (query, identifier, addressFieldName, addressFieldValue, customAttributeValue,
                               offset, customAttributeFields, programAttributeFieldName, programAttributeFieldValue, addressSearchResultsConfig,
                               patientSearchResultsConfig, filterOnAllIdentifiers) {
            var config = {
                params: {
                    q: query,
                    identifier: identifier,
                    s: "byIdOrNameOrVillage",
                    addressFieldName: addressFieldName,
                    addressFieldValue: addressFieldValue,
                    customAttribute: customAttributeValue,
                    startIndex: offset || 0,
                    patientAttributes: customAttributeFields,
                    programAttributeFieldName: programAttributeFieldName,
                    programAttributeFieldValue: programAttributeFieldValue,
                    addressSearchResultsConfig: addressSearchResultsConfig,
                    patientSearchResultsConfig: patientSearchResultsConfig,
                    loginLocationUuid: sessionService.getLoginLocationUuid(),
                    filterOnAllIdentifiers: filterOnAllIdentifiers
                },
                withCredentials: true
            };
            return patientServiceStrategy.search(config);
        };

        var searchByIdentifier = function (identifier) {
            return $http.get(Bahmni.Common.Constants.bahmniSearchUrl + "/patient", {
                method: "GET",
                params: {
                    identifier: identifier,
                    loginLocationUuid: sessionService.getLoginLocationUuid()
                },
                withCredentials: true
            });
        };


    var validateInsuranceCard = function (cardNo, visitType, referralNo ) {
              var params = {
                  cardNo: cardNo,
                  visitType: visitType,
                  referralNo: referralNo
              };

              return $http.get(Bahmni.Common.Constants.insuranceValidatorServiceUrl, {
                  params: params
              });
          };

        var get = function (uuid) {
            return patientServiceStrategy.get(uuid);
        };

        var create = function (patient, jumpAccepted) {
            return patientServiceStrategy.create(patient, jumpAccepted);
        };

        var update = function (patient, openMRSPatient) {
            return patientServiceStrategy.update(patient, openMRSPatient, $rootScope.patientConfiguration.attributeTypes);
        };

        var updateImage = function (uuid, image) {
            var url = baseOpenMRSRESTURL + "/personimage/";
            var data = {
                "person": {"uuid": uuid},
                "base64EncodedImage": image
            };
            var config = {
                withCredentials: true,
                headers: {"Accept": "application/json", "Content-Type": "application/json"}
            };
            return $http.post(url, data, config);
        };

        var patientDuplicateDetection = function (patient) {
                    return $http.post(Bahmni.Common.Constants.patientDuplicateDetection, patient, {
                         withCredentials: true
                         });
                     };

        return {
            search: search,
            searchByIdentifier: searchByIdentifier,
            create: create,
            update: update,
            get: get,
            updateImage: updateImage,
            validateInsuranceCard : validateInsuranceCard,
            patientDuplicateDetection : patientDuplicateDetection
        };
    }]);