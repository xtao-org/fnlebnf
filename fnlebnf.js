// todo: eof as character (.end())

const seq = (its, debugName) => (ii = null) => {
  let p = 0
  let it = its[p](ii)
  const eat = (c, i) => {
    const [sname, j, dn] = it(c, i)
    if (sname === 'fail') {
      console.log('fail', dn, debugName)
      return ['fail', j, dn ?? debugName]
    }
    if (sname === 'done') {
      p += 1
      // console.log("SEQ DONE 1", c, i, debugName, p)
      if (p >= its.length) {
        // console.log("SEQ DONE", c, i, debugName, p)
        console.log('done', dn, debugName)
        return ['done', j, dn ?? debugName]
      }
      // x = true
      it = its[p](j)
    }
    return ['pending', j, dn ?? debugName]
  }
  return eat
}

const alt = (its, debugName) => (ii = null) => {
  let p = 0
  let it = its[p](ii)
  // console.log("ALT INIT", ii, its, debugName)
  const eat = (c, i) => {
    const s = it(c, i)
    const [sname, j, dn] = s
    if (sname === 'fail') {
      p += 1
      if (p >= its.length) {
        console.log('fail', dn, debugName)
        return ['fail', j, dn ?? debugName]
      }
      it = its[p](ii)
      return ['pending', ii, debugName]
    }
    return [sname, j, dn ?? debugName]
  }
  return eat
}

const zom = (itc, debugName) => (ii = null) => {
  let it = itc(ii)
  // console.log("ZOM INIT", ii)
  const eat = (c, i) => {
    // console.log("ZOM", c, i)
    if (c === undefined) {
      console.log('done', debugName)
      return ['done', i, debugName]
    }
    const [sname, j, dn] = it(c, i)
    if (sname === 'fail') {
      // console.log("ZOM FAIL", c, i, ii)
      console.log('done', dn, debugName)
      return ['done', ii, debugName]
    }
    if (sname === 'done') {
      ii = j
      it = itc(j)
    }
    return ['pending', j, dn ?? debugName]
  }
  return eat
}
// note: a variant of zom -- keep in sync
const oom = (itc, debugName) => (ii = null) => {
  // console.log("OOOM INIT", ii, debugName)
  let cnt = 0
  let it = itc(ii)
  const eat = (c, i) => {
    // console.log("OOOM", ii, c, i, debugName)
    const [sname, j, dn] = it(c, i)
    if (sname === 'fail') {
      console.log('fail', dn, debugName)
      if (cnt === 0) return ['fail', j, dn ?? debugName]
      // console.log('oom done')
      console.log('done', dn, debugName)
      return ['done', ii, debugName]
    }
    if (sname === 'done') {
      // todo?: perhaps there should be a separate variable from ii that gets updated after each instance is matched
      // then ii can mark the beginning of the entire sequence -- but atm that's not necessary
      // same applies to zom and zomChars...
      ii = j
      cnt += 1
      it = itc(ii)
    }
    return ['pending', j, dn ?? debugName]
  }
  return eat
}
// note: a variant of zom -- keep in sync
// atm important difference: zom and oom are called w X, opt is called w/ X()
const opt = (itc, debugName) => (ii) => {
  // console.log("OPT INIT", ii)
  let it = itc(ii)
  const eat = (c, i) => {
    const [sname, j, dn] = it(c, i)
    if (sname === 'fail') {
      // console.log("OPT ABSENT", ii)
      console.log('done', dn, debugName)
      return ['done', ii, debugName]
    }
    if (sname === 'done') {
      console.log('done', dn, debugName)
      return ['done', j, dn ?? debugName]
    }
    return ['pending', j, dn ?? debugName]
  }
  return eat
}

