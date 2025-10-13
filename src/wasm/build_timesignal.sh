#!/bin/bash

set -ue

EMCC_PARAMS=(
  "-sEXPORTED_RUNTIME_METHODS="addFunction,emscriptenRegisterAudioObject,emscriptenGetAudioObject""
  '-sEXPORT_NAME=createTimeSignalModule'
  '-sINITIAL_MEMORY=65536'
  '-sALLOW_TABLE_GROWTH'
  '-sSTACK_SIZE=32768'
  '-sAUDIO_WORKLET'
  '-sWASM_WORKERS'
  '-sMALLOC=none'
  '-sEXPORT_ES6'
  '-O3'
)

# Append any user parameters.
for param in "$@"; do
  EMCC_PARAMS+=("${param}")
done

emcc timesignal.c -o timesignal.js "${EMCC_PARAMS[@]}" &&
  sed -i 's|timesignal.aw.js|wasm/timesignal.aw.js|' timesignal.js &&
  mkdir -p ../../wasm &&
  cp timesignal.aw.js timesignal.js timesignal.wasm ../../wasm &&
  rm -f timesignal.aw.js timesignal.js timesignal.wasm timesignal.ww.js
