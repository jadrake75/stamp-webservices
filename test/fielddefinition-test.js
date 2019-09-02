var expect = require('expect.js')
var country = require("../app/model/country");
var album = require("../app/model/album");
var preference = require("../app/model/preference");

describe('Field definition tests', function () {
    describe('Country field definition tests', function () {
        it("Validate with all required specified", function () {
            var c = {
                NAME: "Australia",
                ID: 500
            };
            expect(country.validate(c)).to.be(null);
        });

        it("Validate missing required parameters", function () {
            var c = {
                NAME: "Australia",
                DESCRIPTION: "other stuff"
            };
            var validate = country.validate(c);
            expect(validate).to.not.be(null);
            expect(validate.code).to.be.eql('REQUIRED_FIELD');
            delete c.NAME;
            c.ID = 250;
            validate = country.validate(c);
            expect(validate).to.not.be(null);
            expect(validate.code).to.be.eql('REQUIRED_FIELD');
        });

    });
    
    describe('Album field definition tests', function () {
        it("Validate merge of countries", function () {
            var c = { NAME: "test", COUNTRIES: [1,2] };
            var c2 = { NAME: "updated", DESCRIPTION: "descriptions" };
            var m = album.merge(c2, c);
            expect(m.NAME).to.be.eql("updated");
            expect(m.DESCRIPTION).to.be.eql("descriptions");
            expect(m.COUNTRIES).to.be.eql([1,2]);
        });
    });

    describe('Preference field definition tests', function () {
        it("Validate with all required specified", function () {
            var c = {
                NAME: "imagePath",
                ID: 25670,
                CATEGORY: "stamps",
                VALUE: "some path"
            };
            expect(preference.validate(c)).to.be(null);
        });
    });
});