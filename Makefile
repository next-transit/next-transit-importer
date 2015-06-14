unzip_gtfs_septa:
	rm -rf data/gtfs/septa/google*
	unzip data/gtfs/septa/septa_gtfs.zip -d data/gtfs/septa
	unzip data/gtfs/septa/google_bus.zip -d data/gtfs/septa/google_bus
	unzip data/gtfs/septa/google_rail.zip -d data/gtfs/septa/google_rail

download_gtfs_septa:
	curl --output data/gtfs/septa/septa_gtfs.zip http://www2.septa.org/developer/download.php?fc=septa_gtfs.zip&download=download

download_and_unzip_septa:
	download_gtfs_septa
	unzip_gtfs_septa
