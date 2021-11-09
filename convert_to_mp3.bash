#!/bin/bash

dir="$(cd "${1}" && pwd)"

echo ">> ${dir}"
echo ""

for i in "${dir}"/*.wav
do
  echo ""
  echo "> ${i}"
  echo "> ${i%.*}.mp3"
  echo ""

  ffmpeg -y -i "$i" "${i%.*}.mp3"
  rm -f $i
done

open "${dir}"
