#!/bin/bash

java -client -jar closure-compiler.jar \
  --js js-lib/**.js \
  --js js-lib/**/*.js \
  --warning_level=VERBOSE --formatting=PRETTY_PRINT --language_in=ECMASCRIPT6 --compilation_level=ADVANCED_OPTIMIZATIONS \
  > js-compiled.js

