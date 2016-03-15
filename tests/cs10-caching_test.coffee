# Description:
#   Automated tests for the cs10 caching library
#
# Dependencies:
#   hubot-test-helper
#   bluebird
#   co
#   chai.expect
#
# Author:
#  Andrew Schmitt
Helper = require('hubot-test-helper')
helper = new Helper('../scripts');

Promise = require('bluebird')
co      = require('co')
expect  = require('chai').expect

start_wait_time = 6000

describe 'cs10.caching', ->
  @timeout(1.5 * start_wait_time)

  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  context 'user sends command /Refresh cache', ->
    beforeEach ->
      co =>
        yield @room.user.say 'alice', '@hubot Refresh Cache'
        yield new Promise.delay(start_wait_time)

    it 'should reply 5 times about refreshing the cache', ->
      expect(@room.messages).to.have.length(6)
