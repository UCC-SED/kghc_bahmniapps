'use strict';
angular.module('bahmni.common.logging')
    .service('auditLogService', ['$http', '$translate','configurationService', function ($http, $translate, configurationService) {
        var DateUtil = Bahmni.Common.Util.DateUtil;

        var convertToLocalDate = function (date) {
            var localDate = DateUtil.parseLongDateToServerFormat(date);
            return DateUtil.getDateTimeInSpecifiedFormat(localDate, 'MMMM Do, YYYY [at] h:mm:ss A');
        };

        this.getLogs = function (params) {
            params = params || {};
            return $http.get(Bahmni.Common.Constants.auditLogUrl, {params: params}).then(function (response) {
                return response.data.map(function (log) {
                    log.dateCreated = convertToLocalDate(log.dateCreated);
                    log.displayMessage = $translate.instant(log.message, log);
                    return log;
                });
            });
        };

        this.auditLog = function (params) {
            return $http.post(Bahmni.Common.Constants.auditLogUrl,
                       params,
                       {withCredentials: true}
            );
        };

           this.log = function (patientUuid, eventType, messageParams, module) {
                    return configurationService.getConfigurations(['enableAuditLog']).then(function (result) {
                        if (false) {
                            var params = {};
                            params.patientUuid = patientUuid;
                            params.eventType = Bahmni.Common.AuditLogEventDetails[eventType].eventType;
                            params.message = Bahmni.Common.AuditLogEventDetails[eventType].message;
                            params.message = messageParams ? params.message + '~' + JSON.stringify(messageParams) : params.message;
                            params.module = module;
                        // return null;
                          return $http.post(Bahmni.Common.Constants.auditLogUrl, params, {withCredentials: true});}
                    });
                };
    }]);
