import re
import os
import random
import string
from qgis.core import *
from qgis.utils import *
import tornado.ioloop
import tornado.web
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Initialiser une application QGIS
APP = QgsApplication([], False)
QgsApplication.initQgis()

# Charger la couche de communes françaises au format KML
print("Chargement du fichier de carte...", file=sys.stderr)
COMMUNES = QgsVectorLayer("./FRANCE_METRO_IRIS.kml", "communes", "ogr")

def get_random_string(length):
    return ''.join(random.choice(string.ascii_letters) for i in range(length))

def copy_and_alter_layer(layer):
    copy = QgsVectorLayer("MultiPolygon?crs=EPSG:4326", "copy", "memory")
    copy_dp = copy.dataProvider()
    fields = layer.fields()
    copy_dp.addAttributes(fields)
    copy.startEditing()
    for feature in layer.selectedFeatures():
        feature["name"] = feature["NOM_IRIS"]
        copy_dp.addFeatures([feature])
    copy.commitChanges()
    return copy

def write_kml(output, layer):
    error = QgsVectorFileWriter.writeAsVectorFormat(layer, output,
                                                    "UTF-8", layer.crs(),
                                                    "KML", False)
    if error[0] != QgsVectorFileWriter.NoError:
        print("Erreur à l'écriture : " + output, file=sys.stderr)
        sys.exit(1)

# Fonction pour générer le fichier KML à partir de la saisie de l'utilisateur
def make_kml(codes_commune):
    # Code pour générer le fichier KML en utilisant la saisie de l'utilisateur
    # Retourne le chemin d'accès au fichier KML généré
    filename = get_random_string(5) + ".kml"

    # Sélectionner les lieux correspondant aux codes de commune
    print(f"Sélection des communes ({len(codes_commune)})...", file=sys.stderr)
    expression = "\"INSEE_COM\" IN ({0})" \
        .format(','.join(["'{0}'".format(code) for code in codes_commune]))
    COMMUNES.selectByExpression(expression, QgsVectorLayer.SetSelection)

    # Créer une couche temporaire pour altérer les features sélectionnées
    print(f"Création des secteurs ({COMMUNES.selectedFeatureCount()})...", file=sys.stderr)
    selection = copy_and_alter_layer(COMMUNES)

    # Exporter la sélection au format KML
    print(f"Ecriture dans {filename}...", file=sys.stderr)
    write_kml(filename, selection)

    return filename

def escape_expression_qgis(s):
    # Remplace les espaces et les caractères non alphanumériques par des %
    return re.sub(r'[^a-zA-Z]+', '_', s.replace(' ', '_'))

# Page d'accueil du site avec un formulaire pour saisir les codes INSEE ou le nom de ville
class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write('''
            <html>
                <head>
                    <meta charset="utf-8">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.2.2/ol.css">
                    <title>INSEE2KML</title>
                    <style>
                      body {
                        height: 100%;
                        margin: 0;
                        padding: 0;
                      }
                      #map {
                        width: 100%;
                        height: 100%;
                      }
                      #formulaire {
                        background-color: #ffffff;
                        position: absolute;
                        width:25Opx;
                        top:20px;
                        right: 20px;
                        padding:20px;
                      }
                    </style>
                    <script src="https://cdn.jsdelivr.net/npm/ol@7.2.2/dist/ol.js"></script>
                </head>
                <body>
                    <div id="map"></div>
                    <div id="formulaire">
                        <img alt="" src="https://portail.trela.fr/javascript/bundles/assets/img/logo_header.png" style="height:50px; width:98px"/>
                        <form method="post" action="/generate">
                            <label>
                                Entrez des codes INSEE, séparés par des virgules:
                                <input type="text" name="insee_codes">
                            </label>
                            <br><br>
                            <label>
                                Ou entrez le nom d'une ville:
                                <input type="text" name="ville_name">
                            </label>
                            <br><br>
                            <input type="submit" value="Télécharger le fichier KML">
                        </form>
                   </div>
                    <script>
                      var map = new ol.Map({
                        target: 'map',
                        layers: [
                          new ol.layer.Tile({
                            source: new ol.source.OSM()
                          })
                        ],
                        view: new ol.View({
                          center: [0, 0],
                          zoom: 2
                        })
                      });
                    </script>
                </body>
            </html>
        ''')

# Fonction pour traiter le formulaire soumis par l'utilisateur
class GenerateHandler(tornado.web.RequestHandler):
    def post(self):
        # Récupère la saisie de l'utilisateur
        insee_codes = self.get_argument('insee_codes', '')
        ville_name = self.get_argument('ville_name', '')

        # Vérifie si l'utilisateur a saisi des codes INSEE ou le nom d'une ville
        if insee_codes:
            codes = insee_codes.split(',')
            # Appelle la fonction pour générer le fichier KML à partir des codes INSEE
            kml_file = make_kml(codes)
        elif ville_name:
            # Appelle la fonction pour récupérer les codes INSEE de la ville
            codes = get_insee_codes(ville_name)
            # Appelle la fonction pour générer le fichier KML à partir des codes INSEE
            kml_file = make_kml(codes)

        # Vérifie le fichier généré
        if not os.path.isfile(kml_file):
            print(f"Erreur: fichier introuvable: {kml_file}")

        # Télécharge le fichier KML généré
        self.set_header('Content-Type', 'application/octet-stream')
        self.set_header('Content-Disposition', 'attachment; filename="generated.kml"')
        with open(kml_file, 'rb') as f:
            while True:
                data = f.read(4096)
                if not data:
                    break
                self.write(data)

        # On nettoie
        os.remove(kml_file)
        self.finish()

# Fonction pour récupérer les codes INSEE d'une ville donnée
def get_insee_codes(name):
    # Récupérer les codes INSEE de la ville à partir de son nom
    # Retourne une liste de codes INSEE

    print(f"Recherche de {name}...", file=sys.stderr)
    expression = "\"Name\" ILIKE '{}'".format(escape_expression_qgis(name))
    features = list(COMMUNES.getFeatures(QgsFeatureRequest().setFilterExpression(expression)))
    if not features:
        expression = "\"Name\" ILIKE '%{}%'".format(escape_expression_qgis(name))
        features = list(COMMUNES.getFeatures(QgsFeatureRequest().setFilterExpression(expression)))
    codes_commune = list(set(f["INSEE_COM"] for f in features))

    if len(codes_commune) == 0:
        print(f"Aucune commune trouvée pour le nom '{name}'", file=sys.stderr)

    return codes_commune

# Configuration de l'application Tornado
def make_app():
    return tornado.web.Application([
        (r'/', MainHandler),
        (r'/generate', GenerateHandler),
        (r'/(favicon.ico)', tornado.web.StaticFileHandler, {"path": ""}),
    ])

if __name__ == '__main__':
    app = make_app()
    app.listen(8888)
    print("Prêt.", file=sys.stderr)
    tornado.ioloop.IOLoop.current().start()
