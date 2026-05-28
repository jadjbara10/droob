-- دروب Droob — PostgreSQL Initialization
-- Enables PostGIS extension for geospatial queries

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Set timezone for Jordan
ALTER SYSTEM SET timezone = 'Asia/Amman';