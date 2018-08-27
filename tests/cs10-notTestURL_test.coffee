# Description:
#   Make sure bcourses config makes sense for deployment
#
# Dependencies:
#   chai.expect
#
# Author:
#  Andrew Schmitt

cs10    = require('../scripts/cs10/bcourses-config.js')
Promise = require('bluebird')
co      = require('co')
expect  = require('chai').expect

describe 'cs10.bcourses-config', ->

  context 'we should not be using the bcourses test url', ->

    it 'should be set to false', ->
      expect(cs10.test).to.equal(false)
