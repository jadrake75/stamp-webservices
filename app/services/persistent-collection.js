var _ = require('lodash');
var q = require('q');
var connectionManager = require('../pom/connection-mysql');
var dataTranslator = require('./mysql-translator');
var odata = require('odata-filter-parser')
var Parser = odata.Parser;
var Operators = odata.Operators;
var Predicate = odata.Predicate;
var Logger = require('../util/logger');


function PersistentCollection() {
    "use strict";

    let sqlTrace = Logger.getLogger("sql");
    let logger = Logger.getLogger("server");

    return {
        generateId : (fieldDefinition, obj) => {
            let defer = q.defer();
            if (obj.ID) {
                defer.resolve(obj.ID);
            } else {
                PersistentCollection.getNextSequence(fieldDefinition, (err, new_id) => {
                    if (err) {
                        defer.reject(dataTranslator.getErrorMessage(err));
                    } else {
                        PersistentCollection.updateSequence(new_id, fieldDefinition).then(() => {
                            defer.resolve(new_id);
                        }, (s_err) => {
                            defer.reject(dataTranslator.getErrorMessage(s_err));
                        });
                    }
                });
            }
            return defer.promise;
        },

        update: function (obj, id, params) {
            let defer = q.defer();
            let provided = this.fieldDefinition.internalize(obj);
            let that = this;
            this.findById(id).then(storedObj => {
                if(storedObj === null ) {
                    defer.reject({ message: "The object was not found", code: "NOT_FOUND", processed: true });
                }
                else {
                    connectionManager.getConnection().then(connection => {
                        let qs = dataTranslator.generateUpdateByFields(that.fieldDefinition, provided, storedObj);
                        if( qs !== null ) {
                            sqlTrace.debug(qs);
                            connection.beginTransaction(err => {
                                connection.query(qs, (err, rows) => {
                                    if (!PersistentCollection.rollbackOnError(connection, defer, err)) {
                                        if (rows.changedRows === 0 && rows.affectedRows === 0) {
                                            connection.rollback(function () {
                                                connection.release();
                                                defer.reject({ message: "No changes made during update.", code: "NO_CHANGES", processed: true });
                                            });
                                        } else {
                                            let merged = that.fieldDefinition.merge(provided, storedObj);
                                            that.preCommitUpdate(connection, merged, storedObj, params).then(output => {
                                                connection.commit(function (err) {
                                                    connection.release();
                                                    if (err) {
                                                        defer.reject(dataTranslator.getErrorMessage(err));
                                                    }
                                                    else if (output.modified) {
                                                        that.findById(id).then(findResult => {
                                                            defer.resolve(findResult);
                                                        }, err => {
                                                            defer.reject(dataTranslator.getErrorMessage(err));
                                                        });
                                                    } else {
                                                        defer.resolve(merged);
                                                    }
                                                });
                                            }, err => {
                                                connection.rollback(() => {
                                                    connection.release();
                                                    defer.reject(err);
                                                });
                                            });
                                        }
                                    }
                                });
                            });
                        }

                    }, err => {
                        defer.reject(dataTranslator.getErrorMessage(err));
                    });
                }

            }, err => {
                defer.reject(dataTranslator.getErrorMessage(err));
            });
            return defer.promise;
        },

        create: function(obj) {
            var defer = q.defer();
            var that = this;

            var provided = this.fieldDefinition.internalize(obj);
            var generateId = false;
            connectionManager.getConnection().then(function (connection) {
                connection.beginTransaction(function (err) {
                    if (!PersistentCollection.rollbackOnError(connection, defer, err)) {
                        that.generateId(that.fieldDefinition, provided).then(function (id) {
                            provided.ID = id;
                            that.preCreate(provided).then(() => {  // opportunity for services to manipulate the object
                                var validation = that.fieldDefinition.validate(provided);
                                if( validation === null ) {
                                    var insertStatement = dataTranslator. generateInsertByFields(that.fieldDefinition, provided);
                                    sqlTrace.debug(insertStatement);
                                    connection.query(insertStatement, function (err, rows) {
                                        if (!PersistentCollection.rollbackOnError(connection, defer, err)) {
                                            that.postCreate(connection, provided).then(function (_obj) {
                                                connection.commit(function () {
                                                    connection.release();
                                                    that.findById(id).then(function (result) {
                                                        defer.resolve(result);
                                                    }, function (err) {
                                                        defer.reject(dataTranslator.getErrorMessage(err));
                                                    });
                                                });
                                            }, function (err) {
                                                PersistentCollection.rollbackOnError(connection, defer, err);
                                            });
                                        }
                                    });
                                } else {
                                    PersistentCollection.rollbackOnError(connection, defer, validation);
                                }
                            });

                        }, function (err) {
                            // error from generate id
                            PersistentCollection.rollbackOnError(connection, defer, err);
                        });
                    }
                }); // end transaction
            }, function (err) {
                defer.reject(dataTranslator.getErrorMessage(err));
            });
            
            return defer.promise;
        },
        
        remove: function (id) {
            var defer = q.defer();
            if( !id ) {
                defer.reject( { message: "No ID specified", code: "NOT_FOUND", processed: true });
            } else {
                var that = this;
                connectionManager.getConnection().then(function (connection) {
                    connection.beginTransaction(function (err) {
                        if (!PersistentCollection.rollbackOnError(connection, defer, err)) {
                            that.preDelete(connection, id).then(function () {
                                var qs = 'DELETE FROM ' + that.fieldDefinition.getTableName() + ' WHERE ID=?';
                                sqlTrace.debug(qs);
                                connection.query(qs, [id], function (err, rows) {
                                    if (err || rows.affectedRows === 0) {
                                        if (err) {
                                            logger.error("Issue during deletion" + err);
                                        }
                                        connection.rollback(function () {
                                            connection.release();
                                            defer.reject({ message: "No object found", code: "NOT_FOUND", processed: true });
                                        });
                                    } else {
                                        connection.commit(function () {
                                            connection.release();
                                            defer.resolve(rows.affectedRows);
                                        });
                                    }
                                });
                            }, function (err) {
                                PersistentCollection.rollbackOnError(connection, defer, err);
                            });
                        }
                    });
                });
            }
            return defer.promise;
        },
        
        getFromTables: function (params) {
            return this.fieldDefinition.getTableName() + " AS " + this.fieldDefinition.getAlias();
        },

        getWhereClause: function (params) {
            return (params && params.$filter) ? dataTranslator.toWhereClause(params.$filter, [this.fieldDefinition]) : '';
        },

        getOrderByClause: function(params, definitions) {
            if( !params.$orderby ) {
                return '';
            }
            if( !definitions ) {
                definitions = [];
                definitions.push(this.fieldDefinition);
            }
            var sortKeys = params.$orderby.split(' ');
            var orderby = '';
            var found = false;
            _.each( definitions, function(definition) {
                if( !found ) {
                    var field = _.find(definition.getFieldDefinitions(), { field: sortKeys[0] });
                    if( field ) {
                        if( field.sortFn ) {
                            orderby = (field.sortFn.apply(definition));
                        } else if( field.type !== 'id_array' || field.type !== 'obj_array') {
                            orderby = definition.getAlias() + '.' + field.column;
                        }
                        found = true;
                    }
                }

            });

            if( orderby.length > 0 ) {
                orderby = 'ORDER BY ' + orderby;
                if( sortKeys.length > 1 ) {
                    orderby += ' ' + sortKeys[1].toUpperCase();
                }
            }
            return orderby;
        },
        count: function (params) {
            var defer = q.defer();
            var that = this;
            var whereClause = this.getWhereClause(params);
            var qs = 'SELECT COUNT(DISTINCT ' + that.fieldDefinition.getAlias() + '.ID) AS COUNT FROM ' + this.getFromTables(params) + ((whereClause.length > 0) ? (' WHERE ' + whereClause) : '');
            sqlTrace.debug(qs);
            connectionManager.getConnection().then(function (connection) {
                connection.query(qs, function (err, result) {
                    connection.release();
                    if (err !== null) {
                        defer.reject(dataTranslator.getErrorMessage(err));
                    } else if (result.length > 0) {
                        defer.resolve(result[0].COUNT);
                    } else {
                        defer.reject({ message: "No object found", code: "NOT_FOUND", processed: true });
                    }
                });
            }, function (err) {
                defer.reject(dataTranslator.getErrorMessage(err));
            });
            return defer.promise;
        },
        
        findById: function (id) {
            var params = {
                $filter: new Predicate({
                        subject: 'id',
                        operator: Operators.EQUALS,
                        value: id
                }),
                $limit: 1000,
                $offset: 0,
                $orderby: null
            };
            var defer = q.defer();
            var that = this;
            that.find(params).then(function (result) { // we can limit to 1,1 once the stamps find is fixed
                if (result.rows && result.rows.length > 0) {
                    defer.resolve(result.rows[0]);
                } else {
                    defer.resolve(null);
                }
            }, function (err) {
                defer.reject(err);
            });
            return defer.promise;
        },
        find: function (params) {
            var defer = q.defer();
            var that = this;
            var whereClause = this.getWhereClause(params);
            const _defaults = {
                $limit: 1000,
                $offset: 0
            };
            params = params || _defaults;

            var qs = 'SELECT SQL_CALC_FOUND_ROWS ' + that.fieldDefinition.getAlias() + '.* FROM ' + that.getFromTables(params) + ((whereClause.length > 0) ? (' WHERE ' + whereClause) : '') + ' ' + that.getOrderByClause(params) + ' LIMIT ' + params.$offset + ',' + params.$limit;
            sqlTrace.debug(qs);
            connectionManager.getConnection().then(function (connection) {
                let t = (new Date()).getTime();
                connection.query(qs, function (err, dataRows) {
                    if (err !== null) {
                        connection.release();
                        defer.reject(dataTranslator.getErrorMessage(err));
                    }
                    else if (dataRows.length > 0) {
                        connection.query("SELECT FOUND_ROWS() AS ROWCOUNT", function(err,rowCount) {
                            if( err ) {
                                connection.release();
                                defer.reject(dataTranslator.getErrorMessage(err));
                            }
                            var result = {
                                total: rowCount[0].ROWCOUNT,
                                rows: dataRows
                            };
                            that.postFind(connection, result).then(function () {
                                connection.release();
                                if( that.collectionName === 'stamps') {
                                    console.log("query time: " + ((new Date()).getTime() - t) + "ms");
                                }
                                defer.resolve(result);
                            }, function(err) {
                                connection.release();
                                defer.reject(dataTranslator.getErrorMessage(err));
                            });
                        });

                    } else {
                        connection.release();
                        defer.resolve({ rows: [], total: 0});
                    }
                });
            }, function (err) {
                defer.reject(dataTranslator.getErrorMessage(err));
            });
            return defer.promise;
        },
        preCreate: obj => {
            return Promise.resolve();
        },
        postFind: function (connection, rows) {
            var defer = q.defer();
            defer.resolve(rows);
            return defer.promise;
        },
        /** Post create hook to do additional operations */
        postCreate: function (connection, obj) {
            var defer = q.defer();
            defer.resolve(obj);
            return defer.promise;
        },
        preCommitUpdate: async (connection,merged,storedObj) => {
            return new Promise((resolve) => {
                resolve({
                    modified: false
                });
            });
        },
        preDelete: function (connection, id) {
            var defer = q.defer();
            defer.resolve();
            return defer.promise;
        },
        
        /**  The name of the collection in the datastore */
        collectionName: undefined,
        fieldDefinition: undefined
    };
}

