#!/bin/bash

# import env vars from the .env in this project root
while IFS= read -r line; do
  if [[ "$line" =~ ^\s*#.*$ || -z "$line" ]]; then
    continue
  fi
  key=$(echo "$line" | cut -d '=' -f 1)
  value=$(echo "$line" | cut -d '=' -f 2-)
  # skip comments
  value=$(echo "$value" | sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' -e 's/^[ \t]*//;s/[ \t]*$//')
  export "$key=$value"
done <".env"

IMAGE_NAME="chromeshack-e2e"

if [ -z "${E2E_SHACKLI+x}" ]; then
  echo
  echo "ERROR: a cookie fixture in the env variable \"E2E_SHACKLI\" is required for the E2E suite!"
  echo "Install a valid \".env\" in the project root and generate one with: pnpm testlogin"
  echo "For more information, see CONTRIBUTING.md..."
  echo
  exit 1
fi

build() {
  docker build -f ./Dockerfile.e2etest -t "$IMAGE_NAME" --build-arg SCOOKIE="$E2E_SHACKLI"
}

run() {
  mkdir -p "results/" && rm -rf "results/*"
  docker run --rm --replace -it \
    --ipc=host --security-opt seccomp=seccomp_profile.json \
    -v "./results:/code/results" \
    -p "9323:9323" \
    --name "$IMAGE_NAME" "$IMAGE_NAME" \
    "${@}"
}

help() {
  echo
  echo "Usage: $0 [-b] [-r | -s] [-h]"
  echo
  echo "  -b       rebuild the image"
  echo "  -r       run the test suite"
  echo "  -s       open a shell inside the image"
  echo "  -h       this message"
  echo
  exit 1
}

eval set -- "$(getopt -o bhrs -- "$@")"

while [[ $# -gt 0 ]]; do
  case "$1" in
  -b)
    build # not mutually exclusive
    shift
    ;;
  -r)
    run pnpm test
    shift
    break
    ;;
  -s)
    run /bin/bash
    shift
    break
    ;;
  -h)
    help
    ;;
  --)
    help
    ;;
  *)
    build
    run pnpm test
    break
    ;;
  esac
done

exit 0
