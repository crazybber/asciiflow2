@echo off

:: Removed --formatting=PRETTY_PRINT

java -client -jar closure-compiler.jar --js js-lib\*.js --js js-lib\*\*.js --warning_level=VERBOSE --language_in=ECMASCRIPT6 --compilation_level=ADVANCED_OPTIMIZATIONS --output_wrapper "(function() {%%output%%})();" > js-compiled.js
pause