const zomCharsExcludingToken = (token) => (ii) => {
  const makeTokenMatcher = lit(token)
  const itc = Char
  let it = Char(ii)
  const indexToTokenMatcher = new Map()
  return (c, i) => {
    indexToTokenMatcher.set(i, makeTokenMatcher(ii))
    for (const [index, matcher] of indexToTokenMatcher) {
      const [sname, j] = matcher(c, i)
      if (sname === 'fail') indexToTokenMatcher.delete(index)
      else if (sname === 'done') {
        return [sname, j - token.length]
      }
    }

    const [sname, j] = it(c, i)
    if (sname === 'fail') {
      return ['done', ii]
    } else if (sname === 'done') {
      ii = j
      it = itc(ii)
    }
    return ['pending', j]
  }
}

const not = (chars) => ii => (c, i) => {
  if (chars.includes(c)) return ['fail', i]
  // return ['done', i]
  return ['done', i + 1]
}

const char = (h) => (ii) => {
  // console.log("CHAR INIT", h, ii)
  return (c, i) => {
    // console.log("CHAR", h, c, ii)
    if (h === c) return ['done', i + 1]
    return ['fail', i]
  }
}
const range = (a, b) => ii => (c, i) => {
  if (c >= a && c <= b) return ['done', i + 1]
  return ['fail', i]
}
const ranges = (...ranges) => ii => (c, i) => {
  for (const [a, b] of ranges) {
    if (c >= a && c <= b) return ['done', i + 1]
  }
  return ['fail', i]
}
const ranges2 = (...ranges) => ii => (c, i) => {
  for (const p of ranges) {
    if (Array.isArray(p)) {
      const [a, b] = p
      if (c >= a && c <= b) return ['done', i + 1]
    } else if (c === p) return ['done', i + 1]
  }
  return ['fail', i]
}
const except = (itc, chars) => (ii) => {
  // console.log("CHAR INIT", h, ii)
  const it = itc(ii)
  return (c, i) => {
    // console.log("CHAR", h, c, ii)
    if (chars.includes(c)) return ['fail', i]
    return it(c, i)
  }
}
const codePointRanges = (...ranges) => ii => (c, i) => {
  const ccp = c.codePointAt(0)
  for (const p of ranges) {
    if (Array.isArray(p)) {
      const [a, b] = p
      if (ccp >= a && ccp <= b) return ['done', i + 1]
    } else if (ccp === p) return ['done', i + 1]
  }
  return ['fail', i]
}
const lit = (str) => ii => {
  let index = 0
  return (c, i) => {
    console.log("LIT", i, c, str, index)
    if (str[index] === c) {
      ++index
      if (index >= str.length) return ['done', i + 1]
      // console.log(str, index, i)
      return ['pending', i + 1]
    }
    // return ['fail', i - str.length]
    return ['fail', i]
  }
}

