app.component('vector-layer', {
    template:
        `<div v-if="featuresCount" class="tile results additional-layer">
            <span>{{ title + ' : ' + featuresCount  + ' ' }}</span>
            <span v-if="featuresLimitReached">secteurs (⚠️tronqué)</span>
            <span v-else>secteur(s))</span>
            <br><br>
            <button @click="donwloadKml">Télécharger au format KML</button>
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

    mounted() {
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

        this.olLayer.once("postrender", (evt) => {
            this.olFeatures = this.getFeatures();
        });

        this.olMap.addLayer(this.olLayer);
    },

    beforeUnmount() {
        if(this.olLayer) {
            this.olMap.removeLayer(this.olLayer);
        }
    },

    computed: {
        featuresCount() {
            return this.olFeatures.length;
        },

        featuresLimitReached() {
            return (this.olFeatures.length == this.maxFeatureCount); 
        }
    },

    methods: {
        getFeatures() {
            if (!this.olLayer) {
                return [];
            }

            return this.olLayer.getSource().getFeatures();
        },

        donwloadKml(evt) {
            let kml = MapView.featuresToKML(this.getFeatures());
            MapView.downloadAsKML(kml);
        },
    }
});