mkdir -p .cache
mkdir -p out

docker run -it --rm \
  -v ./.cache/:/app/.cache/ \
  -v ./out/:/app/out/ \
  pokemon-tcg-importer:latest