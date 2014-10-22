var extend = require('node.extend');
var fieldDefinition = require('./field-definition');

var country = extend({}, fieldDefinition, function() {
    "use strict";
    return {
        getFieldDefinitions: function () {
            return [
                { field: 'name', column: 'NAME', type: 'string', required: true },
                { field: 'description', column: 'DESCRIPTION', type: 'string', externalizeOnEmpty: false },
                { field: 'id', column: 'ID', type: 'long', required: true },
                { field: 'createTimestamp', column: 'CREATESTAMP', type: 'date', internal: true },
                { field: 'modifyTimestamp', column: 'MODIFYSTAMP', type: 'date', internal: true }
            ];
        },
        getSequenceColumn: function () {
            return "COUNTRY_ID";
        },
        getTableName: function () {
            return "COUNTRIES";
        },
        getAlias: function () {
            return "cn";
        }

    };
}());

module.exports = country;
