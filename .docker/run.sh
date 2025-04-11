mkdir -p .cache
mkdir -p out

docker run -it --rm \
  -v ./.cache/:/app/.cache/ \
  -v ./out/:/app/out/ \
  -v ./import.config.json:/app/import.config.json \
  pokemon-tcg-importer:latest