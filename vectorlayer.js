app.component('vector-layer', {
    template:
        `<div v-if="featuresCount" class="tile results additional-layer">
            <span>{{ title + ' : ' + featuresCount  + ' ' }}</span>
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

        this.olLayer = new ol.layer.Vector({
            source: olSource,
            style: this.olStyle,
        });

        this.olMap.addLayer(this.olLayer);
    },

    mounted() {
        this.olLayer.on("postrender", (evt) => {
            this.olFeatures = this.getFeatures();
        });
    },

    beforeUnmount() {
        if(this.olLayer) {
            this.olMap.removeLayer(this.olLayer);
        }
    },

    computed: {
        featuresCount() {
            return this.olFeatures.length;
        }
    },

    methods: {
        getFeatures() {
            if (!this.olLayer) {
                return [];
            }

            return this.olLayer.getSource().getFeatures();
        },

        donwloadKml() {
            let kml = MapView.featuresToKML(this.getFeatures());
            MapView.downloadAsKML(kml);
        },
    }
});