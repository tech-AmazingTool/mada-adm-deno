FROM denoland/deno:alpine-2.9.8

# Install SpatiaLite
RUN apk add --no-cache sqlite libspatialite \
    && ln -s /usr/lib/mod_spatialite.so.8 /usr/lib/mod_spatialite.so

WORKDIR /app

COPY . .

RUN deno install

# Just to keep the container running
CMD ["tail", "-f", "/dev/null"]