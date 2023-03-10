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

const cartoVectoSurfaceHydroDiv = document.getElementById('carto-vecto-surface_hydrographique');
const cartoVectoSurfaceHydroSpan = document.getElementById("carto-vecto-surface_hydrographique-span");

const cartoVectoSitesPolluesDiv = document.getElementById('carto-vecto-sites_pollues');
const cartoVectoSitesPolluesSpan = document.getElementById("carto-vecto-sites_pollues-span");

inseeCodes.addEventListener('input', checkFields);
villeName.addEventListener('input', checkFields);
communeSelectionSelect.addEventListener('input', checkSelect);

// Chargement de la carto
let map = new MapView();

let surfaceHydro = new CartoVecto(
    map,
    'https://wxs.ign.fr/cartovecto/geoportail/wfs',
    'BDCARTO_BDD_WLD_WGS84G:surface_hydrographique',
    MapView.blueStyle);

let sitesPollues = new CartoVecto(
    map,
    'https://georisques.gouv.fr/services',
    'SSP_INSTR_GE_POLYGONE',
    MapView.dangertyle);

// Sites pollués ou potentiellement pollués appelant une action des pouvoirs publics, à titre préventif ou curatif (BASOL) ms:SSP_INSTR_GE_POLYGONE
// Aléa débordement cours d'eau fréquent France Métro ms:ALEA_SYNT_01_01FOR_FXX
// Aléa ruissellement fréquent France Métro ms:ALEA_SYNT_02_01FOR_FXX
// Aléa submersion fréquent France Métro ms:ALEA_SYNT_03_01FOR_FXX
// Retrait-gonflement des argiles France Métro ms:ALEARG_REALISE
// Zones de sur-aléa inondation France Métro ms:OUV_ZONSALEA_FXX


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
        zoneHabilitationSpan.innerHTML = features.length + ' secteur(s)';
    }
}

function displayCartoVectoSurfaceHydroTile(features) {
    if (features.length) {
        cartoVectoSurfaceHydroDiv.style.display = 'inherit';
        cartoVectoSurfaceHydroSpan.innerHTML = features.length + " ";
        if (features.length == CartoVecto.maxFeatureCount) {
            cartoVectoSurfaceHydroSpan.innerHTML += 'secteurs (⚠️tronqué)';
        } else {
            cartoVectoSurfaceHydroSpan.innerHTML += 'secteur(s))';
        }
    }
}

function displayCartoVectoSitesPolluesTile(features) {
    if (features.length) {
        cartoVectoSitesPolluesDiv.style.display = 'inherit';
        cartoVectoSitesPolluesSpan.innerHTML = features.length + " ";
        if (features.length == CartoVecto.maxFeatureCount) {
            cartoVectoSitesPolluesSpan.innerHTML += 'secteurs (⚠️tronqué)';
        } else {
            cartoVectoSitesPolluesSpan.innerHTML += 'secteur(s))';
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
        sitesPollues.setExtent(map.layer.getSource().getExtent());

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

    displayCartoVectoSurfaceHydroTile(surfaceHydro.getFeatures());
    displayCartoVectoSitesPolluesTile(sitesPollues.getFeatures());

    newFeatures = false;
}

map.onLoadEnd(refreshAdditionalLayers);
map.onLoadEnd(refreshSearchResults);

// Demander les secteurs associés à une ou plusieurs communes
function generate(codes, ville) {
    // Reset zone download tiles
    zoneHabilitationDiv.style.display = 'none';
    cartoVectoSurfaceHydroDiv.style.display = 'none';
    cartoVectoSitesPolluesDiv.style.display = 'none';

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
const downloadSurfaceHydroButton = document.getElementById('download-surface_hydrographique-button');
downloadSurfaceHydroButton.addEventListener('click', function() {
    var kml = featuresToKML(surfaceHydro.layer.getSource().getFeatures());
    downloadAsKML(kml);
});

// Télécharger une zone additionnelle
const downloadSitesPolluesButton = document.getElementById('download-sites_pollues-button');
downloadSitesPolluesButton.addEventListener('click', function() {
    var kml = featuresToKML(sitesPollues.layer.getSource().getFeatures());
    downloadAsKML(kml);
});