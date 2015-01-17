# Description:
#   A collection of CS10 scripts to automate grading with our Canvas LMS
#   instance
#
# Dependencies:
#     node-canvas-lms
#
# Configuration:
#   HUBOT_CANVAS_TOKEN
#   BCOURSES_COURSE_ID
#
#
# Commands:
#   [late]? check off [LAB NUM] [late]? [SIDs...] – Late is optional.
#
# Notes:
#
#
# Author:
#   Michael Ball @cycomachead


bcourses = require './bcourses/canvas'

module.exports = bcourses