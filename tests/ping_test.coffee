# Description:
#   Basic automated test for the ping-pong feature of cs10's hubot
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

describe 'ping', ->
  @timeout(1.5 * start_wait_time)

  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  context 'ping-PONG test', ->
    beforeEach ->
      co =>
        yield @room.user.say 'andy', '@hubot ping'
        yield new Promise.delay(start_wait_time)

    it 'should respond with pong', ->
      expect(@room.messages).to.deep.have.members [
        ['andy', '@hubot ping']
        ['hubot', 'PONG']
      ]
