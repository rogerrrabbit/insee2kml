class MapView {
    // Basemap
    static basemapStyle = "toner-lite";
    static basemapCenter = [4.35183, 48.85658];
    static basemapZoomLevel = 6;

    // Placemarks styles
    static unselectedStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(167, 211, 42, 0.25)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(167, 211, 42, 1)',
            width: 3,
        })
    });
    static selectedStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(167, 211, 42, 0.75)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(167, 211, 42, 1)',
            width: 3,
        })
    });
    static blueStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(35, 158, 170, 0.15)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(35, 158, 170, 1)',
            width: 3,
        })
    });
    static dangerStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(156, 25, 143, 0.15)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(156, 25, 143, 1)',
            width: 3,
        })
    });

    // FIXME: en cas de innerBoundary, génère les tags innerBoundaryIs et outerBoundaryIs dans le mauvais ordre (inner first)
    // Pas standard, et pas compatible avec One.
    static featuresToKML(features) {
        var kmlFormat = new ol.format.KML({
            extractStyles: false,
            writeStyles: false
        });

        var kml = kmlFormat.writeFeatures(
            features,
            {
                dataProjection : 'EPSG:4326',
                featureProjection : 'EPSG:3857',
                decimals: 6
            });

        return kml;
    }

    // Télécharger un fichier KML
    static downloadAsKML(data) {
        var contentType = 'data:application/vnd.google-earth.kml+xml;charset=utf-8';
        var element = document.createElement('a');

        element.setAttribute('href', contentType + ',' + encodeURIComponent(data));
        element.setAttribute('download', "output.kml");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}