export const fnlebnf = (next) => {
  const ccbs = new Set()
  const registerChunkCb = (cb) => {
    ccbs.add(cb)
    return () => {
      return ccbs.delete(cb)
    }
  }

  let currentChunk
  const getCurrentChunk = () => {
    return currentChunk
  }

  

  const emits = (name, fn) => ii => {
    // console.log('EMITS INIT', name, ii)
    let chunks = [getCurrentChunk()]
    const uccb = registerChunkCb((chunk) => {
      // could also emit event with partial result for each chunk rather than hold onto all chunks until complete CharData (or whatever) is parsed
      chunks.push(chunk)
    })

    const ondone = (jj) => {
      const lastChunk = chunks.at(-1)
      const lcl = lastChunk.length
      const combined = chunks.join('')
      const endi = -lcl + jj
      const slice = combined.slice(
        ii, 
        // note: endi of the very last thing will be 0 which would give the wrong result here
        // ?todo: optimize this check -- don't do it for every single emitter, just the last one (if possible)
        endi === 0? undefined: endi,
      )

      chunks = []

      // todo: if no next.emit then entire emits is pointless -- exit early/make it a noop
      next.emit?.(name, slice)
      return uccb()
    }

    let it = fn(ii)

    return (c, i) => {
      const ret = it(c, i)
      if (ret[0] === 'done') {
        const r = ondone(ret[1])
        if (r === false) throw Error('oops')
      }
      return ret
    }
  }

  ///////////
  // RULES //
  ///////////

  const todo = lit


  // ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
  const NameStartChar = ranges2(
    // note: we exclude ":" from xml names
    // ":",
    ["A","Z"],"_",["a","z"],["\u00c0","\u00d6"],["\u00d8","\u00f6"],["\u00f8","\u02ff"],["\u0370","\u037d"],["\u037f","\u1fff"],["\u200c","\u200d"],["\u2070","\u218f"],["\u2c00","\u2fef"],["\u3001","\ud7ff"],["\uf900","\ufdcf"],["\ufdf0","\ufffd"],["\ud800\udc00","\udb7f\udfff"])
  
  // NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
  const NameChar = alt([
    NameStartChar,
    char('-'),
    char('.'),
    range('0', '9'),
    char('\xB7'),
    range('\u0300', '\u036F'),
    range('\u203F', '\u2040'),
  ], 'NameChar')
  const Name = seq([
    // zom(Whitespace),
    NameStartChar,
    zom(NameChar)
  ], 'Name')

  // '/*' ( [^*] | '*'+ [^*/] )* '*'* '*/'
  // /* ws: explicit */ 
  const Comment = emits('Comment', seq([
    lit('/*'),
    zom(alt([
      not('*'),
      seq([
        oom(char('*')),
        not('*/'),
      ]),
    ])),
    // zom(char('*')),
    lit('*/'),
  ], 'Comment'))
  // #x9 | #xA | #xD | #x20
  const S = alt([
    char('\x09'),
    char('\x0A'),
    char('\x0D'),
    char('\x20'),
  ], 'S')
  // S | Comment
  const Whitespace = alt([
    S,
    Comment,
  ], 'Whitespace')
  // '#x' [0-9a-fA-F]+
  // /* ws: explicit */ 
  const CharCode = seq([
    lit('#x'),
    oom(ranges(['0', '9'], ['a', 'f'], ['A', 'F'])),
  ], 'CharCode')
  // CharCode '-' CharCode
  // /* ws: explicit */ 
  const CharCodeRange = seq([
    CharCode, char('-'), CharCode,
  ], 'CharCodeRange')
  // [http://www.w3.org/TR/xml#NT-Char]
  // #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]	/* any Unicode character, excluding the surrogate blocks, FFFE, and FFFF. */
  // todo: not sure if correct
  const Char = ranges2(
    "\x09",
    "\x0A",
    "\x0D",
    ["\x20","\ud7ff"],
    ["\ue000","\ufffd"],
    ["\ud800\udc00","\udb7f\udfff"],
  )
  const CharExceptRb = except(Char, ']')
  // Char '-' ( Char - ']' )
  // /* ws: explicit */ 
  const CharRange = seq([
    CharExceptRb,
    char('-'),
    CharExceptRb,
  ], 'CharRange')
  // '[' '^'? ( Char | CharCode | CharRange | CharCodeRange )+ ']'
  // /* ws: explicit */ 
  const CharClass = seq([
    char('['),
    opt(char('^')),
    oom(alt([
      CharCodeRange,
      CharRange,
      CharCode,
      CharExceptRb,
    ])),
    char(']'),
  ], 'CharClass')
  // /* ws: explicit */ 
  // '"' [^"]* '"' | "'" [^']* "'"
  const StringLiteral = emits('lit', alt([
    seq([
      char('"'),
      zom(not('"')),
      char('"'),
    ]),
    seq([
      char("'"),
      zom(not("'")),
      char("'"),
    ]),
  ], 'StringLiteral'))
  // [http://www.w3.org/TR/xml-names/#NT-NCName]
  // Name - (Char* ':' Char*)	/* An XML Name, minus the ":" */
  const NCName = Name
  // NCName | StringLiteral | CharCode | CharClass | '(' Choice ')'
  const Primary = (ii) => alt([
    // opt(Whitespace),
    emits('PrimaryName', NCName),
    // opt(Whitespace),
    StringLiteral,
    CharCode,
    CharClass,
    seq([
      zom(char(' ')),
      char('('),
      zom(char(' ')),
      Choice, 
      zom(char(' ')),
      char(')'),
    ]),
  ], 'Primary')(ii)
  // Primary ( '?' | '*' | '+' )*
  const Item = seq([
    // zom(Whitespace),
    Primary,
    // zom(Whitespace),
    zom(alt([
      emits('opt', char('?')),
      emits('zom', char('*')),
      emits('oom', char('+')),
    ])),
    // zom(Whitespace),
  ], 'Item')
  // (Item ( '-' Item | Item* ))?
  const SequenceOrDifference = ( //opt(
    seq([
      Item,
      alt([
        seq([
          zom(char(' ')),
          char('-'), 
          zom(char(' ')),
          Item,
        ]),
        zom(seq([zom(char(' ')), Item])),
      ])
    ])//, 
    //'SequenceOrDifference'
  )
  // [^#x5D:/?#]+ '://' [^#x5D#]+ ('#' NCName)?
  // /* ws: explicit */ 
  const URL = seq([
    // todo: not sure what #x5D means here
    oom(not(`\x5D:/?#`)),
    lit('://'),
    oom(not(`\x5D#`)),
    opt(seq([
      char('#'), 
      NCName,
    ]))
  ], 'URL')
  // '[' URL ']'
  const Link = (ii) => 
  { 
    console.log('LINK******************')
    return seq([
      // zom(Whitespace),
      char('['), 
      // zom(Whitespace),
      URL, 
      // zom(Whitespace),
      char(']'),
      // zom(Whitespace),
    ], 'Link')(ii)
  }
  // SequenceOrDifference ( '|' SequenceOrDifference )*
  const Choice = seq([
    SequenceOrDifference,
    zom(seq([
      zom(char(' ')),
      char('|'),
      zom(char(' ')),
      SequenceOrDifference,
    ], ' | SequenceOrDifference'))
  ], 'Choice')
  // NCName '::=' ( Choice | Link )
  const Production = seq([
    // zom(Whitespace),
    emits('ProductionName', NCName),
    zom(char(' ')),
    lit('::='),
    zom(char(' ')),
    alt([
      Link,
      Choice,
    ], 'Choice | Link'),
    zom(Whitespace),
  ], 'Production')
  // Production*
  const Grammar = zom(Production, 'Grammar')






  let status = ['initial', 0], i = 0

  const start = Grammar(0)
  const iter = wrapIter()
  i = 0

  return {
    chunk(str) {
      currentChunk = str
      for (const cb of ccbs) {
        cb(str)
      }
      iter.iter(str)
      while (true) {
        if (status[0] === 'done') throw Error(`Done too early ${i} ${str.slice(i)}`)
        const {done, value} = iter.next()
        if (done) {
          iter.pop()
          // console.log(done, value, iter.debug())
          break
        }
        const c = value
        status = start(c, i)

        if (status[0] === 'fail') throw Error(`Parsing failed: ${status}`)

        const d = status[1] - i
        console.log(c, i, d, status)
        if (d <= 0) iter.rewind(d - 1)
        i = status[1]
      }
    },
    end() {
      status = start(undefined, i)
      const [sname, c] = status
      if (sname === 'done') return next.end?.()
      // todo: fix
      // if (sname === 'done' && c === undefined) return next.end()

      throw Error(`Unexpected end status: ${sname}`)
    }
  }
}

const wrapIter = (maxbuflen = 256) => {
  let iter
  const buf = []
  let rewindex = 0

  return {
    // todo: remove?
    debug() {
      console.log(iter, buf, rewindex)
    },
    iter(str) {
      iter = str[Symbol.iterator]()
    },
    // ?todo: maybe there is a nicer way? maybe not
    pop() {
      buf.pop()
    },
    next() {
      if (rewindex < 0) return buf.at(rewindex++)
      const next = iter.next()
      if (buf.length > maxbuflen) buf.shift()
      // todo: maybe push next.value ?? next.done instead
      buf.push(next)
      return next // or next.value ?? next.done
    },
    rewind(d) {
      rewindex += d
      // console.log(buf.length, rewindex)
      if (buf.length + rewindex < 0) throw Error(`Can't rewind beyond buffer length (${buf.length}, max: ${maxbuflen})!`)
    }
  }
}