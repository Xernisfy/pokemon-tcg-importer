mkdir -p .cache
mkdir -p out

docker run -it --rm \
  -v ./.cache/:/app/.cache/ \
  -v ./out/:/app/out/ \
  ghcr.io/xernisfy/pokemon-tcg-importer:latest

sudo chown -R $(id -u):$(id -g) ./out