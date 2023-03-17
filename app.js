const app = Vue.createApp({
    template:
        `
        <div id="control">
            <div class="tile">
                <a href="https://www.trela.co/fr/" target="_blank">
                    <img alt="Trela" id="logo" src="./logo_header.png"/>
                </a>
                <div>
                    <br>
                    <label>Entrez des codes INSEE : </label>
                    <input @input="checkField" @keyup.enter="submit" v-model="searchCodes"/>
                    <br><br>
                    <label>Ou le nom d'une commune : </label>
                    <input @input="checkField" @keyup.enter="submit" v-model="searchName">
                    <br><br>
                    <button @click="submit" :disabled="!searchIsReady">Rechercher</button>
                </div>
            </div>

            <div v-if="hasResults" class="tile results">
                <span v-if="hasMultipleEntities">
                    🎯 {{ entitiesCount }} communes
                </span>
                <span v-else-if="hasUniqueEntity">
                    🏛️ {{ this.olLayerFeatures[0].get(this.entityValue) }}
                    ( {{ this.olLayerFeatures[0].get(this.entityKey) }} )
                </span>

                <div v-if="hasMultipleEntities">
                    <br>
                    <select @change="checkSelect">
                        <option value="0">--Toutes les communes--</option>
                        <option v-for="entity in uniqueEntities" :value="entity[0]">
                            {{ entity[1] }} ({{ entity[0] }})
                        </option>
                    </select>
                </div>
            </div>

            <div v-if="featuresCount" class="tile results main-layer">
                <span>🌐 Zone d'habilitation : </span>
                <span>{{ featuresCount + ' secteur(s)' }}</span>
                <br><br>
                <button @click="downloadKml">Télécharger au format KML</button>
            </div>

            <template v-if="hasUniqueEntity" :key="olLayerFeatures">
                <vector-layer v-for="vl in vectorLayers"
                    :title="vl.title"
                    :mainUrl="vl.mainUrl"
                    :typename="vl.typename"
                    :olMap="olMap"
                    :olExtent="olExtent">
                </vector-layer>
            </template>
        </div>

        <div v-show="hasTooltip" class="tooltip" :style="{ left: tooltip.xy[0], top:tooltip.xy[1] }">
            {{ tooltip.name }}
        </div>
        `,

    data() {
        return {
            entityKey: 'insee_commune',
            entityValue: 'nom_commune',
            olExtent: null,
            olLayer: null,
            olLayerFeatures: null,
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
            tooltip: { xy: [0, 0], hoveredFeature: null },
            vectorLayers: LAYERS,
            uniqueEntities: new Map(),
            searchCodes: '',
            searchName: '',
        };
    },

    computed: {
        searchIsReady() {
            return (this.searchCodes.trim() != '' || this.searchName.trim() != '');
        },

        featuresCount() {
            return (this.olLayerFeatures != null)? this.olLayerFeatures.length : 0;
        },

        entitiesCount() {
            return this.uniqueEntities.size;
        },

        hasResults() {
            return (this.olLayerFeatures != null);
        },

        hasTooltip() {
            return (this.tooltip.hoveredFeature != null);
        },

        hasUniqueEntity() {
            return (this.uniqueEntities.size == 1);
        },

        hasMultipleEntities() {
            return (this.uniqueEntities.size > 1);
        },
    },

    methods: {
        requestLayer(url, format) {
            /* Remove previously selected layer(s) if any */
            if (this.olLayer != null) {
                this.olMap.removeLayer(this.olLayer);
                this.olLayerFeatures = null;
            }

            // New zone
            this.olLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    url: url,
                    format: format
                }),
                style: MapView.unselectedStyle
            });

            // Let the map fit on results when they will be available
            this.olLayer.once("postrender", this.layerLoadEnd);

            // Add the zone
            this.olMap.addLayer(this.olLayer);

            // Display the loading spinner
            this.olMap.getTargetElement().classList.add('spinner');

            // Zoom-out to initial zoom level
            this.olMap.setView(new ol.View(
                {
                    center: ol.proj.fromLonLat(MapView.basemapCenter),
                    zoom: MapView.basemapZoomLevel,
                }
            ));
        },

        fit() {
            this.olExtent = this.olLayer.getSource().getExtent();
            this.olMap.getView().fit(this.olExtent,
            {
                size: this.olMap.getSize(),
                padding: [150, 600, 150, 150],
                maxZoom: 16,
                duration: 1000,
            });
        },

        downloadKml(evt) {
            let kml = MapView.featuresToKML(this.olLayerFeatures);
            MapView.downloadAsKML(kml);
        },

        mapLoadEnd(evt) {
            this.olMap.getTargetElement().classList.remove('spinner');
        },

        layerLoadEnd(evt) {
            this.olLayerFeatures = this.olLayer.getSource().getFeatures();
            
            // Parcours des features et groupement par entités
            this.olLayerFeatures.forEach(feature => this.uniqueEntities.set(
                feature.get(this.entityKey),
                feature.get(this.entityValue)
            ));

            // Fitter la fenêtre sur les features résultantes
            if (this.featuresCount > 0) {
                this.fit();
            }
        },

        // Mise en valeur du placemark + tooltip
        mouseOverPlacemark(evt) {
            if (this.tooltip.hoveredFeature !== null) {
                this.tooltip.hoveredFeature.setStyle(MapView.unselectedStyle);
                this.tooltip.hoveredFeature = null;
            }

            let feature = null;
            this.olMap.forEachFeatureAtPixel(evt.pixel, function (ft) {
                feature = ft;
                return true;
            });

            if (feature) {
                let featureName = feature.get('name');
                if (featureName) {
                    // Afficher le nom de la feature dans une div
                    this.tooltip.hoveredFeature = feature,
                    this.tooltip.name = featureName,
                    this.tooltip.xy = [
                        (evt.originalEvent.pageX + 15) + 'px',
                        (evt.originalEvent.pageY + 15) + 'px'
                    ];

                    // Appliquer un style sur la géométrie
                    feature.setStyle(MapView.selectedStyle);
                }
            }
        },

        search(codes, ville) {
            this.uniqueEntities = new Map();
            mountedApp.requestLayer(
                "/search?insee_codes=" + codes + "&ville_name=" + ville,
                new ol.format.GeoJSON()
            );
        },

        submit() {
            mountedApp.olLayerFeatures = null;
            this.search(this.searchCodes, this.searchName);
        },

        checkField(event) {
            if (event.target.value.trim() !== "") {
                this.searchIsReady = true;
            } else {
                this.searchIsReady = false;
            }
        },

        checkSelect(event) {
            if (event.target.value == 0) {
                this.submit();
            } else {
                this.search(event.target.value, "");
            }
        }
    },

    mounted() {
        this.olMap.on("pointermove", this.mouseOverPlacemark);
        this.olMap.on("loadend", this.mapLoadEnd);
    },
});