PersistentCollection.last_id = {};

PersistentCollection.rollbackOnError = (connection, defer, err) => {
    "use strict";
    if (err) {
        connection.rollback(() => {
            connection.release();
            if(defer.reject) {
                defer.reject(dataTranslator.getErrorMessage(err));
            } else {
                defer(dataTranslator.getErrorMessage(err));
            }
        });
        return true;
    }
    return false;
};

PersistentCollection.getNextSequence = (fieldDefinition, callback) => {
    "use strict";
    connectionManager.getConnection().then(connection => {
        connection.query("SELECT ID_VAL FROM SEQUENCE_GEN WHERE ID_NAME='" + fieldDefinition.getSequenceColumn() + "'", (err, result) => {
            connection.release();
            if (err) {
                callback(err, null);
            } else if (result.length > 0) {
                let id_val = result[0].ID_VAL;
                let last_id = PersistentCollection.last_id[fieldDefinition.getTableName()];
                id_val = Math.max(id_val, (!last_id) ? 0 : last_id) + 1;
                PersistentCollection.last_id[fieldDefinition.getTableName()] = id_val;
                callback(null, id_val);
            } else {
                let l_id = PersistentCollection.last_id[fieldDefinition.getTableName()];
                if( !l_id ) {
                    l_id = 0;
                }
                PersistentCollection.last_id[fieldDefinition.getTableName()] = l_id++;
                callback(null, l_id);
            }
        });
    });
};

PersistentCollection.updateSequence = (_id, fieldDefinition) => {
    "use strict";
    let sqlTrace = Logger.getLogger("sql");
    let defer = q.defer();
    let qs = "UPDATE SEQUENCE_GEN SET ID_VAL=? WHERE ID_NAME='" + fieldDefinition.getSequenceColumn() + "'";
    sqlTrace.debug(qs + " Bind params: [" + _id + "]");
    connectionManager.getConnection().then(connection => {
        connection.beginTransaction(err => {
            connection.query(qs, [_id], (err, rows) => {
                if (err) {
                    connection.rollback(() => {
                        connection.release();
                        defer.reject(dataTranslator.getErrorMessage(err));
                    });
                } else {
                    connection.commit(c_err => {
                        connection.release();
                        defer.resolve();
                    });
                }
            }); // end query
        }); // end transaction begin
    });
    return defer.promise;
};


module.exports = PersistentCollection;
