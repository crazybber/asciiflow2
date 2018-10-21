@echo off

:: Removed --formatting=PRETTY_PRINT
setlocal
pushd %~dp0
set CMDLINE=java -client -jar closure-compiler.jar
set CMDLINE=%CMDLINE% --create_source_map js-compiled.js.map
set CMDLINE=%CMDLINE% --js_output_file js-compiled.js
set CMDLINE=%CMDLINE% --js js-lib\*.js
set CMDLINE=%CMDLINE% --js js-lib\*\*.js
set CMDLINE=%CMDLINE% --warning_level=VERBOSE
set CMDLINE=%CMDLINE% --language_in=ECMASCRIPT6
set CMDLINE=%CMDLINE% --compilation_level=ADVANCED_OPTIMIZATIONS
set CMDLINE=%CMDLINE% --output_wrapper_file compile-output-wrapper.js
set CMDLINE=%CMDLINE% --jscomp_warning=lintChecks
:: This will expand CMDLINE first, then execute endlocal, then run the command
endlocal && call %CMDLINE%
popd %~dp0
call cmd /c pause
