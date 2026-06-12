FROM osrm/osrm-backend:latest

WORKDIR /data

# Download PBF (31MB)
ADD https://github.com/jadjbara10/droob/releases/download/v1.0.0/jordan-latest.osm.pbf /data/jordan-latest.osm.pbf

# Build OSRM data from PBF using osrm-extract and osrm-contract (CH algorithm)
RUN osrm-extract -p /opt/car.lua /data/jordan-latest.osm.pbf \
    && osrm-contract /data/jordan-latest.osrm \
    && rm /data/jordan-latest.osm.pbf

EXPOSE 5000

CMD ["osrm-routed", "--algorithm", "ch", "/data/jordan-latest.osrm"]
