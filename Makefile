CURRDATE = $(shell date +%Y-%m-%d)

# SEPTA
download_gtfs_septa:
	curl --output data/gtfs/septa/septa_gtfs.zip http://www2.septa.org/developer/download.php?fc=septa_gtfs.zip&download=download

unzip_gtfs_septa:
	rm -rf data/gtfs/septa/google*
	unzip data/gtfs/septa/septa_gtfs.zip -d data/gtfs/septa
	unzip data/gtfs/septa/google_bus.zip -d data/gtfs/septa/google_bus
	unzip data/gtfs/septa/google_rail.zip -d data/gtfs/septa/google_rail

download_and_unzip_septa:
	download_gtfs_septa
	unzip_gtfs_septa

import_septa:
	node index.js agency:septa #type:calendar

# TRIMET
download_gtfs_trimet:
	curl --output data/gtfs/trimet/trimet_gtfs.zip http://developer.trimet.org/schedule/gtfs.zip

unzip_gtfs_trimet:
	rm -rf data/gtfs/trimet/expanded/*
	printf "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n" > data/gtfs/trimet/expanded/calendar.txt
	unzip data/gtfs/trimet/trimet_gtfs.zip -d data/gtfs/trimet/expanded

# Import actions
import_trimet:
	node index.js agency:trimet #type:calendar

download_and_unzip_trimet:
	download_gtfs_trimet
	unzip_gtfs_trimet

trimet:
	download_gtfs_trimet
	unzip_gtfs_trimet
	import_trimet

# DEPLOY ACTIONS
backup_database:
	pg_dump -Fc --no-acl --no-owner -h localhost -U reedlauber nexttransit_dev > "backups/nexttransit_$(CURRDATE).dump"

# Deploy database
publish:
	printf $(CURRDATE)
