var newSearch = false;
var newFeatures = false;

const zoneHabilitationDiv = document.getElementById('zone-habilitation-div');
const zoneHabilitationSpan = document.getElementById("zone-habilitation-span");
const resultsDiv = document.getElementById("results-div");
const resultsSpan = document.getElementById('results-span');
const inseeCodes = document.getElementById("insee-codes");
const villeName = document.getElementById("ville-name");
const communeSelectionSelect = document.getElementById("commune-selection-select");
const communeSelection = document.getElementById("commune-selection");

const cartoVectoDiv = document.getElementById('carto-vecto-surface_hydrographique');
const cartoVectoSpan = document.getElementById("carto-vecto-surface_hydrographique-span");

inseeCodes.addEventListener('input', checkFields);
villeName.addEventListener('input', checkFields);
communeSelectionSelect.addEventListener('input', checkSelect);

// Chargement de la carto
let map = new MapView();
let surfaceHydro = new CartoVecto(map, 'BDCARTO_BDD_WLD_WGS84G:surface_hydrographique');

// Vérification de la saisie
const searchButton = document.getElementById('search-zone');
function checkFields() {
    if (inseeCodes.value.trim() !== "" || villeName.value.trim() !== "") {
        searchButton.disabled = false;
        return true;
    }

    searchButton.disabled = true;
    return false;
}

// Changement de valeur du sélecteur de communes
function checkSelect() {
    if (communeSelectionSelect.value == 0) {
        return resetAndSubmit(inseeCodes.value, villeName.value);
    } else {
        return generate(communeSelectionSelect.value, "");
    }
}

// Affichage des résultats de recherche
function displayResultsTile(selectedFeatures) {
    resultsDiv.style.display = 'inherit';
    let uniqueCommunes = new Map();

    // Parcours des features et groupement par communes
    selectedFeatures.forEach(feature => uniqueCommunes.set(
        feature.get('insee_commune'),
        feature.get('nom_commune')
    ));

    if (uniqueCommunes.size > 1) {
        resultsSpan.innerHTML = "🎯 " + uniqueCommunes.size + " communes";
        communeSelection.style.display = 'inherit';
        communeSelectionSelect.innerHTML = '<option value="0">--Toutes les communes--</option>';

        // Parcourir les éléments de la Map
        uniqueCommunes.forEach((value, key) => {
            // Créer une option pour chaque élément
            const option = document.createElement('option');
            option.value = key;
            option.text = value + ' (' + key + ')';

            // Ajouter l'option à la liste déroulante
            communeSelectionSelect.add(option);
        });

    } else if (uniqueCommunes.size == 1) {
        resultsSpan.innerHTML = '🏛️ ' +
                                selectedFeatures[0].get("nom_commune") +
                                ' (' +
                                selectedFeatures[0].get("insee_commune") +
                                ')'

    } else {
        resultsSpan.innerHTML = "🦖 Pas de résultat !";
    }
}

function displayZoneHabilitationTile(features) {
    if (features.length) {
        zoneHabilitationDiv.style.display = 'inherit';
        zoneHabilitationSpan.innerHTML = "🌐 Zone d'habilitation : "+ features.length + ' secteur(s)';
    }
}

function displayCartoVectoTile(features) {
    if (features.length) {
        cartoVectoDiv.style.display = 'inherit';
        cartoVectoSpan.innerHTML = "➕ Surfaces hydrographiques : "+ features.length + " ";
        if (features.length == CartoVecto.maxFeatureCount) {
            cartoVectoSpan.innerHTML += 'secteurs (⚠️tronqué)';
        } else {
            cartoVectoSpan.innerHTML += 'secteur(s))';
        }
    }
}

function refreshSearchResults() {
    if (!newSearch) {
        return;
    }

    // Afficher les résultats
    let selectedFeatures = map.getFeatures();
    displayResultsTile(selectedFeatures);

    // La recherche a abouti (au moins 1 feature)
    if (selectedFeatures.length) {
        // Fitter la fenêtre sur les features résultantes
        map.fit();

        // Charger les données des layers additionnelles
        surfaceHydro.setExtent(map.layer.getSource().getExtent());

        // Afficher les tuiles de téléchargement de zones
        displayZoneHabilitationTile(selectedFeatures);

        newFeatures = true;
    }

    newSearch = false;
}

function refreshAdditionalLayers() {
    // Fin d'une nouvelle recherche uniquement
    if (!newFeatures) {
        return;
    }

    let cartoVectoFeatures = surfaceHydro.getFeatures();
    displayCartoVectoTile(cartoVectoFeatures);

    newFeatures = false;
}

map.onLoadEnd(refreshAdditionalLayers);
map.onLoadEnd(refreshSearchResults);

// Demander les secteurs associés à une ou plusieurs communes
function generate(codes, ville) {
    // Reset zone download tiles
    zoneHabilitationDiv.style.display = 'none';
    cartoVectoDiv.style.display = 'none';

    map.requestLayer(
        "/generate?insee_codes=" + codes + "&ville_name=" + ville,
        new ol.format.GeoJSON()
    );

    newSearch = true;
}

// Nouvelle recherche de commune(s)
function resetAndSubmit(codes, ville) {
    // Reset result tiles
    resultsDiv.style.display = 'none';
    communeSelection.style.display = 'none';

    // Generate new zone
    generate(codes, ville);

    // Return false to prevent the form from reloading the page
    return false;
}

// FIXME: en cas de innerBoundary, génère les tags innerBoundaryIs et outerBoundaryIs dans le mauvais ordre (inner first)
// Pas standard, et pas compatible avec One.
function featuresToKML(features) {
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

// Télécharger le fichier KML
function downloadAsKML(data) {
    var contentType = 'data:application/vnd.google-earth.kml+xml;charset=utf-8';

    var element = document.createElement('a');

    element.setAttribute('href', contentType + ',' + encodeURIComponent(data));
    element.setAttribute('download', "output.kml");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Télécharger la zone d'habilitation
const downloadZoneButton = document.getElementById('download-zone-button');
downloadZoneButton.addEventListener('click', function() {
    var kml = featuresToKML(map.layer.getSource().getFeatures());
    downloadAsKML(kml);
});

// Télécharger une zone additionnelle
const downloadVectoButton = document.getElementById('download-surface_hydrographique-button');
downloadVectoButton.addEventListener('click', function() {
    var kml = featuresToKML(surfaceHydro.layer.getSource().getFeatures());
    downloadAsKML(kml);
});