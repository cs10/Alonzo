Helper = require('hubot-test-helper')
loader = require('../scripts/loader.js')
# helper loads all scripts passed a directory
helper = new Helper(loader)

Promise = require('bluebird')
co      = require('co')
expect  = require('chai').expect

api_wait_time = 6000

describe 'cs10.caching', ->

  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  context 'user sends command /Refresh cache', ->
    beforeEach ->
      co =>
        @timeout(1.5 * api_wait_time)
        yield @room.user.say 'alice', '@hubot Refresh Cache'
        yield new Promise.delay(api_wait_time)

    it 'should reply with caching success for all objects', ->
      expect(@room.messages).should.have.memebers [
        ['alice', '@hubot Refresh Cache']
        ['hubot', 'Waiting on bCourses...']
        ['hubot', 'Successfully cached student groups! :)']
        ['hubot', 'Successfully cached staff IDs! :)']
        ['hubot', 'Successfully cached lab assignments! :)']
        ['hubot', 'Successfully cached all assignments! :)']
      ]

    it 'should reply 5 times about refreshing the cache', ->
      expect(@room.messages).to.have.length(6);