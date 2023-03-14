const zoneHabilitationDiv = document.getElementById('zone-habilitation-div');
const zoneHabilitationSpan = document.getElementById("zone-habilitation-span");
const resultsDiv = document.getElementById("results-div");
const resultsSpan = document.getElementById('results-span');
const inseeCodes = document.getElementById("insee-codes");
const villeName = document.getElementById("ville-name");
const communeSelectionSelect = document.getElementById("commune-selection-select");
const communeSelection = document.getElementById("commune-selection");

//const cartoVectoSurfaceHydroDiv = document.getElementById('carto-vecto-surface_hydrographique');
//const cartoVectoSurfaceHydroSpan = document.getElementById("carto-vecto-surface_hydrographique-span");

//const cartoVectoSitesPolluesDiv = document.getElementById('carto-vecto-sites_pollues');
//const cartoVectoSitesPolluesSpan = document.getElementById("carto-vecto-sites_pollues-span");

inseeCodes.addEventListener('input', checkFields);
villeName.addEventListener('input', checkFields);
communeSelectionSelect.addEventListener('input', checkSelect);

/*let surfaceHydro = new CartoVecto(
    mountedApp.olMap,
    'https://wxs.ign.fr/cartovecto/geoportail/wfs',
    'BDCARTO_BDD_WLD_WGS84G:surface_hydrographique',
    MapView.blueStyle);*/

/*let sitesPollues = new CartoVecto(
    mountedApp.olMap,
    'https://georisques.gouv.fr/services',
    'SSP_INSTR_GE_POLYGONE',
    MapView.dangerStyle);*/

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

function refreshSearchResults() {
    if (!mountedApp.newSearch) {
        return;
    }

    // Afficher les résultats
    let selectedFeatures = mountedApp.getFeatures();
    displayResultsTile(selectedFeatures);

    // La recherche a abouti (au moins 1 feature)
    if (selectedFeatures.length) {
        // Fitter la fenêtre sur les features résultantes
        mountedApp.fit();

        // Afficher les tuiles de téléchargement de zones
        displayZoneHabilitationTile(selectedFeatures);

        mountedApp.newFeatures = true;
        mountedApp.appKey += 1;
    }

    mountedApp.newSearch = false;
}

function refreshAdditionalLayers() {
    // Fin d'une nouvelle recherche uniquement
    if (!mountedApp.newFeatures) {
        return;
    }

    //displayCartoVectoSurfaceHydroTile(surfaceHydro.getFeatures());
    //displayCartoVectoSitesPolluesTile(sitesPollues.getFeatures());

    mountedApp.newFeatures = false;
}

mountedApp.onLoadEnd(refreshAdditionalLayers);
mountedApp.onLoadEnd(refreshSearchResults);

// Demander les secteurs associés à une ou plusieurs communes
function generate(codes, ville) {
    // Reset zone download tiles
    zoneHabilitationDiv.style.display = 'none';
    //cartoVectoSurfaceHydroDiv.style.display = 'none';
    //cartoVectoSitesPolluesDiv.style.display = 'none';

    mountedApp.requestLayer(
        "/generate?insee_codes=" + codes + "&ville_name=" + ville,
        new ol.format.GeoJSON()
    );

    mountedApp.newSearch = true;
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

// Télécharger la zone d'habilitation
const downloadZoneButton = document.getElementById('download-zone-button');
downloadZoneButton.addEventListener('click', function() {
    let kml = MapView.featuresToKML(mountedApp.getFeatures());
    MapView.downloadAsKML(kml);
});