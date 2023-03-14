app.component('vector-layer', {
    template:
        `<div v-show="featuresCount" class="tile results additional-layers">
            <span>{{ title + ' : ' + featuresCount }}</span>
            <span v-if="featureCount == maxFeatureCount">secteurs (⚠️tronqué)</span>
            <span v-else>secteur(s))</span>
            <br><br>
            <div>
                <button type="button" @click="downloadKml">Télécharger au format KML</button>
            </div>
        </div>`,

    props: {
        title: String,
        mainUrl: String,
        typename: String,
        olMap: Object,
        olStyle: Object,
        olExtent: Object,
    },
    
    data() {
        return {
            maxFeatureCount: 1000,
            olLayer: null,
            olFeatures: [],
        }
    },

    created() {
        let olSource = new ol.source.Vector({
            format: new ol.format.WFS(),
            url: this.mainUrl
                 + '?SERVICE=WFS'
                 + '&REQUEST=GetFeature'
                 + '&VERSION=1.1.0'
                 + '&TYPENAMES=' + this.typename
                 + '&STARTINDEX=0'
                 + '&COUNT=' + this.maxFeatureCount
                 + '&SRSNAME=urn:ogc:def:crs:EPSG::3857'
                 + '&BBOX='
                 + this.olExtent.join(',')
                 + ',urn:ogc:def:crs:EPSG::3857'
        });

        let olLayer = new ol.layer.Vector({
            source: olSource,
            style: this.olStyle,
        });

        this.olLayer = olLayer;
    },

    beforeUnmount() {
        if(this.olLayer) {
            this.olMap.removeLayer(this.olLayer);
        }
    },

    mounted() {
        if(this.olLayer) {
            this.olMap.addLayer(this.olLayer);
        }
    },

    computed: {
        featuresCount() {
            return this.getFeatures().length;
        }
    },

    methods: {
        buildLayer() {
            let olSource = new ol.source.Vector({
                format: new ol.format.WFS(),
                url: this.mainUrl
                     + '?SERVICE=WFS'
                     + '&REQUEST=GetFeature'
                     + '&VERSION=1.1.0'
                     + '&TYPENAMES=' + this.typename
                     + '&STARTINDEX=0'
                     + '&COUNT=' + this.maxFeatureCount
                     + '&SRSNAME=urn:ogc:def:crs:EPSG::3857'
                     + '&BBOX='
                     + this.olExtent.join(',')
                     + ',urn:ogc:def:crs:EPSG::3857'
            });
    
            let olLayer = new ol.layer.Vector({
                source: olSource,
                style: this.olStyle,
            });

            return olLayer;
        },

        getFeatures() {
            if (!this.olLayer) {
                return [];
            }

            this.olFeatures = this.olLayer.getSource().getFeatures();
            return this.olFeatures;
        },

        donwloadKml() {
            let kml = MapView.featuresToKML(this.getFeatures());
            MapView.downloadAsKML(kml);
        },
    }
});

/*class CartoVecto {
    static maxFeatureCount = 1000;

    #mainUrl;
    #typename;
    #olMap;
    #olStyle;
    #olLayer;

    constructor(olMap, mainUrl, typename, style) {
        this.#mainUrl = mainUrl;
        this.#typename = typename;
        this.#olMap = olMap;
        this.#olStyle = style;
        this.#olLayer = null;
    }

    get layer() {
        return this.#olLayer;
    }

    setExtent(extent) {
        if(this.#olLayer) {
            this.#olMap.removeLayer(this.#olLayer);
        }

        let olLayer = this.#buildLayer(extent);

        this.#olMap.addLayer(olLayer);
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
};*/