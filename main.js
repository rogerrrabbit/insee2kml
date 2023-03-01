var selectedLayer = null;
var selectedFeatures = [];
var newSearch = false;

const searchButton = document.getElementById('search-zone');
const downloadKMLButton = document.getElementById('download-kml');
const statusSpan = document.getElementById('status');
const resultsTile = document.getElementById('results');
const tooltip = document.getElementById('placemark-tooltip');
const inseeCodes = document.getElementById("insee-codes");
const villeName = document.getElementById("ville-name");

const map = new ol.Map({
    target: 'map',
    layers: [new ol.layer.Tile({
        source: new ol.source.Stamen({
            layer: "toner-lite"
        })
    })],
    view: new ol.View({
        center: ol.proj.fromLonLat([4.35183, 48.85658]),
        zoom: 6,
    })
});

inseeCodes.addEventListener('input', checkFields);
villeName.addEventListener('input', checkFields);

// Activer/désactiver le bouton de recherche
function checkFields() {
    if (inseeCodes.value.trim() !== "" || villeName.value.trim() !== "") {
        searchButton.disabled = false;
    } else {
        searchButton.disabled = true;
    }
}

const unselectedStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(35, 158, 170, 0.25)',
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(35, 158, 170, 1)',
        width: 3,
    })
})

const selectedStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(35, 158, 170, 0.75)',
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(35, 158, 170, 1)',
        width: 3,
    })
});

// Tooltip au survol sur les placemarks
let hoveredFeature = null;
map.on('pointermove', function (evt) {
    if (hoveredFeature !== null) {
        hoveredFeature.setStyle(unselectedStyle);
        hoveredFeature = null;
      }

    map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        hoveredFeature = feature;
        return true;
    });

    if (hoveredFeature) {
        var featureName = hoveredFeature.get('name');
        if (featureName) {
            // Afficher le nom de la feature dans une div
            tooltip.innerHTML = featureName;
            tooltip.style.display = 'block';
            tooltip.style.left = (evt.originalEvent.pageX + 15) + 'px';
            tooltip.style.top = (evt.originalEvent.pageY + 15) + 'px';

            // Appliquer un style sur la géométrie
            hoveredFeature.setStyle(selectedStyle);
        }
    } else {
        // Cacher la div s'il n'y a pas de feature sous le curseur
        tooltip.style.display = 'none';
    }
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
            // Fitter la fenêtre sur les features résultantes
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
            statusSpan.innerHTML = "🦖 Pas de résultat !";
        }
    }

    newSearch = false;
});

// Soumettre des codes ou nom de ville et récupérer une zone
function getLayer() {
    /* Remove previously selected layer if any */
    if (selectedLayer != null) {
        map.removeLayer(selectedLayer);
    }

    // Nouvelle zone
    selectedLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: "/generate?insee_codes=" + inseeCodes.value + "&ville_name=" + villeName.value,
            format: new ol.format.GeoJSON()
        }),
        style: unselectedStyle
    });

    newSearch = true;
    downloadKMLButton.style.display = 'none';
    resultsTile.style.display = 'none';

    // Dessiner la zone
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