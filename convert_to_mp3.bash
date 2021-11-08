#!/bin/bash

dir="$(cd $1 && pwd)"

for i in ${dir}/*.wav
do
  echo ""
  echo "> ${i}"
  echo ""

  ffmpeg -y -i "$i" "${i%.*}.mp3"
  rm -f $i
done

open "${dir}"
