const app = Vue.createApp({
    template:
        `
        <div class="tile">
            <a href="https://www.trela.co/fr/" target="_blank">
                <img alt="Trela" id="logo" src="./logo_header.png"/>
            </a>
            <form onsubmit="return resetAndSubmit(inseeCodes.value, villeName.value);">
                <br>
                <label>Entrez des codes INSEE :</label>
                <input type="text" name="insee_codes" id="insee-codes">
                <br><br>
                <label>Ou le nom d'une commune :</label>
                <input type="text" name="ville_name" id="ville-name">
                <br><br>
                <button type='submit' id="search-zone" disabled>Rechercher</button>
            </form>
        </div>

        <div class="tile results" id="results-div" style="display:none;">
            <span id="results-span"></span>
            <div id="commune-selection">
                <br>
                <select title="Communes" id="commune-selection-select"></select>
            </div>
        </div>

        <div class="tile results main-layer" id="zone-habilitation-div" style="display:none;">
            <span>🌐 Zone d'habilitation :</span>
            <span id="zone-habilitation-span"></span>
            <br><br>
            <div>
                <button type='button' id="download-zone-button">Télécharger au format KML</button>
            </div>
        </div>

        <vector-layer v-if="featuresCount"
            title="Surfaces hydrographiques"
            mainUrl="https://wxs.ign.fr/cartovecto/geoportail/wfs"
            typename="BDCARTO_BDD_WLD_WGS84G:surface_hydrographique"
            :olMap="olMap"
            :olExtent="olExtent"
            :key="olExtent">
        </vector-layer>

        <vector-layer v-if="featuresCount"
            title="Sites pollués"
            mainUrl="https://georisques.gouv.fr/services"
            typename="SSP_INSTR_GE_POLYGONE"
            :olMap="olMap"
            :olExtent="olExtent"
            :key="olExtent">
        </vector-layer>       
        `,

    data() {
        return {
            newSearch: false,
            hoveredFeature: null,
            olExtent: null,
            olLayer: null,
            olLayerFeatures: [],
            olMap: new ol.Map({
                target: 'map',
                layers: [new ol.layer.Tile({
                    source: new ol.source.Stamen({
                        layer: MapView.basemapStyle
                    })
                })],
                view: new ol.View({
                    center: ol.proj.fromLonLat(MapView.basemapCenter),
                    zoom: MapView.basemapZoomLevel,
                })
            }),
            tooltipDiv: document.getElementById('tooltip'),
        };
    },

    computed: {
        featuresCount() {
            return this.olLayerFeatures.length;
        }
    },

    methods: {
        requestLayer(url, format) {
            /* Remove previously selected layer(s) if any */
            if (this.olLayer != null) {
                this.olMap.removeLayer(this.olLayer);
                this.olLayerFeatures = [];
            }
    
            // New zone
            this.olLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    url: url,
                    format: format
                }),
                style: MapView.unselectedStyle
            });

            // Add the zone
            this.olMap.addLayer(this.olLayer);
    
            // Display the loading spinner
            this.olMap.getTargetElement().classList.add('spinner');
        },

        fit() {
            this.olExtent = this.olLayer.getSource().getExtent();
            this.olLayerFeatures = this.getFeatures();
            this.olMap.getView().fit(this.olExtent,
            {
                size: this.olMap.getSize(),
                padding: [150, 600, 150, 150],
                maxZoom: 16,
                duration: 1000,
            });
        },

        getFeatures() {
            return this.olLayer.getSource().getFeatures();
        },

        onLoadEnd(func) {
            return this.olMap.onLoadEnd(func);
        },

        onLoadEnd(endFunction) {
            return this.olMap.on("loadend", endFunction);
        },

        onPointerMove(moveFunction) {
            return this.olMap.on("pointermove", moveFunction);
        },

        // Fin de chargement de la layer
        mapLoadEnd(evt) {
            this.olMap.getTargetElement().classList.remove('spinner');
        },

        // Mise en valeur du placemark + tooltip
        mouseOverPlacemark(evt) {
            if (this.hoveredFeature !== null) {
                this.hoveredFeature.setStyle(MapView.unselectedStyle);
                this.hoveredFeature = null;
            }

            let feature = null;
            this.olMap.forEachFeatureAtPixel(evt.pixel, function (ft) {
                feature = ft;
                return true;
            });

            if (feature && this.olLayerFeatures.includes(feature)) {
                let featureName = feature.get('name');

                // Filtrer les features d'autres couches
                if (featureName) {
                    // Afficher le nom de la feature dans une div
                    this.tooltipDiv.innerHTML = featureName;
                    this.tooltipDiv.style.display = 'block';
                    this.tooltipDiv.style.left = (evt.originalEvent.pageX + 15) + 'px';
                    this.tooltipDiv.style.top = (evt.originalEvent.pageY + 15) + 'px';

                    // Appliquer un style sur la géométrie
                    feature.setStyle(MapView.selectedStyle);
                }
                this.hoveredFeature = feature;
            } else {
                // Cacher la div s'il n'y a pas de feature sous le curseur
                this.tooltipDiv.style.display = 'none';
            }
        }
    },

    mounted() {
        this.onPointerMove(this.mouseOverPlacemark);
        this.onLoadEnd(this.mapLoadEnd);
    },
});