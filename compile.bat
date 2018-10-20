@echo off

:: Removed --formatting=PRETTY_PRINT

java -client -jar closure-compiler.jar --create_source_map js-compiled.js.map --js_output_file js-compiled.js --js js-lib\*.js --js js-lib\*\*.js --warning_level=VERBOSE --language_in=ECMASCRIPT6 --compilation_level=ADVANCED_OPTIMIZATIONS --output_wrapper_file compile-output-wrapper.js
pause
