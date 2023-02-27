var selectedLayer = null;
var selectedFeatures = [];
var newSearch = false;

var loadButton = document.getElementById('add-layer');
var downloadKMLButton = document.getElementById('download-kml');
var statusSpan = document.getElementById('status');
var resultsTile = document.getElementById('results');

const jawgToken = 'C4idbYUcLlbPNEG6ZontRKymqfMcJLjLYEGrhjKQXakcRlpsSibbLjJTiz8zXJCD'
const baseMap = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://a.tile.jawg.io/jawg-light/{z}/{x}/{y}.png?access-token=' + jawgToken
    })
});

var map = new ol.Map({
    target: 'map',
    layers: [baseMap],
    view: new ol.View({
        center: ol.proj.fromLonLat([4.35183, 48.85658]),
        zoom: 6,
    })
});

// Fin du chargement de la carte
map.on("loadend", function() {
    map.getTargetElement().classList.remove('spinner');
    if (!newSearch) {
        return;
    }

    // Fin du chargement de la zone
    if(selectedLayer) {
        selectedFeatures = selectedLayer.getSource().getFeatures();
        resultsTile.style.display = 'inherit';
        if (selectedFeatures.length) {
            map.getView().fit(selectedLayer.getSource().getExtent(),
            {
                size: map.getSize(),
                padding: [150, 600, 150, 150],
                maxZoom: 16,
                duration: 1000,
            });
            statusSpan.innerHTML = "🎉 Trouvé ! "+ selectedFeatures.length + ' secteur(s)';
            downloadKMLButton.style.display = 'inherit';
        } else {
            statusSpan.innerHTML = "🙀 Pas de résultat !";
        }
    }

    newSearch = false;
});

// Soumettre des codes ou nom de ville et récupérer une zone
function getLayer() {
    const inseeCodes = document.querySelector('input[name="insee_codes"]').value;
    const villeName = document.querySelector('input[name="ville_name"]').value;

    /* Remove previously selected layer if any */
    if (selectedLayer != null) {
        map.removeLayer(selectedLayer);
    }

    selectedLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: "/generate?insee_codes=" + inseeCodes + "&ville_name=" + villeName,
            format: new ol.format.KML()
        }),
    });

    newSearch = true;
    downloadKMLButton.style.display = 'none';
    resultsTile.style.display = 'none';
    map.addLayer(selectedLayer);
    map.getTargetElement().classList.add('spinner');

    // Return false to prevent the form from reloading the page
    return false;
}

// Télécharger la zone obtenue
// FIXME: en cas de innerBoundary, génère les tags innerBoundaryIs et outerBoundaryIs dans le mauvais ordre (inner first)
// Pas standard, et pas compatible avec One.
downloadKMLButton.addEventListener('click', function() {
    if (selectedLayer != null) {
        var kmlFormat = new ol.format.KML({
            extractStyles: false,
            writeStyles: false
        });

        var features = selectedLayer.getSource().getFeatures();
        var kml = kmlFormat.writeFeatures(
            features,
            {
                dataProjection : 'EPSG:4326',
                featureProjection : 'EPSG:3857',
                decimals: 6
            });
        var contentType = 'data:application/vnd.google-earth.kml+xml;charset=utf-8';

        var element = document.createElement('a');
        element.setAttribute('href', contentType + ',' + encodeURIComponent(kml));
        element.setAttribute('download', "output.kml");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } else {
        window.alert("error: no layer");
    }
});