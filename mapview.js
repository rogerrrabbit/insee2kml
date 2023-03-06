class MapView {

    // Basemap
    static #basemapStyle = "toner-lite";
    static #basemapCenter = [4.35183, 48.85658];
    static #basemapZoomLevel = 6;

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

    get map () {
        return this.#olMap;
    }

    get layer() {
        return this.#olLayer;
    }

    requestLayer(url, format) {
        /* Remove previously selected layer(s) if any */
        if (this.#olLayer != null) {
            this.#olMap.removeLayer(this.#olLayer);
        }

        // New zone
        this.#olLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                url: url,
                format: format
            }),
            style: MapView.unselectedStyle
        });

        // Add the zone
        this.#olMap.addLayer(this.#olLayer);

        // Display the loading spinner
        this.#olMap.getTargetElement().classList.add('spinner');
    }

    fit() {
        this.#olMap.getView().fit(this.#olLayer.getSource().getExtent(),
        {
            size: this.#olMap.getSize(),
            padding: [150, 600, 150, 150],
            maxZoom: 16,
            duration: 1000,
        });
    }

    getFeatures() {
        if (!this.#olLayer) {
            return [];
        }
        return this.#olLayer.getSource().getFeatures();
    }

    onLoadEnd(endFunction) {
        this.#olMap.on("loadend", endFunction);
    }
    onPointerMove(moveFunction) {
        this.#olMap.on("pointermove", moveFunction);
    }

    #olMap;
    #olLayer;
    #olLayerFeatures;
    #hoveredFeature = null;
    #tooltipDiv = document.getElementById('tooltip');

    // Mise en valeur du placemark + tooltip
    #mouseOverPlacemark = (evt) => {
        if (this.#hoveredFeature !== null) {
            this.#hoveredFeature.setStyle(MapView.unselectedStyle);
            this.#hoveredFeature = null;
        }

        let feature = null;
        this.#olMap.forEachFeatureAtPixel(evt.pixel, function (ft) {
            feature = ft;
            return true;
        });

        if (feature && this.#olLayerFeatures.includes(feature)) {
            let featureName = feature.get('name');

            // Filtrer les features d'autres couches
            if (featureName) {
                // Afficher le nom de la feature dans une div
                this.#tooltipDiv.innerHTML = featureName;
                this.#tooltipDiv.style.display = 'block';
                this.#tooltipDiv.style.left = (evt.originalEvent.pageX + 15) + 'px';
                this.#tooltipDiv.style.top = (evt.originalEvent.pageY + 15) + 'px';

                // Appliquer un style sur la géométrie
                feature.setStyle(MapView.selectedStyle);
            }
            this.#hoveredFeature = feature;
        } else {
            // Cacher la div s'il n'y a pas de feature sous le curseur
            this.#tooltipDiv.style.display = 'none';
        }
    };

    // Fin de chargement de la layer
    #mapLoadEnd = (evt) => {
        this.#olMap.getTargetElement().classList.remove('spinner');
        if (this.#olLayer) {
            this.#olLayerFeatures = this.#olLayer.getSource().getFeatures();
        }
    }

    constructor() {
        let olMap = new ol.Map({
            target: 'map',
            layers: [new ol.layer.Tile({
                source: new ol.source.Stamen({
                    layer: MapView.#basemapStyle
                })
            })],
            view: new ol.View({
                center: ol.proj.fromLonLat(MapView.#basemapCenter),
                zoom: MapView.#basemapZoomLevel,
            })
        });

        this.#olMap = olMap;
        this.#olLayer = null;
        this.#olLayerFeatures = [];

        this.onPointerMove(this.#mouseOverPlacemark);
        this.onLoadEnd(this.#mapLoadEnd);
    }
}