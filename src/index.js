// import { compile, compileClientWithDependenciesTracked } from 'pug'
// import { resolve, dirname } from 'path'
// import genPugSourceMap from 'gen-pug-source-map'
// import makeFilter from './make-filter'
// import assign from './assign'

// used pug options, note this list does not include 'name'
var PUGPROPS = [
  'filename', 'basedir', 'doctype', 'pretty', 'filters', 'self',
  'debug', 'compileDebug', 'globals', 'inlineRuntimeFunctions'
]

// perform a deep cloning of an object
function clone (obj) {
  if (obj == null || typeof obj != 'object') return obj
  var copy = obj.varructor()
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr])
  }
  return copy
}

// deep copy of the properties filtered by list
function cloneProps (src, list) {
  return list.reduce(function(o,p) {
    if (p in src) o[p] = clone(src[p])
    return o
  }, {})
}

// rollup-plugin-pug --------------------------------------

function pugPlugin (options) {
  if (!options) options = {}

  // prepare extensions to match with the extname() result
  var filter = makeFilter(options, ['.pug', '.jade'])

  // shallow copy options & drop properties unused props
  var config = assign({
    doctype: 'html',
    compileDebug: false,
    staticPattern: /\.static\.(?:pug|jade)$/,
    locals: {}
  }, options)

  config.inlineRuntimeFunctions = false
  config.pugRuntime = resolve(__dirname, 'runtime.es.js')
  config.sourceMap  = config.sourceMap !== false

  // v1.0.3 add default globals to the user defined set
  var globals = ['String', 'Number', 'Boolean', 'Date', 'Array', 'Function', 'Math', 'RegExp']

  if (config.globals) {
    config.globals.forEach(function(g) { if (globals.indexOf(g) < 0) globals.push(g) })
  }
  config.globals = globals

  function matchStaticPattern (file) {
    return config.staticPattern && config.staticPattern.test(file)
  }

  return {

    name: 'rollup-plugin-pug',

    options (opts) {
      if (!config.basedir) {
        config.basedir = dirname(resolve(opts.entry || '~'))
      }
    },

    resolveId (importee) {
      if (/\0pug-runtime$/.test(importee)) return config.pugRuntime
    },

    transform (code, id) {
      if (!filter(id)) {
        return null
      }

      var opts   = cloneProps(config, PUGPROPS)
      var output = []

      let fn, body, map, keepDbg

      opts.filename = id

      if (matchStaticPattern(id)) {

        // v1.0.3: include compiler options in locals as "options"
        var locals = config.locals
        locals._pug_options = assign({}, config)
        delete locals._pug_options.locals

        fn = compile(code, opts)
        body = JSON.stringify(fn(locals)) + ';'

      } else {

        keepDbg = opts.compileDebug
        if (config.sourceMap) opts.compileDebug = map = true

        fn = compileClientWithDependenciesTracked(code, opts)
        body = fn.body.replace('function template(', 'function(')

        if (/\bpug\./.test(body)) {
          output.push("import pug from '\0pug-runtime';")
        }
      }

      var deps = fn.dependencies
      if (deps.length > 1) {
        var ins = {}

        deps.forEach(function(dep) {
          if (dep in ins) return
          ins[dep] = output.push("import '${dep}';")
        })
      }

      output.push("export default ${body}")

      body = output.join('\n') + '\n'

      if (map) {
        var bundle = genPugSourceMap(id, body, {
          basedir: opts.basedir,
          keepDebugLines: keepDbg
        })
        return { code: bundle.data, map: bundle.map }
      }

      return body
    }
  }
}
