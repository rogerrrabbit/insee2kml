class CartoVecto {
    static maxFeatureCount = 1000;

    #mainUrl;
    #typename;
    #mapView;
    #olStyle;
    #olLayer;

    constructor(mapView, mainUrl, typename, style) {
        this.#mainUrl = mainUrl;
        this.#typename = typename;
        this.#mapView = mapView;
        this.#olStyle = style;
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
            format: new ol.format.WFS(),
            //format: new ol.format.GeoJSON(),
            url: this.#mainUrl
                 + '?SERVICE=WFS'
                 + '&REQUEST=GetFeature'
                 + '&VERSION=1.1.0'
                 + '&TYPENAMES=' + this.#typename
                 + '&STARTINDEX=0'
                 + '&COUNT=' + CartoVecto.maxFeatureCount
                 + '&SRSNAME=urn:ogc:def:crs:EPSG::3857'
                 + '&BBOX='
                 + extent.join(',')
                 + ',urn:ogc:def:crs:EPSG::3857'
                 //+ '&outputFormat=JSON'
        });

        let olLayer = new ol.layer.Vector({
            source: olSource,
            style: this.#olStyle,
        });

        return olLayer;
    };
};