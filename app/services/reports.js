﻿var _ = require('lodash');
var q = require('q');
var connectionManager = require('../pom/connection-mysql');
var dataTranslator = require('./mysql-translator');
var stamp = require('../model/stamp');
var catalogue = require('../model/catalogue');
var ownership = require('../model/ownership');
var catalogueNumber = require('../model/catalogue-number');
var Logger = require('../util/logger');
var ExchangeRates = require('../util/exchange-rates');
var fx = require('money');
var accounting = require('accounting');

var report = function () {
    "use strict";

    var sqlTrace = Logger.getLogger("sql");

    function generateFromTables() {
        var sql = "FROM " + stamp.getTableName() + ' AS ' + stamp.getAlias() + ' ';
        sql += 'JOIN ' + catalogueNumber.getTableName() + ' AS ' + catalogueNumber.getAlias() + ' ON ' + stamp.getAlias() + '.ID=' + catalogueNumber.getAlias() + '.STAMP_ID ';
        sql += "LEFT JOIN " + ownership.getTableName() + ' AS ' + ownership.getAlias() + ' ON ' + stamp.getAlias() + '.ID=' + ownership.getAlias() + '.STAMP_ID ';
        sql += "LEFT JOIN " + catalogue.getTableName() + ' AS ' + catalogue.getAlias() + ' ON ' + catalogueNumber.getAlias() + '.CATALOGUE_REF = ' + catalogue.getAlias() + '.ID ';
        return sql;
    }
    return {
        getCatalogueTotal: function ($filter, currency) {
            var defer = q.defer();
            connectionManager.getConnection("reports").then(function (connection) {
                var sql = "SELECT " + catalogue.getAlias() + ".CURRENCY, SUM(" + catalogueNumber.getAlias() + ".CATALOGUEVALUE) AS VALUE ";
                sql += generateFromTables();
                sql += "WHERE " + catalogueNumber.getAlias() + ".ACTIVE=1 ";
                var whereClause = ($filter) ? dataTranslator.toWhereClause($filter, [stamp, catalogueNumber, catalogue, ownership]) : '';
                if (whereClause.length > 0) {
                    sql += "AND " + whereClause + " ";
                }
                sql += "GROUP BY " + catalogueNumber.getAlias() + ".CATALOGUE_REF";
                sqlTrace.debug(sql);
                var query = connection.query(sql, function (err, results) {
                    if (err) {
                        defer.reject(dataTranslator.getErrorMessage(err));
                    }
                    var processResults = function () {
                        var sum = 0.0;
                        _.each(results, function (result) {
                            if( result.VALUE && result.VALUE > 0 ) {
                                var cur = result.CURRENCY;
                                if( !cur || cur === '' ) {
                                    cur = 'USD';
                                }
                                try {
                                    sum += fx.convert(result.VALUE, { from: cur, to: currency });
                                } catch( fxErr ) {
                                    if (fxErr !== 'fx error') {
                                        throw fxErr;
                                    } else {
                                        sqlTrace.error(fxErr + ':' + cur + ' to ' + currency);
                                    }
                                }
                            }
                        });
                        var value = accounting.toFixed(sum, 2);
                        defer.resolve(value);
                    };
                    ExchangeRates.checkRates(processResults);
                });
            });
            return defer.promise;
        },
        getCostBasis: function ($filter, currency) {
            var defer = q.defer();
            connectionManager.getConnection("reports").then(function (connection) {
                var sql = "SELECT DISTINCT " + stamp.getAlias()  +".ID," + ownership.getAlias() + ".CURRENCY," + ownership.getAlias() + ".PRICE AS VALUE ";
                sql += generateFromTables();
                sql += "WHERE " + stamp.getAlias() + ".WANTLIST=0 ";
                var whereClause = ($filter) ? dataTranslator.toWhereClause($filter, [stamp, catalogueNumber, catalogue, ownership]) : '';
                if (whereClause.length > 0) {
                    sql += "AND " + whereClause + " ";
                }
                sqlTrace.debug(sql);
                var query = connection.query(sql, function (err, results) {
                    if (err) {
                        defer.reject(dataTranslator.getErrorMessage(err));
                    }
                    var processResults = function () {
                        var sum = 0.0;
                        _.each(results, function (result) {
                            if( result.VALUE && result.VALUE > 0 ) {
                                var cur = result.CURRENCY;
                                if( !cur || cur === '' ) {
                                    cur = 'USD';
                                }
                                try {
                                    sum += fx.convert(result.VALUE, { from: cur, to: currency });
                                } catch( fxErr ) {
                                    if (fxErr !== 'fx error') {
                                        throw fxErr;
                                    } else {
                                        sqlTrace.error(fxErr + ':' + cur + ' to ' + currency);
                                    }
                                }
                            }
                        });
                        var value = accounting.toFixed(sum, 2);
                        defer.resolve(value);
                    };
                    ExchangeRates.checkRates(processResults);
                });
            });
            return defer.promise;
        },
        getCashValue: function ($filter, currency) {
            var defer = q.defer();
            defer.resolve(10.0);
            return defer.promise;
        }
    };
}();

module.exports = report;
