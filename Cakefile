require 'shortcake'

use 'cake-bundle'
use 'cake-linked'
use 'cake-outdated'
use 'cake-publish'
use 'cake-test'
use 'cake-version'

task 'clean', 'clean project', ->
  exec 'rm -rf dist'

task 'build', 'build project', ->
  Promise.all [
    bundle.write
      entry: 'src/index.coffee'
    bundle.write
      entry:    'src/runtime.coffee'
      dest:     'dist/runtime.js'
      format:   'es'
      commonjs: true
  ]

task 'watch', 'watch project', ->
  build = (filename) ->
    console.log filename, 'modified, rebuilding'
    invoke 'build' if not running 'build'
  watch 'src/*.coffee',  build
  watch 'node_modules/', build, watchSymlink: true
