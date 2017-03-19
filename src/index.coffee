import { compile, compileClientWithDependenciesTracked } from 'pug'
import { resolve, dirname } from 'path'

import genPugSourceMap from 'gen-pug-source-map'

# used pug options, note this list does not include 'name'
PUG_PROPS = [
  'filename'
  'basedir'
  'doctype'
  'pretty'
  'filters'
  'self'
  'debug'
  'compileDebug'
  'globals'
  'inlineRuntimeFunctions'
]

pugRuntime = resolve __dirname, 'runtime.es.js'

export default (opts = {}) ->
  opts.doctype      ?= 'html'
  opts.compileDebug ?= false
  opts.locals       ?= {}
  opts.sourceMap    ?= true

  opts.inlineRuntimeFunctions = false


  name: 'puggle'

  options: (opts) ->
    if !config.basedir
      config.basedir = dirname(resolve(opts.entry or '~'))
    return

  resolveId: (importee) ->
    if /\0pug-runtime$/.test(importee)
      return config.pugRuntime
    return

  transform: (code, id) ->
    if !filter(id)
      return null

    opts = cloneProps(config, PUG_PROPS)
    output = []
    fn = undefined
    body = undefined
    map = undefined
    keepDbg = undefined
    opts.filename = id

    if matchStaticPattern(id)
      # v1.0.3: include compiler options in locals as "options"
      locals = config.locals
      locals._pug_options = assign({}, config)
      delete locals._pug_options.locals
      fn = compile(code, opts)
      body = JSON.stringify(fn(locals)) + ';'
    else
      keepDbg = opts.compileDebug
      if config.sourceMap
        opts.compileDebug = map = true
      fn = compileClientWithDependenciesTracked(code, opts)
      body = fn.body.replace('function template(', 'function(')
      if /\bpug\./.test(body)
        output.push 'import pug from \'\u0000pug-runtime\';'
    deps = fn.dependencies
    if deps.length > 1
      ins = {}
      deps.forEach (dep) ->
        if dep of ins
          return
        ins[dep] = output.push('import \'${dep}\';')
        return
    output.push 'export default ${body}'
    body = output.join('\n') + '\n'
    if map
      bundle = genPugSourceMap(id, body,
        basedir: opts.basedir
        keepDebugLines: keepDbg)
      return {
        code: bundle.data
        map: bundle.map
      }
    body
