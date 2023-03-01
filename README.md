# INSEE2KML

This project aims to provide a web application for generating KML files based on INSEE codes or city names. The application is composed of a backend written in Python that uses the QGIS library for reading map data (shapefiles from an URL), and a frontend using OpenLayers for pre-visualizing and downloading KML files.

## Features

* Read shapefile data containing all the IRIS subdivisions of all municipalities in metropolitan France
* Host a Web Service to filter map data based on French INSEE codes and generate a GeoJSON (or anything else) out of it
* Display a map using OpenLayers to search and preview a zone
* Generate and download KML files based on the selected zone
* User-friendly interface

## Requirements

* Python 3.x
* QGIS library + Xvfb
* Python: tornado py7zr progressbar

## Built with

* OpenLayers 7.2.2
* Stamen

## Source data

IRIS data from IGN (IRIS…GE® par territoire édition 2022):
https://geoservices.ign.fr/contoursiris

## Installation

* Clone the repository to your local machine
* Install the required packages (qgis, xvfb) and python libraries using pip (tornado, py7zr, progressbar)
* Run the application: xvfb-run python3 /opt/tornado/insee2kml/app.py
* Open your browser and go to http://localhost:8888/

## As a systemd service

/etc/systemd/system/insee2kml.service

<pre>
[Unit]
Description=KML file generation website
After=network.target

[Service]
User=some_user
WorkingDirectory=some_place/insee2kml
ExecStart=xvfb-run /usr/bin/python3 some_place/insee2kml/app.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
</pre>

## Usage

* Enter the INSEE codes or the name of a city in the corresponding input field.
* Click on the "Search" button to display the selected zone on the map.
* Click on the "Download KML" button to generate and download the KML file.

## License

This project is licensed under the MIT License.
