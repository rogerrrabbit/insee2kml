var selectedLayer = null;
//var KML = null;

var positron = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
    })
});

var map = new ol.Map({
    target: 'map',
    layers: [positron],
    view: new ol.View({
        center: ol.proj.fromLonLat([2.35183, 48.85658]), // Coordonnées de Paris
        zoom: 6, // Zoom par défaut
    })
});

var downloadKMLButton = document.getElementById('download-kml');
downloadKMLButton.addEventListener('click', function() {
    if (selectedLayer != null) {
        var kmlFormat = new ol.format.KML({
            extractStyles: false,
            writeStyles: false
        });

        var features = selectedLayer.getSource().getFeatures();
        var kml = kmlFormat.writeFeatures(
            features,
            {
                dataProjection : 'EPSG:4326', 
                featureProjection : 'EPSG:3857',
                decimals: 6
            });
        var contentType = 'data:application/vnd.google-earth.kml+xml;charset=utf-8';

        var element = document.createElement('a');
        element.setAttribute('href', contentType + ',' + encodeURIComponent(kml));
        element.setAttribute('download', "output.kml");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } else {
        window.alert("no layer");
    }
});

var loadButton = document.getElementById('add-layer');
loadButton.addEventListener('click', function() {
    const inseeCodes = document.querySelector('input[name="insee_codes"]').value;
    const villeName = document.querySelector('input[name="ville_name"]').value;
    
    /* Remove previously selected layer if any */
    if (selectedLayer != null) {
        map.removeLayer(selectedLayer);
        KML = null;
    }

    /* Retrieve and save KML data for selected codes/city */
    /*var req = new XMLHttpRequest;
    req.open('get', "/generate?insee_codes=" + inseeCodes + "&ville_name=" + villeName, true);
    req.responseType = 'application/vnd.google-earth.kml+xml';
    req.send();
    req.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            KML = this.response;
        } else {
            window.alert("Not found!");
        }
    };*/

    /* Make a layer from KML data */
    /*var features = new ol.format.KML().readFeatures(KML, { dataProjection: 'EPSG:4326' });
    var KMLvectorSource = new ol.source.Vector({});

    var KMLvector = new ol.layer.Vector({
        source: KMLvectorSource,
        visible: true
        });
    
    KMLvectorSource.addFeature(features);*/

    selectedLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: "/generate?insee_codes=" + inseeCodes + "&ville_name=" + villeName,
            format: new ol.format.KML()
        }),
    });
    map.getTargetElement().classList.add('spinner');

    map.on("loadstart", function() {
        downloadKMLButton.disabled = true;
    });

    map.on("loadend", function() {
        map.getTargetElement().classList.remove('spinner');
        map.getView().fit(selectedLayer.getSource().getExtent(),
            {
                size: map.getSize(),
                padding: [50, 0, 50, 0],
                maxZoom: 16,
            }
        );
        downloadKMLButton.disabled = false;
    });

    map.addLayer(selectedLayer);
    //map.addLayer(KMLvectorSource);
});