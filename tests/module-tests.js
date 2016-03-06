var sinon = require('sinon');
var assert = require('assert');
var Module = require('./../src/module');
var Promise = require('promise');
var ResourceManager = require('resource-manager-js');
var ElementKit = require('element-kit');

describe('Module', function () {


    it('calling fetchData() with url, should pass url to ResourceManager\'s fetchData()', function () {
        var resourceManagerFetchDataStub = sinon.stub(ResourceManager, 'fetchData').returns(Promise.resolve());
        var module = new Module();
        var url = 'http://my.com/test/url';
        return module.fetchData(url).then(function () {
            assert.equal(resourceManagerFetchDataStub.args[0][0], url);
            module.destroy();
            resourceManagerFetchDataStub.restore();
        });
    });

    it('calling fetchData() with an object should return with same object and no call should be made to ResourceManager\'s fetchData()', function () {
        var resourceManagerFetchDataStub = sinon.stub(ResourceManager, 'fetchData').returns(Promise.resolve());
        var module = new Module();
        var data = {
            'my-name': "Tester McTesterson"
        };
        return module.fetchData(data).then(function (returnedData) {
            assert.deepEqual(returnedData, data, 'Passed data was returned correctly');
            assert.equal(resourceManagerFetchDataStub.callCount, 0, 'Resource Manager\'s fetchData() method was not called');
            module.destroy();
            resourceManagerFetchDataStub.restore();
        });
    });
});