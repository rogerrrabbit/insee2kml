class CartoVecto {
    #typename;
    #olLayer;
    #mapView;

    static maxFeatureCount = 1000;

    constructor(mapView, typename) {
        this.#typename = typename;
        this.#mapView = mapView;
        this.#olLayer = null;
    }

    get layer() {
        return this.#olLayer;
    }

    setExtent(extent) {
        if(this.#olLayer) {
            this.#mapView.map.removeLayer(this.#olLayer);
        }

        let olLayer = this.#buildLayer(extent);

        this.#mapView.map.addLayer(olLayer);
        this.#olLayer = olLayer;
    }

    getFeatures() {
        if (!this.#olLayer) {
            return [];
        }
        return this.#olLayer.getSource().getFeatures();
    }

    #buildLayer = (extent) => {
        let olSource = new ol.source.Vector({
            format: new ol.format.GeoJSON(),
            url: 'https://wxs.ign.fr/cartovecto/geoportail/wfs/?SERVICE=WFS&' +
                 'REQUEST=GetFeature&VERSION=2.0.0&' +
                 'TYPENAMES=' + this.#typename + '&' +
                 'STARTINDEX=0&' +
                 'COUNT=' + CartoVecto.maxFeatureCount + '&' +
                 'SRSNAME=urn:ogc:def:crs:EPSG::3857&' +
                 'BBOX=' +
                 extent.join(',') +
                 ',urn:ogc:def:crs:EPSG::3857&' +
                 'outputFormat=JSON',
        });

        let olLayer = new ol.layer.Vector({
            source: olSource,
            style: MapView.blueStyle,
        });

        return olLayer;
    };
};